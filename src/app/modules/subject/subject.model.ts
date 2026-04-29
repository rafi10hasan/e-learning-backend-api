import mongoose, { Schema } from "mongoose";
import { EXAM_TYPES } from "../../../interfaces";
import { ISubject } from "./subject.interface";


const subjectSchema = new Schema<ISubject>(
    {
        name: { type: String, required: true },
        slug: { type: String, required: true },
        examType: {
            type: String,
            enum: [EXAM_TYPES.SEMIMATURE,EXAM_TYPES.MATURE],
            required: true,
        },
        isElective: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true, versionKey: false }
);

const Subject = mongoose.model<ISubject>("Subject", subjectSchema);
export default Subject;