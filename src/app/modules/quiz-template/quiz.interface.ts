import { Types } from "mongoose";
import { TQuizTypes } from "./quiz.constant";
import { TExamTypes } from "../../../interfaces";

export interface ISubjectFilter {
  subjectId: Types.ObjectId;
  questionCount: number;
}

export interface IQuizTemplate extends Document {
  title: string;
  examType: TExamTypes;
  year: number;
  subjectFilters: ISubjectFilter[];
  electiveQuestionCount: number;
  totalQuestions: number;
  durationMinutes?: number;
  quizTypes: TQuizTypes;
  status: "draft" | "published";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}