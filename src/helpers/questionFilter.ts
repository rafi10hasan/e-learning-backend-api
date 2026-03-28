import { BadRequestError } from "../app/errors/request/apiError";
import Department from "../app/modules/department/department.model";
import Question from "../app/modules/question/question.model";
import Subject from "../app/modules/subject/subject.model";


export interface QuestionFilterInput {
    examType: "semi_matura" | "matura" | "provime";
    subject: string | string[];
    departmentId?: string;
    year?: number;
}

// ─── Main filter function ─────────────────────────────────────
export const filterQuestions = async (input: QuestionFilterInput) => {
    const { examType, subject, departmentId, year } = input;

    let subjectsArray: string[] = [];
    if (subject) {
        subjectsArray = Array.isArray(subject) ? (subject as string[]) : [subject as string];
    }

    // ── semi_matura / matura ──────────────────────────────────
    if (examType === "semi_matura" || examType === "matura") {
        if (!subjectsArray || subjectsArray.length === 0) {
            throw new BadRequestError(
                `At least one subject is required for ${examType}`
            );
        }

        // subject names → IDs
        const foundSubjects = await Subject.find({
            name: { $in: subjectsArray },
            examType,
            isActive: true,
        }).select("_id name");

        if (foundSubjects.length === 0) {
            throw new BadRequestError("No matching subjects found");
        }

        // কোনো subject পাওয়া যায়নি সেটা জানাও
        if (foundSubjects.length !== subjectsArray.length) {
            const foundNames = foundSubjects.map((s) => s.name);
            const notFound = subjectsArray.filter((s) => !foundNames.includes(s));
            throw new BadRequestError(`Subjects not found: ${notFound.join(", ")}`);
        }

        const subjectIds = foundSubjects.map((s) => s._id);

        // subject IDs দিয়ে questions fetch
        // source: archive | both — test archive এর জন্য
        const query: Record<string, unknown> = {
            examType,
            subjectId: { $in: subjectIds },
            source: { $in: ["archive", "both"] },
            year: year ? Number(year) : undefined
        };

        if (input.year) query.year = Number(input.year);
        return query;
    }

    // ── provime ───────────────────────────────────────────────
    if (examType === "provime") {
        if (!departmentId) {
            throw new BadRequestError("department name is required for provime");
        }

        // departmentId valid কিনা check
        const department = await Department.findById(departmentId);
        if (!department || !department.isActive) {
            throw new BadRequestError("Department not found");
        }

        const query: Record<string, unknown> = {
            examType,
            departmentId: department._id,
            source: { $in: ["archive", "both"] },
            year: year ? Number(year) : undefined
        };

        if (input.year) query.year = Number(input.year);

        return query;
    }

    throw new BadRequestError("Invalid exam type");
};

// ─── Fetch questions (paginated) ───────────────────────────────
// export const fetchQuestions = async (
//     input: QuestionFilterInput & { page?: number; limit?: number }
// ) => {
//     const { page = 1, limit = 20, ...rest } = input;
//     const query = await filterQuestions(rest);
//     const skip = (page - 1) * limit;

//     const [total, questions] = await Promise.all([
//         Question.countDocuments(query),
//         Question.find(query)
//             .populate("subjectId", "name slug")
//             .populate("departmentId", "name slug")
//             .populate("passageId", "passageCode title content")
//             .skip(skip)
//             .limit(limit)
//             .sort({ createdAt: -1 }),
//     ]);

//     return {
//         questions,
//         pagination: {
//             total,
//             page,
//             limit,
//             totalPages: Math.ceil(total / limit),
//         },
//     };
// };

// ─── Fetch random questions (quiz generation) ──────────────────
export const fetchRandomQuestions = async (
    input: QuestionFilterInput & { count: number }
) => {
    const { count, ...rest } = input;

    // quiz generation এ source: practice | both
    const query = await filterQuestions({ ...rest });

    // source override করো quiz এর জন্য
    (query as Record<string, unknown>).source = { $in: ["practice", "both"] };
    (query as Record<string, unknown>).status = "published";

    return Question.aggregate([
        { $match: query },
        { $sample: { size: count } },
    ]);
};