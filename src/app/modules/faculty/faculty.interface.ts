import { Document } from "mongoose";

export interface IFaculty extends Document {
    name: string;
    slug: string;
    examType: "provime"
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}