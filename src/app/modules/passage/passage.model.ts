import mongoose, { Schema} from "mongoose";
import { IPassage } from "./passage.interface";



const PassageSchema = new Schema<IPassage>(
  {
    passage_code: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    examType: {
      type: String,
      enum: ["semi_matura", "matura", "provime"],
      required: true,
    },
    year: { type: Number, required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const Passage = mongoose.model<IPassage>("Passage", PassageSchema);
export default Passage;