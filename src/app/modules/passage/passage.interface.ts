import { Document, Types } from "mongoose";
import { TExamTypes } from "../../../interfaces";


export interface IPassage extends Document {
  passage_code: string;
  title: string;
  content: string;
  examType: TExamTypes;
  year: number;
  subjectId?: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}