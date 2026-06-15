import z from "zod";
import { EXAM_TYPES, TEST_TYPES } from "../../../interfaces";
import { QUERSTION_DIFFICULTY } from "../question/question.constant";

//   examType:         TExamTypes;
//   subjectIds:       string[];
//   facultyId?:       string;
//   departmentIds?:   string[];
//   difficultyLevel?: TQuestionDifficulty;
//   questionCount:    number;

export const quizSessionSchema = z.object({
    
    year: z.coerce.number({ message: "Year is required" }).int({ message: "Year must be an integer" }).min(2000, { message: "Year must be 2000 or later" }).max(new Date().getFullYear(), { message: "Year cannot be in the future" }).optional(),
    subjectIds: z.array(z.string({ message: "Subject ID must be a string" })),
    facultyId: z.string({ message: "Faculty is required for provime" }).optional(),
    departmentIds: z.array(z.string({ message: "Department must be a string" })).optional(),
    questionCount: z.coerce.number({ message: "Question count must be a number" }).int({ message: "Question count must be an integer" }).min(1, { message: "Question count must be at least 1" }),
})


export type TQuizSessionPayload = z.infer<
    typeof quizSessionSchema
>;

const quizSessionValidationZodSchema = {
    quizSessionSchema
};

export default quizSessionValidationZodSchema;