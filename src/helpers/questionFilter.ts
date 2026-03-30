import { BadRequestError } from "../app/errors/request/apiError";
import Department from "../app/modules/department/department.model";
import Question from "../app/modules/question/question.model";
import Subject from "../app/modules/subject/subject.model";


export interface QuestionFilterInput {
    examType: "semi_matura" | "matura" | "provime";
    subject: string | string[];
    department?: string | string[];
    year?: number;
}

// ─── Main filter function ─────────────────────────────────────
export const filterQuestions = async (input: QuestionFilterInput) => {
    const { examType, subject, department, year } = input;

    let subjectsArray: string[] = [];
    let departmentsArray: string[] = [];
    
    if (subject) {
        subjectsArray = Array.isArray(subject) ? (subject as string[]) : [subject as string];
    }

    if (department) {
        departmentsArray = Array.isArray(department) ? (department as string[]) : [department as string];
    }
    console.log({department})
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

        console.log({ foundSubjects })
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
        console.log({ subjectIds })
        // subject IDs দিয়ে questions fetch
        // source: archive | both — test archive এর জন্য
        const query: Record<string, unknown> = {
            examType,
            subjectId: { $in: subjectIds },
            source: { $in: ["archive", "both"] },
            year: year ? Number(year) : undefined
        };

        if (input.year) query.year = Number(input.year);
        console.log({ query })
        return query;
    }

    // ── provime ───────────────────────────────────────────────
    if (examType === "provime") {
        if (!departmentsArray || departmentsArray.length === 0) {
            throw new BadRequestError("At least one department is required for provime");
        }
        console.log({departmentsArray})
        // departmentId valid কিনা check
        const foundDepartments = await Department.find({
            name: { $in: departmentsArray },
            examType,
            isActive: true,
        }).select("_id name");

        console.log({ foundDepartments })
        if (foundDepartments.length === 0) {
            throw new BadRequestError("No matching departments found");
        }

        // কোনো subject পাওয়া যায়নি সেটা জানাও
        if (foundDepartments.length !== departmentsArray.length) {
            const foundNames = foundDepartments.map((d) => d.name);
            const notFound = departmentsArray.filter((d) => !foundNames.includes(d));
            throw new BadRequestError(`Departments not found: ${notFound.join(", ")}`);
        }

        const departmentIds = foundDepartments.map((d) => d._id);
        console.log({ departmentIds })
        // department IDs দিয়ে questions fetch
        // source: archive | both — test archive এর জন্য
        const query: Record<string, unknown> = {
            examType,
            departmentId: { $in: departmentIds },
            source: { $in: ["archive", "both"] },
            year: year ? Number(year) : undefined
        };

        if (input.year) query.year = Number(input.year);
        console.log({ query })
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