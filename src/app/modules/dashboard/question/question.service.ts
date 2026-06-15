import mongoose, { Schema, Types } from "mongoose";
import withTransaction from "../../../../helpers/withTransaction";
import { uploadToCloudinary } from "../../../cloudinary/uploadImageToCLoudinary";
import { BadRequestError, NotFoundError } from "../../../errors/request/apiError";
import Department from "../../department/department.model";
import Faculty from "../../faculty/faculty.model";
import { IPassage, PassageFiles } from "../../passage/passage.interface";
import Passage from "../../passage/passage.model";
import Question from "../../question/question.model";
import { QuizSession } from "../../quiz-session/quiz.session.model";
import Subject from "../../subject/subject.model";
import Test from "../../test/test.model";
import User from "../../user/user.model";
import { dedupeRowsWithinFile, enforceAccessConsistency, ImportIssue, ImportValidationSummary, readTabularRows, resolveRowContexts, upsertTestAndQuestions, validateFileLevelRules, validateRowSchemas } from "./question.utils";
import { TCreatePassagePayload, TQuestionListInput, TTestListInput } from "./question.zod";





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

const getPassages = async (query: {page:string, limit:string, searchTerm?: string}) => {
 const { searchTerm, page: reqPage, limit: reqLimit } = query;

    // 1. Number convert kora ebong fallback set kora
    const page = parseInt(reqPage) || 1;
    const limit = parseInt(reqLimit) || 10;
    const skip = (page - 1) * limit;

    // 2. FilterQuery bad diye normal dynamic object toiri kora
    // 'any' use korar karone FilterQuery niye ar TypeScript-er kono jhamela thakbe na
    const mongooseQuery: any = { isActive: true }; 

    if (searchTerm) {
        mongooseQuery.$or = [
            { title: { $regex: searchTerm, $options: 'i' } },       
            { content: { $regex: searchTerm, $options: 'i' } },     
            { passageCode: { $regex: searchTerm, $options: 'i' } }  
        ];
    }

    // 3. Database query execute kora
    const [passages, totalPassages] = await Promise.all([
        Passage.find(mongooseQuery)
            .sort({ createdAt: -1 }) 
            .skip(skip)
            .limit(limit),
        Passage.countDocuments(mongooseQuery)
    ]);

    // 4. Total pages calculate kora
    const totalPages = Math.ceil(totalPassages / limit);
    
    return {
        meta: {
            totalPassages,
            totalPages,
            currentPage: page,
            limit
        },
        data: passages
    };
}

const importTestsFromFile = async (
    fileBuffer: Buffer
): Promise<{
    summary: ImportValidationSummary;
    test?: any;
    questions?: any[];
}> => {
    const issues: ImportIssue[] = [];

    // 1. Parse the uploaded file into raw row objects.
    const rawRows = readTabularRows(fileBuffer);

    if (rawRows.length === 0) {
        return {
            summary: {
                totalRows: 0,
                validRows: 0,
                warnings: [],
                errors: [{ row: 0, level: "error", message: "File is empty" }],
            },
        };
    }

    // 2. Validate each row's shape with zod.
    const schemaValidRows = validateRowSchemas(rawRows, issues);

    // 3. Validate file-level rules (examType consistency, testCode/testName, exam-type rules).
    const fileLevelInfo = validateFileLevelRules(schemaValidRows, issues);

    // 4. Drop duplicate questionText rows within this file (warning, not error).
    const dedupedRows = dedupeRowsWithinFile(schemaValidRows, issues);

    // 5. Resolve faculty/department/subject/passage references for each row.
    const resolvedRows = await resolveRowContexts(dedupedRows, issues);

    const totalRows = rawRows.length;

    // Stop here (without touching the DB) if there are blocking errors,
    // or file-level info could not be determined.
    if (issues.some((i) => i.level === "error") || !fileLevelInfo) {
        return {
            summary: {
                totalRows,
                validRows: resolvedRows.length,
                warnings: issues.filter((i) => i.level === "warning"),
                errors: issues.filter((i) => i.level === "error"),
            },
        };
    }

    const { testCode, testName, firstRow } = fileLevelInfo;

    // 6. Write to the database inside a transaction.
    const result = await withTransaction(async (session) => {
        // Enforce the free/premium duplicate rule against existing DB questions.
        const allowedRows = await enforceAccessConsistency(resolvedRows, issues, session);

        return upsertTestAndQuestions({
            testCode,
            testName,
            firstRow,
            rows: allowedRows,
            session,
        });
    });

    return {
        summary: {
            totalRows,
            validRows: resolvedRows.length - issues.filter((i) => i.level === "error").length,
            warnings: issues.filter((i) => i.level === "warning"),
            errors: issues.filter((i) => i.level === "error"),
        },
        test: result.test,
        questions: result.questions,
    };
};


export const dashboardQuestionService = {
    getQuestionOverview,
    getAllQuestions,
    getAllTestArchive,
    createPassage,
    getPassages,
    importTestsFromFile,
    getQuestionById,
}