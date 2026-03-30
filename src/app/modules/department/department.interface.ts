import { Document, Types } from "mongoose";

export interface IDepartment extends Document {
    name: string;
    slug: string;
    examType: 'provime'
    facultyId: Types.ObjectId;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}