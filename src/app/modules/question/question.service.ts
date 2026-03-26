import { uploadToCloudinary } from "../../cloudinary/uploadImageToCLoudinary";
import { BadRequestError } from "../../errors/request/apiError";
import { IOption, IQuestion, QuestionFiles } from "./question.interface";
import Question from "./question.model";
import { TCreateQuestionPayload } from "./question.zod";


const OPTION_KEYS = ["a", "b", "c", "d"] as const;

const createQuestion = async (
    payload: TCreateQuestionPayload,
    files?: QuestionFiles
): Promise<IQuestion> => {
    // parse options if it came as JSON string from multipart
    let options: IOption[] = payload.options;
    if (typeof payload.options === "string") {
        try {
            options = JSON.parse(payload.options as unknown as string);
        } catch {
            throw new BadRequestError("options must be a valid JSON array");
        }
    }

    if (!options || options.length < 2) {
        throw new BadRequestError("At least 2 options are required");
    }
    if (payload.correctOptionIndex >= options.length) {
        throw new BadRequestError("correctOptionIndex is out of range");
    }

    // duplicate check — same question text + exam_type + year
    const duplicate = await Question.findOne({
        question_text: payload.questionText.trim(),
        exam_type: payload.examType,
        year: payload.year,
        is_active: true,
    });
    if (duplicate) {
        throw new BadRequestError(
            "A question with the same text, exam type and year already exists"
        );
    }

    // upload question image
    let questionImageUrl: string | undefined;
    if (files?.question_image?.[0]) {
        const uploaded = await uploadToCloudinary(
            files.question_image[0],
            "question_images"
        );
        questionImageUrl = uploaded.secure_url;
    }

    // upload option images and merge into options array
    const finalOptions = await Promise.all(
        options.map(async (option, index) => {
            const key = OPTION_KEYS[index];
            const fileField = `option_${key}_image` as keyof QuestionFiles;
            const file = files?.[fileField]?.[0];

            if (file) {
                const uploaded = await uploadToCloudinary(file, "option_images");
                return { ...option, imageUrl: uploaded.secure_url };
            }
            return option;
        })
    );

    const question = await Question.create({
        ...payload,
        question_text: payload.questionText.trim(),
        question_image_url: questionImageUrl,
        options: finalOptions,
    });

    return question;
};

// const getAllQuestions = async (filter: GetQuestionsFilter) => {
//     const { page = 1, limit = 20, ...rest } = filter;
//     const query: Record<string, unknown> = { is_active: true };

//     if (rest.exam_type) query.exam_type = rest.exam_type;
//     if (rest.year) query.year = Number(rest.year);
//     if (rest.subject_id) query.subject_id = rest.subject_id;
//     if (rest.faculty_id) query.faculty_id = rest.faculty_id;
//     if (rest.department_id) query.department_id = rest.department_id;
//     if (rest.source) query.source = rest.source;
//     if (rest.test_type) query.test_type = rest.test_type;
//     if (rest.access) query.access = rest.access;
//     if (rest.status) query.status = rest.status;
//     if (rest.passage_id) query.passage_id = rest.passage_id;

//     const skip = (page - 1) * limit;
//     const total = await Question.countDocuments(query);
//     const questions = await Question.find(query)
//         .populate("subjectId", "name slug")
//         .populate("facultyId", "name slug")
//         .populate("departmentId", "name slug")
//         .populate("passageId", "passage_code title")
//         .skip(skip)
//         .limit(limit)
//         .sort({ created_at: -1 });

//     return {
//         questions,
//         pagination: {
//             total,
//             page,
//             limit,
//             total_pages: Math.ceil(total / limit),
//         },
//     };
// };

// const getQuestionById = async (id: string): Promise<IQuestion> => {
//     const question = await Question.findById(id)
//         .populate("subject_id", "name slug")
//         .populate("faculty_id", "name slug")
//         .populate("department_id", "name slug")
//         .populate("passage_id", "passage_code title content");

//     if (!question || !question.is_active) {
//         throw new NotFoundError("Question not found");
//     }
//     return question;
// };

// const updateQuestion = async (id: string, payload: Partial<CreateQuestionPayload>): Promise<IQuestion> => {
//     if (payload.options && payload.correct_option_index !== undefined) {
//         if (payload.correct_option_index >= payload.options.length) {
//             throw new BadRequestError("correct_option_index is out of range");
//         }
//     }
//     const question = await Question.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
//     if (!question) {
//         throw new NotFoundError("Question not found");
//     }
//     return question;
// };

// const publishQuestion = async (id: string): Promise<IQuestion> => {
//     const question = await Question.findByIdAndUpdate(
//         id,
//         { status: "published" },
//         { new: true }
//     );
//     if (!question) {
//         throw new NotFoundError("Question not found");
//     }
//     return question;
// };

// const deleteQuestion = async (id: string): Promise<void> => {
//     const question = await Question.findByIdAndUpdate(id, { is_active: false }, { new: true });
//     if (!question) {
//         throw new NotFoundError("Question not found");
//     }
// };

export const questionService = {
    createQuestion,
    // getAllQuestions,
    // getQuestionById,
    // updateQuestion,
    // publishQuestion,
    // deleteQuestion,
};