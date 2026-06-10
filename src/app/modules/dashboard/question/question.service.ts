import mongoose, { Schema, Types } from "mongoose";
import withTransaction from "../../../../helpers/withTransaction";
import { EXAM_TYPES } from "../../../../interfaces";
import { uploadToCloudinary } from "../../../cloudinary/uploadImageToCLoudinary";
import { BadRequestError, NotFoundError } from "../../../errors/request/apiError";
import Department from "../../department/department.model";
import Faculty from "../../faculty/faculty.model";
import { PassageFiles } from "../../passage/passage.interface";
import Passage from "../../passage/passage.model";
import Question from "../../question/question.model";
import { QuizSession } from "../../quiz-session/quiz.session.model";
import Subject from "../../subject/subject.model";
import Test from "../../test/test.model";
import User from "../../user/user.model";
import { buildQuestionContext, NormalizedImportRow, normalizeImportRow, readCsvRows } from "./question.utils";
import { importTestCsvRowSchema, TCreatePassagePayload, TQuestionListInput, TTestListInput } from "./question.zod";





const getQuestionOverview = async () => {
    const [
        totalQuestions,
        publishedTests,
        totalPassages,
        activeStudents,
        totalQuizSessions
    ] = await Promise.all([
        Question.countDocuments({}),
        Test.countDocuments({ status: "published" }),
        Passage.countDocuments({}),
        User.countDocuments({ role: "student", status: "active" }),
        QuizSession.countDocuments({})
    ]);

    return {
        totalQuestions,
        publishedTests,
        totalPassages,
        activeStudents,
        totalQuizSessions
    };
}


// get al question
const getAllQuestions = async (input: TQuestionListInput) => {
    console.log(input)
    const page = Number(input.page) || 1;
    const limit = Number(input.limit) || 20;
    const skip = (page - 1) * limit;

    const matchQuery: Record<string, unknown> = {
        isActive: true,
    };

    // ── questionText search আলাদা field হিসেবে রাখো ──
    if (input.questionText?.trim()) {
        matchQuery.questionText = {
            $regex: input.questionText.trim(),
            $options: "i",
        };
    }
    console.log(input.examType)
    // simple filters
    if (input.examType) matchQuery.examType = input.examType;
    if (input.year) matchQuery.year = Number(input.year);
    if (input.access) matchQuery.access = input.access;
    if (input.difficultyLevel) matchQuery.difficultyLevel = input.difficultyLevel;
    if (input.status) matchQuery.status = input.status;

    if (input.passageId && mongoose.isValidObjectId(input.passageId)) {
        matchQuery.passage = new Schema.Types.ObjectId(input.passageId);
    }

    // ── searchTerm → subject / faculty / department name-এ search ──
    if (input.searchTerm?.trim()) {
        const term = input.searchTerm.trim();

        const [matchedSubject, matchedFaculty, matchedDepartment] = await Promise.all([
            Subject.findOne({
                name: { $regex: term, $options: "i" },
                // examType select করা থাকলে শুধু সেই examType-এর subject আসবে
                ...(input.examType && { examType: input.examType }),
            }).select("_id").lean(),

            Faculty.findOne({
                name: { $regex: term, $options: "i" },
            }).select("_id").lean(),

            Department.findOne({
                name: { $regex: term, $options: "i" },
            }).select("_id").lean(),
        ]);

        const orConditions: Record<string, unknown>[] = [];

        if (matchedSubject) orConditions.push({ subject: matchedSubject._id });
        if (matchedFaculty) orConditions.push({ faculty: matchedFaculty._id });
        if (matchedDepartment) orConditions.push({ departments: { $in: [matchedDepartment._id] } });

        if (orConditions.length > 0) {
            // existing $and conditions preserve করো
            const existing = matchQuery.$and as Record<string, unknown>[] | undefined;
            matchQuery.$and = [
                ...(existing ?? []),
                { $or: orConditions },
            ];
        } else {
            // কোনো match নেই — empty result return করো
            return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
        }
    }

    // ── Direct ID/name filter (searchTerm ছাড়া explicit filter) ──
    if (input.subjectName?.trim()) {
        const subject = await Subject.findOne({
            name: { $regex: input.subjectName.trim(), $options: "i" },
            // examType থাকলে সেই examType-এর subject, না থাকলে সব
            ...(input.examType && { examType: input.examType }),
        }).select("_id").lean();

        if (!subject) {
            return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
        }
        matchQuery.subject = subject._id;
    }

    if (input.facultyName?.trim()) {
        const faculty = await Faculty.findOne({
            name: { $regex: input.facultyName.trim(), $options: "i" },
        }).select("_id").lean();

        if (!faculty) {
            return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
        }
        matchQuery.faculty = faculty._id;
    }

    if (input.departmentName?.trim()) {
        const department = await Department.findOne({
            name: { $regex: input.departmentName.trim(), $options: "i" },
        }).select("_id").lean();

        if (!department) {
            return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
        }
        matchQuery.departments = { $in: [department._id] };
    }

    // ── Aggregation ──
    const aggregatePipeline: any[] = [
        { $match: matchQuery },

        // populate
        {
            $lookup: {
                from: "subjects",
                localField: "subject",
                foreignField: "_id",
                as: "subjectDetails",
            },
        },
        {
            $lookup: {
                from: "faculties",
                localField: "faculty",
                foreignField: "_id",
                as: "facultyDetails",
            },
        },
        {
            $lookup: {
                from: "departments",
                localField: "departments",
                foreignField: "_id",
                as: "departmentDetails",
            },
        },
        {
            $lookup: {
                from: "passages",
                localField: "passage",
                foreignField: "_id",
                as: "passageDetails",
            },
        },

        { $unwind: { path: "$subjectDetails", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$facultyDetails", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$passageDetails", preserveNullAndEmptyArrays: true } },

        { $sort: { createdAt: -1 } },

        {
            $facet: {
                metadata: [{ $count: "total" }],
                data: [
                    { $skip: skip },
                    { $limit: limit },
                    {
                        $project: {
                            _id: 1,
                            examType: 1,
                            year: 1,
                            questionText: 1,
                            access: 1,
                            correctOptionIndex: 1,
                            difficultyLevel: 1,
                            status: 1,
                            createdAt: 1,
                            subject: {
                                $cond: {
                                    if: { $ifNull: ["$subjectDetails", false] },
                                    then: {
                                        _id: { $ifNull: ["$subjectDetails._id", null] },
                                        name: { $ifNull: ["$subjectDetails.name", null] },
                                    },
                                    else: null,
                                },
                            },

                            faculty: {
                                $cond: {
                                    if: { $ifNull: ["$facultyDetails", false] },
                                    then: {
                                        _id: { $ifNull: ["$facultyDetails._id", null] },
                                        name: { $ifNull: ["$facultyDetails.name", null] },
                                    },
                                    else: null,
                                },
                            },

                            passage: {
                                $cond: {
                                    if: { $ifNull: ["$passageDetails", false] },
                                    then: {
                                        _id: { $ifNull: ["$passageDetails._id", null] },
                                        passageCode: { $ifNull: ["$passageDetails.passageCode", null] },
                                        title: { $ifNull: ["$passageDetails.title", null] },
                                    },
                                    else: null,
                                },
                            },

                            departments: {
                                $map: {
                                    input: "$departmentDetails",
                                    as: "dept",
                                    in: { _id: "$$dept._id", name: "$$dept.name" },
                                },
                            },
                        },
                    },
                ],
            },
        },
    ];

    const result = await Question.aggregate(aggregatePipeline);
    const formattedData = result[0]?.data.map((item: any) => ({
        _id: item._id,
        examType: item.examType,
        year: item.year,
        questionText: item.questionText,
        access: item.access,
        difficultyLevel: item.difficultyLevel,
        correctOptionIndex: item.correctOptionIndex,
        status: item.status,
        createdAt: item.createdAt,
        subjectName: item.subject?.name ?? null,
        facultyName: item.faculty?.name ?? null,
        passageCode: item.passage?.passageCode ?? null,
    })) || [];

    const total = result[0]?.metadata[0]?.total || 0;

    return {
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
        questions: formattedData,
    };
};


// get single question
const getQuestionById = async (id: string) => {
    if (!mongoose.isValidObjectId(id)) {
        throw new BadRequestError("Invalid question ID");
    }

    const questionId = new Types.ObjectId(id);

    // ── Step 1: Question details ──
    const questionAgg = await Question.aggregate([
        { $match: { _id: questionId, isActive: true } },

        {
            $lookup: {
                from: "subjects",
                localField: "subject",
                foreignField: "_id",
                as: "subjectDetails",
            },
        },
        {
            $lookup: {
                from: "faculties",
                localField: "faculty",
                foreignField: "_id",
                as: "facultyDetails",
            },
        },
        {
            $lookup: {
                from: "departments",
                localField: "departments",
                foreignField: "_id",
                as: "departmentDetails",
            },
        },
        {
            $lookup: {
                from: "passages",
                localField: "passage",
                foreignField: "_id",
                as: "passageDetails",
            },
        },

        {
            $lookup: {
                from: "tests",
                localField: "testIds",
                foreignField: "_id",
                as: "testDetails",
            },
        },

        { $unwind: { path: "$subjectDetails", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$facultyDetails", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$passageDetails", preserveNullAndEmptyArrays: true } },

        {
            $project: {
                _id: 1,
                examType: 1,
                year: 1,
                questionText: 1,
                questionImageUrl: { $ifNull: ["$questionImageUrl", null] },
                options: 1,
                correctOptionIndex: 1,
                explanation: { $ifNull: ["$explanation", null] },
                difficultyLevel: 1,
                access: 1,
                status: 1,
                testIds: {
                    $map: {
                        input: "$testDetails",
                        as: "test",
                        in: "$$test.title",
                    },
                },
                createdAt: 1,
                updatedAt: 1,

                subject: {
                    $cond: {
                        if: { $ifNull: ["$subjectDetails", false] },
                        then: {
                            _id: { $ifNull: ["$subjectDetails._id", null] },
                            name: { $ifNull: ["$subjectDetails.name", null] },
                        },
                        else: null,
                    },
                },
                faculty: {
                    $cond: {
                        if: { $ifNull: ["$facultyDetails", false] },
                        then: {
                            _id: { $ifNull: ["$facultyDetails._id", null] },
                            name: { $ifNull: ["$facultyDetails.name", null] },
                        },
                        else: null,
                    },
                },
                departments: {
                    $map: {
                        input: "$departmentDetails",
                        as: "dept",
                        in: { _id: "$$dept._id", name: "$$dept.name" },
                    },
                },
                passage: {
                    $cond: {
                        if: { $ifNull: ["$passageDetails", false] },
                        then: {
                            _id: { $ifNull: ["$passageDetails._id", null] },
                            passageCode: { $ifNull: ["$passageDetails.passageCode", null] },
                            title: { $ifNull: ["$passageDetails.title", null] },
                        },
                        else: null,
                    },
                },
            },
        },
    ]);

    if (!questionAgg.length) {
        throw new NotFoundError("Question not found");
    }

    const question = questionAgg[0];

    // ── Step 2: QuizSession থেকে attempt stats ──
    const statsAgg = await QuizSession.aggregate([
        // এই question যেসব session-এ attempt হয়েছে
        {
            $match: {
                "attempts.questionId": questionId,
            },
        },
        // attempts array unwind করো
        { $unwind: "$attempts" },
        // শুধু এই question-এর attempts রাখো
        {
            $match: {
                "attempts.questionId": questionId,
            },
        },
        // stats বের করো
        {
            $group: {
                _id: null,
                totalAttempts: { $sum: 1 },
                correctCount: {
                    $sum: { $cond: ["$attempts.isCorrect", 1, 0] },
                },
                wrongCount: {
                    $sum: { $cond: ["$attempts.isCorrect", 0, 1] },
                },
            },
        },
        {
            $project: {
                _id: 0,
                totalAttempts: 1,
                correctCount: 1,
                wrongCount: 1,
                // correct percentage
                correctPercentage: {
                    $cond: [
                        { $gt: ["$totalAttempts", 0] },
                        {
                            $round: [
                                { $multiply: [{ $divide: ["$correctCount", "$totalAttempts"] }, 100] },
                                1,
                            ],
                        },
                        0,
                    ],
                },
            },
        },
    ]);




    const stats = statsAgg[0] ?? {
        totalAttempts: 0,
        correctCount: 0,
        wrongCount: 0,
        correctPercentage: 0,
    };


    const formatted = {
        questionId: question._id,
        examType: question.examType,
        year: question.year,
        questionText: question.questionText,
        questionImageUrl: question.questionImageUrl,
        options: question.options,
        correctOptionIndex: question.correctOptionIndex,
        explanation: question.explanation,
        difficultyLevel: question.difficultyLevel,
        access: question.access,
        status: question.status,
        createdAt: question.createdAt,
        subjectName: question.subject?.name ?? null,
        facultyName: question.faculty?.name ?? null,
        departments: question.departments?.map((d: any) => d.name) ?? [],
        passage: question.passage ?? null,
        testIds: question.testIds ?? [],
        stats,
    };

    // ── Step 3: Merge ──
    return formatted
};


// get all test archive

const getAllTestArchive = async (input: TTestListInput) => {
    const page = Number(input.page) || 1;
    const limit = Number(input.limit) || 20;
    const skip = (page - 1) * limit;

    const matchQuery: Record<string, unknown> = {
        isActive: true,
    };

    if (input.examType) matchQuery.examType = input.examType;
    if (input.year) matchQuery.year = Number(input.year);
    if (input.access) matchQuery.access = input.access;
    if (input.status) matchQuery.status = input.status;
    if (input.testType) matchQuery.testType = input.testType;

    // ── searchTerm → title, testCode, subject, faculty, department ──
    if (input.searchTerm?.trim()) {
        const term = input.searchTerm.trim();

        const [matchedSubject, matchedFaculty, matchedDepartment] = await Promise.all([
            Subject.findOne({
                name: { $regex: term, $options: "i" },
                ...(input.examType && { examType: input.examType }),
            }).select("_id").lean(),

            Faculty.findOne({
                name: { $regex: term, $options: "i" },
            }).select("_id").lean(),

            Department.findOne({
                name: { $regex: term, $options: "i" },
            }).select("_id").lean(),
        ]);

        const orConditions: Record<string, unknown>[] = [
            // title ও testCode সরাসরি field match
            { title: { $regex: term, $options: "i" } },
            { testCode: { $regex: term, $options: "i" } },
        ];

        if (matchedSubject) orConditions.push({ subject: matchedSubject._id });
        if (matchedFaculty) orConditions.push({ faculty: matchedFaculty._id });
        if (matchedDepartment) orConditions.push({ departments: { $in: [matchedDepartment._id] } });

        const existing = matchQuery.$and as Record<string, unknown>[] | undefined;
        matchQuery.$and = [
            ...(existing ?? []),
            { $or: orConditions },
        ];
    }

    // ── Direct filters ──
    if (input.title) matchQuery.title = { $regex: input.title.trim(), $options: "i" };
    if (input.testCode) matchQuery.testCode = { $regex: input.testCode.trim(), $options: "i" };

    if (input.subjectName?.trim()) {
        const subject = await Subject.findOne({
            name: { $regex: input.subjectName.trim(), $options: "i" },
            ...(input.examType && { examType: input.examType }),
        }).select("_id").lean();

        if (!subject) return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
        matchQuery.subject = subject._id;
    }

    if (input.facultyName?.trim()) {
        const faculty = await Faculty.findOne({
            name: { $regex: input.facultyName.trim(), $options: "i" },
        }).select("_id").lean();

        if (!faculty) return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
        matchQuery.faculty = faculty._id;
    }

    if (input.departmentName?.trim()) {
        const department = await Department.findOne({
            name: { $regex: input.departmentName.trim(), $options: "i" },
        }).select("_id").lean();

        if (!department) return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
        matchQuery.departments = { $in: [department._id] };
    }

    // ── Aggregation ──
    const aggregatePipeline: any[] = [
        { $match: matchQuery },

        {
            $lookup: {
                from: "subjects",
                localField: "subject",
                foreignField: "_id",
                as: "subjectDetails",
            },
        },
        {
            $lookup: {
                from: "faculties",
                localField: "faculty",
                foreignField: "_id",
                as: "facultyDetails",
            },
        },
        {
            $lookup: {
                from: "departments",
                localField: "departments",
                foreignField: "_id",
                as: "departmentDetails",
            },
        },

        { $unwind: { path: "$subjectDetails", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$facultyDetails", preserveNullAndEmptyArrays: true } },
        // passageDetails $lookup নেই তাই $unwind সরিয়ে দেওয়া হয়েছে

        { $sort: { createdAt: -1 } },

        {
            $facet: {
                metadata: [{ $count: "total" }],
                data: [
                    { $skip: skip },
                    { $limit: limit },
                    {
                        $project: {
                            _id: 1,
                            title: 1,
                            testCode: 1,
                            testType: 1,
                            examType: 1,
                            year: 1,
                            access: 1,
                            status: 1,
                            createdAt: 1,
                            totalQuestions: 1,
                            subject: {
                                $cond: {
                                    if: { $ifNull: ["$subjectDetails", false] },
                                    then: {
                                        _id: { $ifNull: ["$subjectDetails._id", null] },
                                        name: { $ifNull: ["$subjectDetails.name", null] },
                                    },
                                    else: null,
                                },
                            },

                            faculty: {
                                $cond: {
                                    if: { $ifNull: ["$facultyDetails", false] },
                                    then: {
                                        _id: { $ifNull: ["$facultyDetails._id", null] },
                                        name: { $ifNull: ["$facultyDetails.name", null] },
                                    },
                                    else: null,
                                },
                            },

                            departments: {
                                $map: {
                                    input: "$departmentDetails",
                                    as: "dept",
                                    in: { _id: "$$dept._id", name: "$$dept.name" },
                                },
                            },
                        },
                    },
                ],
            },
        },
    ];

    const result = await Test.aggregate(aggregatePipeline);

    const formattedData = result[0]?.data.map((item: any) => ({
        _id: item._id,
        title: item.title ?? null,
        testCode: item.testCode ?? null,
        testType: item.testType ?? null,
        examType: item.examType ?? null,
        year: item.year ?? null,
        totalQuestions: item.totalQuestions ?? 0,
        access: item.access ?? null,
        status: item.status ?? null,
        createdAt: item.createdAt,
        subjectName: item.subject?.name ?? null,
        facultyName: item.faculty?.name ?? null,
        departments: item.departments?.map((d: any) => d.name) ?? [],
    })) || [];

    const total = result[0]?.metadata[0]?.total || 0;

    return {
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        tests: formattedData,
    };
};


const createPassage = async (payload: TCreatePassagePayload
    , files: PassageFiles) => {
    // Create a passage record without linking questions here.

    let passageImageUrl: string | undefined;
    if (files?.passage_image?.[0]) {
        const uploaded = await uploadToCloudinary(
            files.passage_image[0],
            "passage_images"
        );
        passageImageUrl = uploaded.secure_url;
    }

    const isExistingPassage = await Passage.findOne({ passageCode: payload.passageCode });

    if (isExistingPassage) {
        throw new BadRequestError("Passage with this code already exists");
    }

    const passage = await Passage.create({ ...payload, passageImageUrl });

    if (!passage) {
        throw new BadRequestError("Failed to create passage");
    }
    return passage;
};


const importTestsFromCsvFile = async (fileBuffer: Buffer) => {
    // Parse the CSV file into rows first.
    const rawRows = await readCsvRows(fileBuffer);

    if (rawRows.length === 0) {
        throw new BadRequestError("CSV file is empty");
    }

    // Validate every row with zod before touching the database.
    const parsedRows = rawRows.map((row, index) => {
        const normalizedRow = normalizeImportRow(row);
        console.log({ normalizedRow });
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

    console.log({ resolvedContexts });

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


export const dashboardQuestionService = {
    getQuestionOverview,
    getAllQuestions,
    getAllTestArchive,
    createPassage,
    importTestsFromCsvFile,
    getQuestionById,
}