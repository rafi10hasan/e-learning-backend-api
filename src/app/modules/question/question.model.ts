import mongoose, { Schema } from "mongoose";
import { QUERSTION_STATUS, SOURCE_TYPES,} from "./question.constant";
import { IOption, IQuestion } from "./question.interface";
import { ACCESS_TYPES, EXAM_TYPES, TEST_TYPES } from "../../../interfaces";



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
        subjectId: { type: Schema.Types.ObjectId, ref: "Subject" },
        facultyId: { type: Schema.Types.ObjectId, ref: "Faculty" },
        departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
        passageId: { type: Schema.Types.ObjectId, ref: "Passage" },
        source: {
            type: String,
            enum: Object.values(SOURCE_TYPES),
            required: [true, 'source is required']
        },
        testType: {
            type: String,
            enum: Object.values(TEST_TYPES),
            required: true,
        },
        access: {
            type: String,
            enum: Object.values(ACCESS_TYPES),
            required: [true, 'access type is required']
        },
        questionText: { type: String, required: true },
        questionImageUrl: { type: String },
        options: { type: [OptionSchema], required: true },
        correctOptionIndex: { type: Number, required: true },
        explanation: { type: String },
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

QuestionSchema.index({ examType: 1, year: 1, subjectId: 1 });
QuestionSchema.index({ source: 1, status: 1 });
QuestionSchema.index({ facultyId: 1, departmentId: 1 });

const Question = mongoose.model<IQuestion>("Question", QuestionSchema);

export default Question;