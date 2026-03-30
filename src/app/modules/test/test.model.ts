import mongoose, { Schema } from "mongoose";
import { ACCESS_TYPES, EXAM_TYPES, TEST_TYPES } from "../../../interfaces";
import { TEST_STATUS } from "./test.constant";
import { ITest } from "./test.interface";


const TestSchema = new Schema<ITest>(
  {
    title: { type: String, required: true },
    examType: {
      type: String,
      enum: Object.values(EXAM_TYPES),
      required: true,
    },
    facultyId: { type: Schema.Types.ObjectId, ref: "Subject", required:false },
    year: { type: Number, required: true },
    departmentIds: [{ type: Schema.Types.ObjectId, ref: "Department", required: false }],
    subjectIds: [{ type: Schema.Types.ObjectId, ref: "Subject", required: false }],
    testType: {
      type: String,
      enum: Object.values(TEST_TYPES),
      required: true,

    },
    access: {
      type: String,
      enum: Object.values(ACCESS_TYPES),
      required: true
    },
    status: {
      type: String,
      enum: Object.values(TEST_STATUS),
      default: TEST_STATUS.PUBLISHED,
    },
    totalQuestions: { type: Number, default: 0 },
    totalSubjects: { type: Number, default: 0 },
    questionIds: [{ type: Schema.Types.ObjectId, ref: "Question" }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

TestSchema.index({ examType: 1, year: 1, testType: 1 });
TestSchema.index({ status: 1, isActive: 1 });

const Test = mongoose.model<ITest>("Test", TestSchema);
export default Test;