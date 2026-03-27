import { Document } from "mongoose";

export interface ISubject extends Document {
    name: string;
    slug: string;
    examType: string;
    isElective: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}