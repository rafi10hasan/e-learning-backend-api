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
  passageImageUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}