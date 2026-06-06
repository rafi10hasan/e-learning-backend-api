import { Document, Types } from "mongoose";
import { TExamTypes } from "../../../interfaces";


export interface IQuestionRange {
  from: number;
  to: number;
}

export interface PassageFiles {
    passage_image?: Express.Multer.File[];
}

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