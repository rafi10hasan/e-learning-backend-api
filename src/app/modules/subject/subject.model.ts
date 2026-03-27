import mongoose, { Schema } from "mongoose";
import { EXAM_TYPES } from "../../../interfaces";
import { ISubject } from "./subject.interface";


const SubjectSchema = new Schema<ISubject>(
    {
        name: { type: String, required: true },
        slug: { type: String, required: true },
        examType: {
            type: String,
            enum: Object.values(EXAM_TYPES),
            required: true,
        },
        isElective: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true, versionKey: false }
);

const Subject = mongoose.model<ISubject>("Subject", SubjectSchema);
export default Subject;