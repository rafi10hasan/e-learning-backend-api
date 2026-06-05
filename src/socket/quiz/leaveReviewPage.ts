import { QuizSession } from "../../app/modules/quiz-session/quiz.session.model";
import { Types } from "mongoose";

 const leaveReviewPage = async (sessionId: string, userId: Types.ObjectId) => {
    const session = await QuizSession.findOne(
      { _id: new Types.ObjectId(sessionId), user: userId },
    ).select("status reviewSeenAt");
 
    if (!session || session.status !== "completed") return;
    if (session.reviewSeenAt) return;
 
    await QuizSession.updateOne(
      { _id: session._id },
      { $set: { reviewSeenAt: new Date() } }
    );
  }

  export default leaveReviewPage;