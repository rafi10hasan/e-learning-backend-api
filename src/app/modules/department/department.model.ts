import mongoose, { Schema } from "mongoose";
import { EXAM_TYPES } from "../../../interfaces";
import { IDepartment } from "./department.interface";



const departmentSchema = new Schema<IDepartment>(
    {
        name: { type: String, required: true },
        facultyId: { type: Schema.Types.ObjectId, ref: "Faculty", required: true },
        examType: {
            type: String,
            default: EXAM_TYPES.ENTRANCE_EXAM
        },
        slug: { type: String, required: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true, versionKey: false }
);

const Department = mongoose.model<IDepartment>("Department", departmentSchema);
export default Department;