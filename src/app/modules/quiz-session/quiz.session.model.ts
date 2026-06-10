import { Schema, model } from "mongoose";
import { IQuestionAttempt, IQuizSession } from "./quiz.session.interface";


const QuestionAttemptSchema = new Schema<IQuestionAttempt>(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    selectedOptionIndex: {
      type: Number,
      required: true,
    },
    isCorrect: {
      type: Boolean,
      required: true,
    },
    answeredAt: {
      type: Date,
      required: true,
    },
  },
  { _id: false }
);

const QuizSessionSchema = new Schema<IQuizSession>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    examType: {
      type: String,
      required: true,
    },
    subjectIds: {
      type: [Schema.Types.ObjectId],
      ref: "Subject",
      required: true,
    },
    faculty: {
      type: Schema.Types.ObjectId,
      ref: "Faculty",
    },
    departmentIds: {
      type: [Schema.Types.ObjectId],
      ref: "Department",
    },
    difficultyLevel: {
      type: String,
    },
    questionIds: {
      type: [Schema.Types.ObjectId],
      ref: "Question",
      required: true,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    attempts: {
      type: [QuestionAttemptSchema],
      default: [],
    },

    questionSubjectMap: {
      type: [{
        questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
        subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
      }],
      default: [],
    },
    passageQuestionMap: {
      type: [{
        passageId: { type: Schema.Types.ObjectId, ref: 'Passage', required: true },
        questionIds: { type: [Schema.Types.ObjectId], ref: 'Question', default: [] },
      }],
      default: [],
    },
    markedQuestionIds: { type: [Schema.Types.ObjectId], ref: 'Question', default: [] },

    durationSeconds: {
      type: Number,
      required: true,
    },

    correctCount: {
      type: Number,
      default: 0,
    },
    incorrectCount: {
      type: Number,
      default: 0,
    },
    currentIndex: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["in_progress", "completed"],
      default: "in_progress",
    },
    reviewSeenAt: {
      type: Date,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes
QuizSessionSchema.index({ user: 1, status: 1 });
QuizSessionSchema.index({ user: 1, examType: 1 });
QuizSessionSchema.index({ questionIds: 1 });
QuizSessionSchema.index({ questionId: 1 });
QuizSessionSchema.index({ subjectId: 1 });

export const QuizSession = model<IQuizSession>("QuizSession", QuizSessionSchema);