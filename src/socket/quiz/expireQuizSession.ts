import { Types } from "mongoose";
import { QuizSession } from "../../app/modules/quiz-session/quiz.session.model";


  const expireSession = async (sessionId: string, userId: Types.ObjectId) => {
    await QuizSession.updateOne(
      { _id: new Types.ObjectId(sessionId), user: userId, status: "in_progress" },
      { $set: { status: "expired", completedAt: new Date() } }
    );
  }

 export default expireSession;
