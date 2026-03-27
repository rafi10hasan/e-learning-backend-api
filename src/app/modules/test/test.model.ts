import mongoose, { Document, Schema, Types } from "mongoose";
import { ITest } from "./test.interface";
import { ACCESS_TYPES, EXAM_TYPES, TEST_TYPES } from "../../../interfaces";
import { TEST_STATUS } from "./test.constant";



const TestSchema = new Schema<ITest>(
  {
    title: { type: String, required: true },
    examType: {
      type: String,
      enum: Object.values(EXAM_TYPES),
      required: true,
    },
    year: { type: Number, required: true },
    structureType: { type: String, required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    testType: {
      type: String,
      enum: Object.values(TEST_TYPES),
      required: true,
    },
    access: {
      type: String,
      enum: Object.values(ACCESS_TYPES),
      default: "free",
    },
    status: {
      type: String,
      enum: Object.values(TEST_STATUS),
      default: "draft",
    },
    totalQuestions: { type: Number, default: 0 },
    durationMinutes: { type: Number },
    questionIds: [{ type: Schema.Types.ObjectId, ref: "Question" }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

TestSchema.index({ examType: 1, year: 1, testType: 1 });
TestSchema.index({ status: 1, isActive: 1 });

export default mongoose.model<ITest>("Test", TestSchema);