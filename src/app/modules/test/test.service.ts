import mongoose, { Types } from "mongoose";
import { BadRequestError, NotFoundError } from "../../errors/request/apiError";
import Question from "../question/question.model";
import { ITest } from "./test.interface";
import Test from "./test.model";
import { TCreateTestPayload } from "./test.zod";



interface CreateTestPayload {
  title: string;
  examType: "semi_matura" | "matura" | "provime";
  year: number;
  structureType: string;
  departmentId?: string;
  testType: "official" | "additional";
  access: "free" | "premium";
  durationMinutes?: number;
}

interface GetTestsFilter {
  examType?: string;
  year?: number;
  testType?: string;
  access?: string;
  status?: string;
  departmentId?: string;
}

// ─── Create ───────────────────────────────────────────────────
const createTest = async (payload: TCreateTestPayload): Promise<ITest> => {

  const totalQuestions = payload.questionIds ? payload.questionIds.length : 0;
  const test = await Test.create({
    ...payload,
    totalQuestions: totalQuestions,
  });
  return test;
};

// ─── Get All ──────────────────────────────────────────────────
const getAllTests = async (filter: GetTestsFilter): Promise<ITest[]> => {
  const query: Record<string, unknown> = { isActive: true };
  if (filter.examType) query.examType = filter.examType;
  if (filter.year) query.year = Number(filter.year);
  if (filter.testType) query.testType = filter.testType;
  if (filter.access) query.access = filter.access;
  if (filter.status) query.status = filter.status;
  if (filter.departmentId) query.departmentId = filter.departmentId;

  return Test.find(query)
    .populate("departmentId", "name slug")
    .select("-questionIds")
    .sort({ year: -1 });
};

// ─── Get By Id ────────────────────────────────────────────────
const getTestById = async (id: string): Promise<ITest> => {
  const test = await Test.findById(id)
    .populate("departmentId", "name slug")
    .select("-questionIds");

  if (!test || !test.isActive) {
    throw new NotFoundError("Test not found");
  }
  return test;
};

// ─── Get Test With Questions ──────────────────────────────────
const getTestWithQuestions = async (id: string) => {
  const test = await Test.findById(id);
  if (!test || !test.isActive) {
    throw new NotFoundError("Test not found");
  }

  // questionIds order অনুযায়ী questions fetch
  const questionsMap = await Question.find({
    _id: { $in: test.questionIds },
    isActive: true,
    status: "published",
  })
    .populate("subjectId", "name slug")
    .populate("passageId", "passageCode title content");

  // original array order maintain করো
  const orderedQuestions = test.questionIds
    .map((id) =>
      questionsMap.find((q) => q._id.toString() === id.toString())
    )
    .filter(Boolean);

  return {
    test: {
      _id: test._id,
      title: test.title,
      examType: test.examType,
      year: test.year,
      testType: test.testType,
      access: test.access,
      durationMinutes: test.durationMinutes,
      totalQuestions: test.totalQuestions,
    },
    questions: orderedQuestions,
  };
};

// ─── Get Linkable Questions (admin filter) ────────────────────
const getLinkableQuestions = async (
  testId: string,
  filter: {
    examType?: string;
    year?: number;
    subjectId?: string;
    testType?: string;
    access?: string;
    passageId?: string;
    facultyId?: string;
    departmentId?: string;
    status?: string;
  }
) => {
  const test = await Test.findById(testId);
  if (!test || !test.isActive) throw new NotFoundError("Test not found");

  const query: Record<string, unknown> = { isActive: true };

  // test এর examType + year default filter
  query.examType = filter.examType ?? test.examType;
  query.year = filter.year ? Number(filter.year) : test.year;

  if (filter.subjectId) query.subjectId = filter.subjectId;
  if (filter.testType) query.testType = filter.testType;
  if (filter.access) query.access = filter.access;
  if (filter.passageId) query.passageId = filter.passageId;
  if (filter.facultyId) query.facultyId = filter.facultyId;
  if (filter.departmentId) query.departmentId = filter.departmentId;
  if (filter.status) query.status = filter.status;

  const linkedIds = test.questionIds.map((id) => id.toString());

  const questions = await Question.find(query)
    .populate("subjectId", "name slug")
    .populate("passageId", "passageCode title")
    .sort({ createdAt: 1 });

  // প্রতিটা question এ isLinked flag যোগ করো
  return questions.map((q) => ({
    ...q.toObject(),
    isLinked: linkedIds.includes(q._id.toString()),
  }));
};

// ─── Link Questions ───────────────────────────────────────────
const linkQuestions = async (testId: string, questionIds: string[]) => {
  const test = await Test.findById(testId);
  if (!test || !test.isActive) throw new NotFoundError("Test not found");

  if (test.status === "published") {
    throw new BadRequestError("Cannot modify a published test");
  }

  // duplicate check
  const existingIds = test.questionIds.map((id) => id.toString());
  const duplicates = questionIds.filter((id) => existingIds.includes(id));
  if (duplicates.length > 0) {
    throw new BadRequestError(
      `${duplicates.length} question(s) already linked to this test`
    );
  }

  // valid + published questions check
  const validQuestions = await Question.find({
    _id: { $in: questionIds },
    isActive: true,
    status: "published",
  }).select("_id");

  if (validQuestions.length !== questionIds.length) {
    throw new BadRequestError("Some questions not found or not published");
  }

  const newIds = validQuestions.map((q) => q._id as Types.ObjectId);

  await Test.findByIdAndUpdate(testId, {
    $push: { questionIds: { $each: newIds } },
    $inc: { totalQuestions: newIds.length },
  });

  return Test.findById(testId).select("-questionIds");
};

// ─── Remove Question ──────────────────────────────────────────
const removeQuestion = async (testId: string, questionId: string) => {
  const test = await Test.findById(testId);
  if (!test || !test.isActive) throw new NotFoundError("Test not found");

  if (test.status === "published") {
    throw new BadRequestError("Cannot modify a published test");
  }

  const exists = test.questionIds.some(
    (id) => id.toString() === questionId
  );
  if (!exists) {
    throw new BadRequestError("Question not linked to this test");
  }

  await Test.findByIdAndUpdate(testId, {
    $pull: { questionIds: new mongoose.Types.ObjectId(questionId) },
    $inc: { totalQuestions: -1 },
  });

  return Test.findById(testId).select("-questionIds");
};

// ─── Reorder Questions ────────────────────────────────────────
const reorderQuestions = async (testId: string, orderedIds: string[]) => {
  const test = await Test.findById(testId);
  if (!test || !test.isActive) throw new NotFoundError("Test not found");

  if (test.status === "published") {
    throw new BadRequestError("Cannot modify a published test");
  }

  // same set of questions কিনা validate
  const existingSet = new Set(test.questionIds.map((id) => id.toString()));
  const incomingSet = new Set(orderedIds);

  if (
    existingSet.size !== incomingSet.size ||
    ![...existingSet].every((id) => incomingSet.has(id))
  ) {
    throw new BadRequestError(
      "orderedIds must contain exactly the same questions as currently linked"
    );
  }

  const reordered = orderedIds.map(
    (id) => new mongoose.Types.ObjectId(id)
  );

  await Test.findByIdAndUpdate(testId, { questionIds: reordered });

  return Test.findById(testId).select("-questionIds");
};

// ─── Publish ──────────────────────────────────────────────────
const publishTest = async (id: string): Promise<ITest> => {
  const test = await Test.findById(id);
  if (!test || !test.isActive) throw new NotFoundError("Test not found");

  if (test.questionIds.length === 0) {
    throw new BadRequestError("Cannot publish a test with no questions");
  }

  test.status = "published";
  await test.save();
  return test;
};

// ─── Update ───────────────────────────────────────────────────
const updateTest = async (
  id: string,
  payload: Partial<CreateTestPayload>
): Promise<ITest> => {
  const test = await Test.findById(id);
  if (!test || !test.isActive) throw new NotFoundError("Test not found");

  if (test.status === "published") {
    throw new BadRequestError("Cannot edit a published test");
  }

  Object.assign(test, payload);
  await test.save();
  return test;
};

// ─── Delete ───────────────────────────────────────────────────
const deleteTest = async (id: string): Promise<void> => {
  const test = await Test.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );
  if (!test) throw new NotFoundError("Test not found");
};

export const testService = {
  createTest,
  getAllTests,
  getTestById,
  getTestWithQuestions,
  getLinkableQuestions,
  linkQuestions,
  removeQuestion,
  reorderQuestions,
  publishTest,
  updateTest,
  deleteTest,
};