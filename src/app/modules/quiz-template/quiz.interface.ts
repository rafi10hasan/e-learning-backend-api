import { Types } from "mongoose";
import { TExamTypes } from "../../../interfaces";
import { TQuizTypes } from "./quiz.constant";

export interface ISubjectFilter {
  subjects: Types.ObjectId;
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