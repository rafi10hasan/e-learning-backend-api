import { Types } from "mongoose";
import { TAccessTypes, TExamTypes, TTestTypes } from "../../../interfaces";
import { TTestStatus } from "./test.constant";


export interface ITest extends Document {
    title: string;
    examType: TExamTypes;
    year: number;
    structureType: string;
    departmentId?: Types.ObjectId;
    testType: TTestTypes;
    access: TAccessTypes;
    status: TTestStatus;
    totalQuestions: number;
    durationMinutes?: number;
    questionIds: Types.ObjectId[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}