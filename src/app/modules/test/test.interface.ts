import { Types } from "mongoose";
import { TAccessTypes, TExamTypes, TTestTypes } from "../../../interfaces";
import { TTestStatus } from "./test.constant";


export interface ITest extends Document {
    title: string;
    examType: TExamTypes;
    year: number;
    testType: TTestTypes;
    access: TAccessTypes;
    facultyId: Types.ObjectId;
    departmentIds: Types.ObjectId[];
    subjectIds: Types.ObjectId[];
    status: TTestStatus;
    totalQuestions: number;
    totalSubjects:number;
    durationMinutes?: number;
    questionIds: Types.ObjectId[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}