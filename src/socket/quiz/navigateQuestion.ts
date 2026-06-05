import { Types } from "mongoose";
import { BadRequestError, NotFoundError } from "../../app/errors/request/apiError";
import { QuizSession } from "../../app/modules/quiz-session/quiz.session.model";
import getQuestion from "./getQuestion";


const navigateQuestion = async(
    sessionId: string,
    userId:    Types.ObjectId,
    index:     number
  ) =>{
    const session = await QuizSession.findOne({
      _id:  new Types.ObjectId(sessionId),
      user: userId,
    }).select("status totalQuestions questionIds");
 
    if (!session)                         throw new NotFoundError("Session not found.");
    if (session.status !== "in_progress") throw new BadRequestError("Quiz is not in progress.");
    if (index < 0 || index >= session.totalQuestions) {
      throw new BadRequestError("Invalid question index.");
    }
 
    // currentIndex update করো
    await QuizSession.updateOne(
      { _id: session._id },
      { $set: { currentIndex: index } }
    );
 
    // question data return করো
    return getQuestion(sessionId, userId, index);
  }

  export default navigateQuestion;