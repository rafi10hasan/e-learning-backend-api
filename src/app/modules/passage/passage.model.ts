import mongoose, { Schema } from "mongoose";
import { EXAM_TYPES } from "../../../interfaces";
import { IPassage } from "./passage.interface";



const PassageSchema = new Schema<IPassage>(
  {
    passageCode: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    passageImageUrl: { type: String, default: null },
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