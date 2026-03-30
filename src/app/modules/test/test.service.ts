import mongoose, { Types } from "mongoose";
import { TEST_TYPES } from "../../../interfaces";
import { BadRequestError, NotFoundError } from "../../errors/request/apiError";
import Question from "../question/question.model";
import { ITest } from "./test.interface";
import Test from "./test.model";
import { TCreateTestPayload } from "./test.zod";
import Department from "../department/department.model";



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


const getPaginatedTestsByType = async (
  testType: string,
  input: {
    examType?: string;
    departmentId?: string;
    page?: number;
    limit?: number
  }
) => {
  const page = Number(input.page) || 1;
  const limit = Number(input.limit) || 20;
  const skip = (page - 1) * limit;

  // 1. Dynamic Filter Query Banano
  const query: any = {
    testType: testType,
    isActive: true
  };

  // Jodi examType thake (Mature/Semimature/Provime)
  if (input.examType) {
    query.examType = input.examType;
  }

  // Provime-er jonno jodi specific department thake
  if (input.departmentId) {
    query.departmentId = input.departmentId;
  }

  // 2. Parallel Database Operations
  const [tests, total] = await Promise.all([
    Test.find(query)
      .select("access title totalQuestions totalSubjects year")
      .sort({ year: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Test.countDocuments(query)
  ]);

  const formattedTests = tests.map(test => ({
    testId: test._id,
    title: test.title,
    totalQuestions: test.totalQuestions,
    totalSubjects: test.totalSubjects,
    access: test.access,
    year: test.year
  }));

  return {
    data: formattedTests,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};


// ─── Create ───────────────────────────────────────────────────
const createTest = async (payload: TCreateTestPayload): Promise<ITest> => {
  const totalQuestions = payload.questionIds ? payload.questionIds.length : 0;
  const test = await Test.create({
    ...payload,
    totalQuestions: totalQuestions,
  });
  return test;
};



// Main functions
const getAllOfficialTests = async (input: {
  category?: string;
  departmentId?: string; page?: number; limit?: number
}) => {
  return getPaginatedTestsByType(TEST_TYPES.OFFICIAL, input);
};

// get all additioinal tests
const getAllAdditionalTests = async (input: {
  category?: string;
  departmentId?: string; page?: number; limit?: number
}) => {
  return getPaginatedTestsByType(TEST_TYPES.ADDITIONAL, input);
};

const getQuestionByTestId = async (
  testId: string,
  input: { department?: string; page?: number; limit?: number }
) => {
  const page = Number(input.page) || 1;
  const limit = Number(input.limit) || 20;
  const skip = (page - 1) * limit;

  // 1. Test find kora (Question IDs list-er jonno)
  const test = await Test.findById(testId).select("questionIds title").lean();
  if (!test) {
    throw new NotFoundError("Test not found");
  }

  // 2. Base Query setup
  const query: any = {
    _id: { $in: test.questionIds },
    isActive: true
  };

  // 3. Department Name/Slug theke ID ber kora
  if (input.department) {
    const departmentDoc = await Department.findOne({
      $or: [
        { name: input.department },
        { slug: input.department }
      ]
    }).select("_id").lean();

    if (!departmentDoc) {
      // Jodi department na paoya jay, tahole empty array return korbe
      return {
        testTitle: test.title,
        data: [],
        meta: { total: 0, page, limit, totalPages: 0 }
      };
    }

    // Found ID query-te set kora
    query.departmentId = departmentDoc._id;
  }

  // 4. Parallel Operations
  const [questions, total] = await Promise.all([
    Question.find(query)
      .select("questionText options year departmentId questionImageUrl correctOptionIndex explanation")
      .skip(skip)
      .limit(limit)
      .lean(),
    Question.countDocuments(query)
  ]);

  return {
    testTitle: test.title,
    data: questions.map(q => ({
      questionId: q._id,
      questionText: q.questionText,
      options: q.options,
      questionImage: q.questionImageUrl || null,
      year: q.year,
      correctOptionIndex: q.correctOptionIndex,
      explanation: q.explanation
    })),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
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
  getAllOfficialTests,
  getAllAdditionalTests,
  getTestById,
  getTestWithQuestions,
  getLinkableQuestions,
  linkQuestions,
  removeQuestion,
  reorderQuestions,
  publishTest,
  updateTest,
  deleteTest,
  getQuestionByTestId
};