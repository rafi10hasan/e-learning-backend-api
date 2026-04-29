import mongoose, { Schema } from "mongoose";
import { IFaculty } from "./faculty.interface";
import { EXAM_TYPES } from "../../../interfaces";


const facultySchema = new Schema<IFaculty>(
    {
        name: { type: String, required: true },
        slug: { type: String, required: true },
        examType: {
            type: String,
            default: EXAM_TYPES.ENTRANCE_EXAM
        },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true, versionKey: false }
);

const Faculty = mongoose.model<IFaculty>("Faculty", facultySchema);
export default Faculty;