import { Document, Types } from "mongoose";
import { TExamTypes } from "../../../interfaces";


export interface IPassage extends Document {
  passage_code: string;
  title: string;
  content: string;
  examType: TExamTypes;
  passageImageUrl?: string;
  subjectId: Types.ObjectId | null;
  facultyId: Types.ObjectId | null;
  departmentId: Types.ObjectId | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}