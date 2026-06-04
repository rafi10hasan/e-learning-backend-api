import mongoose, { Types } from "mongoose";
import withTransaction from "../../../helpers/withTransaction";
import { EXAM_TYPES, TEST_TYPES } from "../../../interfaces";
import { BadRequestError, NotFoundError } from "../../errors/request/apiError";
import Department from "../department/department.model";
import Question from "../question/question.model";
import { ITest } from "./test.interface";
import Test from "./test.model";
import { buildQuestionContext, getPaginatedTestsByType, NormalizedImportRow, normalizeImportRow, readCsvRows } from "./test.utils";
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


// import tests from csv file
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
  const uniqueExamTypes = new Set(parsedRows.map((row) => row.examType));
  const testCode = parsedRows.find((row) => row.testCode.trim().length > 0)?.testCode.trim();
  const testName = parsedRows.find((row) => row.testName.trim().length > 0)?.testName.trim();

  if (uniqueExamTypes.size !== 1) {
    throw new BadRequestError("All CSV rows must have the same examType");
  }

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

  if (firstRow.examType === EXAM_TYPES.ENTRANCE_EXAM) {
    const faculty = parsedRows.find((row) => (row.faculty ?? "").trim().length > 0)?.faculty?.trim() ?? "";

    if (!faculty) {
      throw new BadRequestError("faculty is required for provime CSV rows");
    }

    const mismatchedFaculty = parsedRows.find(
      (row) => {
        const currentFaculty = (row.faculty ?? "").trim();
        return currentFaculty.length > 0 && currentFaculty !== faculty;
      }
    );
    if (mismatchedFaculty) {
      throw new BadRequestError("All provime CSV rows must have the same faculty");
    }

    const missingDepartments = parsedRows.find((row) => !row.departments || row.departments.length === 0);
    if (missingDepartments) {
      throw new BadRequestError("Each provime CSV row must have at least one department");
    }

    // const subjectRow = parsedRows.find((row) => (row.subjects ?? "").trim().length > 0);
    // if (subjectRow) {
    //   throw new BadRequestError("subject is not allowed for provime CSV rows");
    // }
  } else {
    // For matura / semi_matura, each row must specify a subject (tests may include multiple subjects).
    const missingSubject = parsedRows.find((row) => (row.subject ?? "").trim().length === 0);
    if (missingSubject) {
      throw new BadRequestError("Each matura or semi_matura CSV row must have a subject");
    }

    const invalidFaculty = parsedRows.find((row) => (row.faculty ?? "").trim().length > 0);
    if (invalidFaculty) {
      throw new BadRequestError("faculty is not allowed for matura or semi matura CSV rows");
    }

    const invalidDepartments = parsedRows.find((row) => row.departments && row.departments.length > 0);
    if (invalidDepartments) {
      throw new BadRequestError("departments are not allowed for matura or semi matura CSV rows");
    }
  }

  // Prevent duplicate question text inside the same CSV file.
  const duplicateQuestion = parsedRows.find(
    (row, index) => parsedRows.findIndex((item) => item.questionText === row.questionText) !== index
  );
  if (duplicateQuestion) {
    throw new BadRequestError(`Duplicate questionText found in CSV: ${duplicateQuestion.questionText}`);
  }

  const resolvedContexts = await Promise.all(parsedRows.map((row) => buildQuestionContext(row)));

  console.log({resolvedContexts});

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

    if (existingTest && existingTest.examType !== firstRow.examType) {
      throw new BadRequestError(`Test already exists with a different examType: ${testCode}`);
    }

    const createdTest = existingTest ?? (await Test.create(
      [
        {
          title: testName,
          testCode,
          examType: firstRow.examType,
          year: firstRow.year,
          subjects: [...new Set(resolvedContexts.map(item => item.subject.toString()))].map(id => new Types.ObjectId(id)),
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
        access: row.access,
        correctOptionIndex: row.correctOptionIndex,
        explanation: row.explanation,
        difficultyLevel: row.difficultyLevel,
        status: row.status,
        testIds: [createdTest._id],
        ...(row.examType === EXAM_TYPES.ENTRANCE_EXAM
          ? {
            faculty: resolvedContexts[index].faculty,
            departments: resolvedContexts[index].departments,
            subject: resolvedContexts[index].subject,
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



// ─── Create ───────────────────────────────────────────────────
const createTest = async (payload: TCreateTestPayload): Promise<ITest> => {
  // Create a test record without linking questions here.
  const test = await Test.create({
    ...payload,
    totalQuestions: 0,
  });
  return test;
};



const getAllOfficialTests = async (input: {
  examType?: string;
  faculty?: string;
  departments?: string[];   // string[] now
  page?: number;
  limit?: number;
}) => {
  return getPaginatedTestsByType(TEST_TYPES.OFFICIAL, input);
};

const getAllAdditionalTests = async (input: {
  examType?: string;
  faculty?: string;
  departments?: string[];   // string[] now
  page?: number;
  limit?: number;
}) => {
  return getPaginatedTestsByType(TEST_TYPES.ADDITIONAL, input);
};


// get Question by test id with pagination and optional department filter
const getQuestionsByTestId = async (
  testId: string,
  input: { page?: number; limit?: number }
) => {
  const page = Number(input.page) || 1;
  const limit = Number(input.limit) || 20;
  const skip = (page - 1) * limit;

  // 1. Test find kora
  const test = await Test.findById(testId).select("title").lean();
  if (!test) {
    throw new NotFoundError("Test not found");
  }

  // Aggregation-er jonno ObjectId casting
  const targetTestId = new mongoose.Types.ObjectId(testId);

  // 2. Base Match Query Setup
  const matchQuery: any = {
    testIds: { $in: [targetTestId] },
    isActive: true,
    status: "published"
  };


  // 4. Aggregation Pipeline
  const aggregatePipeline: any[] = [
    // Stage 1: Filter Questions
    { $match: matchQuery },

    // Stage 2: CRITICAL SORTING (Jeno same passage-er shob prosno por por thake)
    { 
      $sort: { 
        subject: 1,
        passage: 1, // Same passage group ekshathe thakbe
        year: -1, 
        _id: 1 
      } 
    },

    // Stage 3: Populate Passage Collection
    {
      $lookup: {
        from: "passages", // Database collection name string check kore niben
        localField: "passage",
        foreignField: "_id",
        as: "passageDetails"
      }
    },

    // Stage 4: Unwind object conversion
    {
      $unwind: {
        path: "$passageDetails",
        preserveNullAndEmptyArrays: true
      }
    },

    // Stage 5: Facet Pagination & Field Projecting
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 0,
              questionId: "$_id",
              questionText: 1,
              options: 1,
              questionImage: { $ifNull: ["$questionImageUrl", null] },
              year: 1,
              correctOptionIndex: 1,
              explanation: 1,
              // Initial Passage details map (Id ti loop processing er jonno strict lagbe)
              passageRaw: {
                $cond: {
                  if: { $gt: [{ $ifNull: ["$passageDetails", 0] }, 0] },
                  then: {
                    _id: "$passageDetails._id",
                    passageCode: "$passageDetails.passageCode",
                    title: "$passageDetails.title",
                    content: "$passageDetails.content",
                    passageImageUrl: "$passageDetails.passageImageUrl",
                    questionRange: "$passageDetails.questionRange"
                  },
                  else: null
                }
              }
            }
          }
        ]
      }
    }
  ];

  // Aggregation execute kora
  const aggregationResult = await Question.aggregate(aggregatePipeline);

  const rawQuestions = aggregationResult[0]?.data || [];
  const total = aggregationResult[0]?.metadata[0]?.total || 0;

  // 5. TRICK LAYER: Backend control for single passage rendering
  let lastProcessedPassageId: string | null = null;

  const finalQuestions = rawQuestions.map((q: any) => {
    const { passageRaw, ...restQuestionData } = q;
    
    // Jodi prosne passage thake
    if (passageRaw && passageRaw._id) {
      const currentPassageId = passageRaw._id.toString();

      // Jodi eiti ekta NOTUN passage hoy (ja ager prosne chilo na)
      if (currentPassageId !== lastProcessedPassageId) {
        lastProcessedPassageId = currentPassageId; // Track ID updated

        return {
          ...restQuestionData,
          passage: passageRaw // Full passage details prothom prosne jabe
        };
      } else {
        // Same passage repeat hole object structure intact thakbe kintu data content/image completely hidden (null) thakbe
        return {
          ...restQuestionData,
          passage: {
            _id: passageRaw._id,
            passageCode: passageRaw.passageCode,
            title: null,
            content: null,
            passageImageUrl: null,
            questionRange: passageRaw.questionRange
          }
        };
      }
    }

    // Passage na thakle direct null
    return {
      ...restQuestionData,
      passage: null
    };
  });

  return {
    testTitle: test.title,
    data: finalQuestions,
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
  getQuestionsByTestId,
};