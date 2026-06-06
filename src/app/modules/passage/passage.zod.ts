import z from "zod";
import { EXAM_TYPES } from "../../../interfaces";


export const passageSchema = z.object({

    passageCode: z.string({ message: "Passage code is required" }),
    title: z.string({ message: "Title is required" }),
    content: z.string({ message: "Content is required" }),
    questionRange: z.object({
        from: z.number({ message: "Question range 'from' must be a number" }).int({ message: "Question range 'from' must be an integer" }).min(1, { message: "Question range 'from' must be at least 1" }),
        to: z.number({ message: "Question range 'to' must be a number" }).int({ message: "Question range 'to' must be an integer" }).min(1, { message: "Question range 'to' must be at least 1" }),
    }),
})

export type TCreatePassagePayload = z.infer<
    typeof passageSchema
>;

const passageValidationZodSchema = {
    passageSchema
};

export default passageValidationZodSchema;

/*

export interface IPassage extends Document {
  passageCode: string;
  title: string;
  content: string;
  examType: TExamTypes;
  passageImageUrl?: string;
  questionRange: IQuestionRange;
  subject: Types.ObjectId | null;
  faculty: Types.ObjectId | null;
  departments: Types.ObjectId[] | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

*/