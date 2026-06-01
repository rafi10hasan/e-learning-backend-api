import mongoose, { Schema } from "mongoose";
import { ACCESS_TYPES, EXAM_TYPES, TEST_TYPES } from "../../../interfaces";
import { QUERSTION_DIFFICULTY, QUERSTION_STATUS, SOURCE_TYPES, } from "./question.constant";
import { IOption, IQuestion } from "./question.interface";



const OptionSchema = new Schema<IOption>({
    text: { type: String, required: true },
    imageUrl: { type: String },
});

const QuestionSchema = new Schema<IQuestion>(
    {
        examType: {
            type: String,
            enum: Object.values(EXAM_TYPES),
            required: true,
        },
        year: { type: Number, required: true },
        subject: { type: Schema.Types.ObjectId, ref: "Subject" },
        faculty: { type: Schema.Types.ObjectId, ref: "Faculty" },
        departments: [{ type: Schema.Types.ObjectId, ref: "Department" }],
        passage: { type: Schema.Types.ObjectId, ref: "Passage" },
        questionText: { type: String, required: true },
        questionImageUrl: { type: String },
        options: { type: [OptionSchema], required: true },
        correctOptionIndex: { type: Number, required: true },
        explanation: { type: String },
        difficultyLevel: {
            type: String,
            enum: Object.values(QUERSTION_DIFFICULTY),
            default: QUERSTION_DIFFICULTY.EASY,
        },
        testIds: [{ type: Schema.Types.ObjectId, ref: "Test" , default:  [] }],
        status: {
            type: String,
            enum: Object.values(QUERSTION_STATUS),
            default: QUERSTION_STATUS.PUBLISHED,
        },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

QuestionSchema.index({ examType: 1, year: 1, subject: 1 });
QuestionSchema.index({ source: 1, status: 1 });
QuestionSchema.index({ faculty: 1, departments: 1 });

const Question = mongoose.model<IQuestion>("Question", QuestionSchema);

export default Question;