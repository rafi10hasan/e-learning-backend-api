import mongoose from "mongoose";



const quizAttemptSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  
  totalDurationInMinutes: { type: Number, default: 60 },
  secondsElapsedSoFar: { type: Number, default: 0 },
  
  isCompleted: { type: Boolean, default: false },
  startedAt: { type: Date, default: Date.now }
},
 {
    timestamps: true,
    versionKey: false,
 }
);

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);