import mongoose, { Schema } from "mongoose";
import { EXAM_TYPES } from "../../../interfaces";
import { IPassage } from "./passage.interface";



const PassageSchema = new Schema<IPassage>(
  {
    passageCode: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    examType: {
      type: String,
      enum: Object.values(EXAM_TYPES),
      required: true,
    },
    passageImageUrl: { type: String, default: null },
    subject: { type: Schema.Types.ObjectId, ref: "Subject" },
    faculty: { type: Schema.Types.ObjectId, ref: "Faculty" },
    departments: [{ type: Schema.Types.ObjectId, ref: "Department" }],
    questionRange: {
      from: { type: Number, required: true },
      to: { type: Number, required: true },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false }
);

const Passage = mongoose.model<IPassage>("Passage", PassageSchema);
export default Passage;