import mongoose, { Types } from "mongoose";
import withTransaction from "../../../helpers/withTransaction";
import { EXAM_TYPES, TEST_TYPES } from "../../../interfaces";
import { BadRequestError, NotFoundError } from "../../errors/request/apiError";
import Department from "../department/department.model";
import Question from "../question/question.model";
import { ITest } from "./test.interface";
import Test from "./test.model";
import { buildQuestionContext, NormalizedImportRow, normalizeImportRow, readCsvRows } from "./test.utils";
import { importTestCsvRowSchema, TCreateTestPayload } from "./test.zod";



interface CreateTestPayload {
  title: string;
  examType: "semi_matura" | "matura" | "provime";
  year: number;
  structureType: string;
  departments?: string;
  testType: "official" | "additional";
  access: "free" | "premium";
  durationMinutes?: number;
}

const importTestsFromCsvFile = async (fileBuffer: Buffer) => {
  // Parse the CSV file into rows first.
  const rawRows = await readCsvRows(fileBuffer);

  if (rawRows.length === 0) {
    throw new BadRequestError("CSV file is empty");
  }

  // Validate every row with zod before touching the database.
  const parsedRows = rawRows.map((row, index) => {
    const normalizedRow = normalizeImportRow(row);
    const validation = importTestCsvRowSchema.safeParse(normalizedRow);

    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      throw new BadRequestError(`CSV validation failed at row ${index + 1}: ${firstIssue.message}`);
    }

    return validation.data as NormalizedImportRow;
  });

  const firstRow = parsedRows[0];
  const testCode = parsedRows.find((row) => row.testCode.trim().length > 0)?.testCode.trim();
  const testName = parsedRows.find((row) => row.testName.trim().length > 0)?.testName.trim();

  if (!testCode) {
    throw new BadRequestError("testCode is required in at least one CSV row");
  }

  if (!testName) {
    throw new BadRequestError("testName is required in at least one CSV row");
  }

  const mismatchedTestCode = parsedRows.find(
    (row) => row.testCode.trim().length > 0 && row.testCode.trim() !== testCode
  );
  if (mismatchedTestCode) {
    throw new BadRequestError("All non-empty testCode values must match");
  }

  const mismatchedTestName = parsedRows.find(
    (row) => row.testName.trim().length > 0 && row.testName.trim() !== testName
  );
  if (mismatchedTestName) {
    throw new BadRequestError("All non-empty testName values must match");
  }

  // Prevent duplicate question text inside the same CSV file.
  const duplicateQuestion = parsedRows.find(
    (row, index) => parsedRows.findIndex((item) => item.questionText === row.questionText) !== index
  );
  if (duplicateQuestion) {
    throw new BadRequestError(`Duplicate questionText found in CSV: ${duplicateQuestion.questionText}`);
  }

  const resolvedContexts = await Promise.all(parsedRows.map((row) => buildQuestionContext(row)));
  return withTransaction(async (session) => {
    const existingTest = await Test.findOne({ testCode }).session(session);

    if (
      existingTest &&
      (
        existingTest.examType !== firstRow.examType ||
        existingTest.year !== firstRow.year ||
        existingTest.testType !== firstRow.testType ||
        existingTest.access !== firstRow.access
      )
    ) {
      throw new BadRequestError(`Test already exists with a different exam type, year, test type or access: ${testCode}`);
    }

    const createdTest = existingTest ?? (await Test.create(
      [
        {
          title: testName,
          testCode,
          examType: firstRow.examType,
          year: firstRow.year,
          testType: firstRow.testType,
          access: firstRow.access,
          totalQuestions: 0,
          ...resolvedContexts[0],
        },
      ],
      { session }
    ))[0];

    // Determine which rows already have corresponding Question documents.
    const rowKey = (r: NormalizedImportRow) => `${r.questionText.trim()}||${r.examType}||${r.year}`;
    const keys = parsedRows.map((r) => ({ key: rowKey(r), r }));

    const orConditions = parsedRows.map((r) => ({
      questionText: r.questionText.trim(),
      examType: r.examType,
      year: r.year,
    }));

    const existingQuestions =
      orConditions.length > 0 ? await Question.find({ $or: orConditions }).session(session) : [];

    const existingMap = new Map<string, typeof existingQuestions[0]>();
    for (const q of existingQuestions) {
      const k = `${q.questionText.trim()}||${q.examType}||${q.year}`;
      existingMap.set(k, q);
    }

    const toCreateRows: Array<{ row: NormalizedImportRow; index: number }> = [];
    const toLinkExistingIds: string[] = [];

    keys.forEach(({ key, r }, idx) => {
      const existing = existingMap.get(key);
      if (existing) {
        // If existing question already linked to this test, skip; otherwise mark to link.
        const linked = existing.testIds?.map((id: any) => id.toString()).includes(createdTest._id.toString());
        if (!linked) toLinkExistingIds.push(existing._id.toString());
      } else {
        toCreateRows.push({ row: r, index: idx });
      }
    });

    // Create new questions for rows that don't exist yet.
    const newQuestionDocs = await Question.insertMany(
      toCreateRows.map(({ row, index }) => ({
        examType: row.examType,
        year: row.year,
        questionText: row.questionText.trim(),
        questionImageUrl: row.questionImageUrl,
        options: row.options,
        correctOptionIndex: row.correctOptionIndex,
        explanation: row.explanation,
        difficultyLevel: row.difficultyLevel,
        status: row.status,
        testIds: [createdTest._id],
        ...(row.examType === EXAM_TYPES.ENTRANCE_EXAM
          ? {
            faculty: resolvedContexts[index].faculty,
            departments: resolvedContexts[index].departments,
            passage: resolvedContexts[index].passage,
          }
          : {
            subject: resolvedContexts[index].subject,
            passage: resolvedContexts[index].passage,
          }),
      })),
      { session }
    );

    // Link existing questions to the test where needed.
    if (toLinkExistingIds.length > 0) {
      await Question.updateMany(
        { _id: { $in: toLinkExistingIds } },
        { $addToSet: { testIds: new mongoose.Types.ObjectId(createdTest._id) } },
        { session }
      );
    }

    // Fetch up-to-date existing questions that were linked so we can return them.
    const newlyLinkedExisting =
      toLinkExistingIds.length > 0
        ? await Question.find({ _id: { $in: toLinkExistingIds } }).session(session)
        : [];

    // Update test metadata: title and totalQuestions increment.
    const totalAdded = newQuestionDocs.length + newlyLinkedExisting.length;
    await Test.findByIdAndUpdate(
      createdTest._id,
      {
        $set: {
          title: testName,
          testCode,
          examType: firstRow.examType,
          year: firstRow.year,
          testType: firstRow.testType,
          access: firstRow.access,
          ...resolvedContexts[0],
        },
        $inc: { totalQuestions: totalAdded },
      },
      { session }
    );

    return {
      test: await Test.findById(createdTest._id).session(session),
      questions: [...newlyLinkedExisting, ...newQuestionDocs],
    };
  });
};


const getPaginatedTestsByType = async (
  testType: string,
  input: {
    examType?: string;
    departments?: string;
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
  if (input.departments) {
    query.departments = input.departments;
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
  // Create a test record without linking questions here.
  const test = await Test.create({
    ...payload,
    totalQuestions: 0,
  });
  return test;
};



// Main functions
const getAllOfficialTests = async (input: {
  category?: string;
  departments?: string; page?: number; limit?: number
}) => {
  return getPaginatedTestsByType(TEST_TYPES.OFFICIAL, input);
};

// get all additioinal tests
const getAllAdditionalTests = async (input: {
  category?: string;
  departments?: string; page?: number; limit?: number
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

  // 1. Test find kora (test title er jonno)
  const test = await Test.findById(testId).select("title").lean();
  if (!test) {
    throw new NotFoundError("Test not found");
  }

  // 2. Base Query setup
  const query: any = {
    testIds: testId,
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
    query.departments = departmentDoc._id;
  }

  // 4. Parallel Operations
  const [questions, total] = await Promise.all([
    Question.find(query)
      .select("questionText options year departments questionImageUrl correctOptionIndex explanation")
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
    .populate("departments", "name slug")
    .select("-__v");

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

  // প্রশ্নগুলো testIds দিয়ে fetch করি, কারণ source of truth Question table.
  const questionsMap = await Question.find({
    testIds: id,
    isActive: true,
    status: "published",
  })
    .populate("subjects", "name slug")
    .populate("passage", "passageCode title content");

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
    questions: questionsMap,
  };
};

// ─── Get Linkable Questions (admin filter) ────────────────────
const getLinkableQuestions = async (
  testId: string,
  filter: {
    examType?: string;
    year?: number;
    subjects?: string;
    testType?: string;
    access?: string;
    passage?: string;
    faculty?: string;
    departments?: string;
    status?: string;
  }
) => {
  const test = await Test.findById(testId);
  if (!test || !test.isActive) throw new NotFoundError("Test not found");

  const query: Record<string, unknown> = { isActive: true };

  // test এর examType + year default filter
  query.examType = filter.examType ?? test.examType;
  query.year = filter.year ? Number(filter.year) : test.year;

  if (filter.subjects) query.subjects = filter.subjects;
  if (filter.testType) query.testType = filter.testType;
  if (filter.access) query.access = filter.access;
  if (filter.passage) query.passage = filter.passage;
  if (filter.faculty) query.faculty = filter.faculty;
  if (filter.departments) query.departments = filter.departments;
  if (filter.status) query.status = filter.status;

  const linkedQuestions = await Question.find({
    testIds: testId,
    isActive: true,
  }).select("_id");
  const linkedIds = new Set(linkedQuestions.map((question) => question._id.toString()));

  const questions = await Question.find(query)
    .populate("subjects", "name slug")
    .populate("passage", "passageCode title")
    .sort({ createdAt: 1 });

  // প্রতিটা question এ isLinked flag যোগ করো
  return questions.map((q) => ({
    ...q.toObject(),
    isLinked: linkedIds.has(q._id.toString()),
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
  const existingQuestions = await Question.find({
    testIds: testId,
    _id: { $in: questionIds },
  }).select("_id");

  const existingIds = existingQuestions.map((question) => question._id.toString());
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

  await Question.updateMany(
    { _id: { $in: newIds } },
    { $addToSet: { testIds: new mongoose.Types.ObjectId(testId) } }
  );

  await Test.findByIdAndUpdate(testId, {
    $inc: { totalQuestions: newIds.length },
  });

  return Test.findById(testId).select("-__v");
};

// ─── Remove Question ──────────────────────────────────────────
const removeQuestion = async (testId: string, questionId: string) => {
  const test = await Test.findById(testId);
  if (!test || !test.isActive) throw new NotFoundError("Test not found");

  if (test.status === "published") {
    throw new BadRequestError("Cannot modify a published test");
  }

  const exists = await Question.exists({
    _id: questionId,
    testIds: testId,
    isActive: true,
  });
  if (!exists) {
    throw new BadRequestError("Question not linked to this test");
  }

  await Question.findByIdAndUpdate(questionId, {
    $pull: { testIds: new mongoose.Types.ObjectId(testId) },
  });

  await Test.findByIdAndUpdate(testId, {
    $inc: { totalQuestions: -1 },
  });

  return Test.findById(testId).select("-__v");
};

// ─── Reorder Questions ────────────────────────────────────────
const reorderQuestions = async (testId: string, orderedIds: string[]) => {
  const test = await Test.findById(testId);
  if (!test || !test.isActive) throw new NotFoundError("Test not found");

  if (test.status === "published") {
    throw new BadRequestError("Cannot modify a published test");
  }

  // No stored order exists when Question.testIds is the source of truth.
  throw new BadRequestError("Reordering is not supported when testIds are stored on questions only");
};

// ─── Publish ──────────────────────────────────────────────────
const publishTest = async (id: string): Promise<ITest> => {
  const test = await Test.findById(id);
  if (!test || !test.isActive) throw new NotFoundError("Test not found");

  const linkedQuestionCount = await Question.countDocuments({
    testIds: id,
    isActive: true,
  });

  if (linkedQuestionCount === 0) {
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
  importTestsFromCsvFile,
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
  getQuestionByTestId,
};