import mongoose, { Document, Schema, Types } from "mongoose";
import { IQuizTemplate, ISubjectFilter } from "./quiz.interface";
import { EXAM_TYPES } from "../../../interfaces";
import { QUIZ_STATUS, QUIZ_TYPES } from "./quiz.constant";



const SubjectFilterSchema = new Schema<ISubjectFilter>(
  {
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    questionCount: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const QuizTemplateSchema = new Schema<IQuizTemplate>(
  {
    title: { type: String, required: true },
    examType: {
      type: String,
      enum: Object.values(EXAM_TYPES),
      required: true,
    },
    year: { type: Number, required: true },
    subjectFilters: { type: [SubjectFilterSchema], required: true },
    electiveQuestionCount: { type: Number, default: 0 },
    totalQuestions: { type: Number, required: true },
    durationMinutes: { type: Number },
    quizTypes: {
      type: String,
      enum: Object.values(QUIZ_TYPES),
    },
    status: {
      type: String,
      enum: Object.values(QUIZ_STATUS),
      default: QUIZ_STATUS.PUBLISHED
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

QuizTemplateSchema.index({ examType: 1, year: 1, type: 1 });
QuizTemplateSchema.index({ status: 1, isActive: 1 });

const QuizTemplate = mongoose.model<IQuizTemplate>("QuizTemplate", QuizTemplateSchema);

export default QuizTemplate;