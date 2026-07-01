import { Types } from "mongoose";
import { BadRequestError, NotFoundError } from "../../app/errors/request/apiError";
import { QuizSession } from "../../app/modules/quiz-session/quiz.session.model";


const toggleMarkQuestion = async(
    sessionId:  string,
    userId:     Types.ObjectId,
    questionId: string
  ) => {
    const session = await QuizSession.findOne({
      _id:  new Types.ObjectId(sessionId),
      user: userId,
    }).select("status markedQuestionIds");
 
    if (!session)                         throw new NotFoundError("Session not found.");
    if (session.status !== "in_progress") throw new BadRequestError("Quiz is not in progress.");
 
    const qObjectId = new Types.ObjectId(questionId);

    console.log(`Toggling mark for question: ${questionId}`);

    const isMarked  = session.markedQuestionIds.some(
      (id) => id.toString() === questionId
    );
    
    console.log(`Current marked status: ${isMarked ? "marked" : "unmarked"}`);

    if (isMarked) {
      // unmark — pull
      await QuizSession.updateOne(
        { _id: session._id },
        { $pull: { markedQuestionIds: qObjectId } }
      );
    } else {
      // mark — push
      await QuizSession.updateOne(
        { _id: session._id },
        { $addToSet: { markedQuestionIds: qObjectId } }
      );
    }
 
    console.log(`New marked status: ${!isMarked ? "marked" : "unmarked"}`);
    return { questionId, isMarked: !isMarked };
  }

  export default toggleMarkQuestion;