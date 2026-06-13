import z from "zod";
import { EXAM_TYPES } from "../../../interfaces";


export const passageSchema = z.object({

    passageCode: z.string({ message: "Passage code is required" }),
    title: z.string({ message: "Title is required" }),
    content: z.string({ message: "Content is required" }),
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