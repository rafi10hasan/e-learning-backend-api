import mongoose, { Schema } from "mongoose";
import { IDepartment } from "./department.interface";

const DepartmentSchema = new Schema<IDepartment>(
    {
        name: { type: String, required: true },
        slug: { type: String, required: true },
        facultyId: { type: Schema.Types.ObjectId, ref: "Faculty" },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true, versionKey: false }
);

const Department = mongoose.model<IDepartment>("Department", DepartmentSchema);
export default Department;