import mongoose, { Schema } from "mongoose";
import Department from "../../department/department.model";
import Faculty from "../../faculty/faculty.model";
import Passage from "../../passage/passage.model";
import Question from "../../question/question.model";
import { QuizSession } from "../../quiz-session/quiz.session.model";
import Subject from "../../subject/subject.model";
import Test from "../../test/test.model";
import User from "../../user/user.model";
import { TQuestionListInput, TTestListInput } from "./question.zod";





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
        // ✅ passageDetails $lookup নেই তাই $unwind সরিয়ে দেওয়া হয়েছে

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

export const dashboardQuestionService = {
    getQuestionOverview,
    getAllQuestions,
    getAllTestArchive
}