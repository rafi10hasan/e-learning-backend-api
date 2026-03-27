import mongoose, { Schema } from "mongoose";
import { IFaculty } from "./faculty.interface";


const FacultySchema = new Schema<IFaculty>(
    {
        name: { type: String, required: true },
        slug: { type: String, required: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true, versionKey: false }
);

const Faculty = mongoose.model<IFaculty>("Faculty", FacultySchema);
export default Faculty;