import { Document, Types } from "mongoose";

export interface IDepartment extends Document {
    name: string;
    nameInEnglish: string;
    nameInAlbanian: string;
    slug: string;
    examType: 'provime'
    subjects: Types.ObjectId[];
    faculty: Types.ObjectId;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}