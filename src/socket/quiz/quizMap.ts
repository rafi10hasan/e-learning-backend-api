import { Types } from "mongoose";
import { QuizSession } from "../../app/modules/quiz-session/quiz.session.model";
import { BadRequestError, NotFoundError } from "../../app/errors/request/apiError";


const getQuizMap = async (sessionId: string, userId: Types.ObjectId) => {
    const session = await QuizSession.findOne({
      _id:  new Types.ObjectId(sessionId),
      user: userId,
    }).select("status questionIds attempts markedQuestionIds currentIndex totalQuestions");
 
    if (!session)                         throw new NotFoundError("Session not found.");
    if (session.status !== "in_progress") throw new BadRequestError("Quiz is not in progress.");
 
    const answeredMap = new Map(
      session.attempts.map((a) => [a.questionId.toString(), a])
    );
    const markedSet = new Set(
      session.markedQuestionIds.map((id) => id.toString())
    );
 
    const questions = session.questionIds.map((qId, index) => {
      const qIdStr    = qId.toString();
      const attempt   = answeredMap.get(qIdStr);
      const isMarked  = markedSet.has(qIdStr);
      const isCurrent = index === session.currentIndex;
 
      // status priority: current > marked > answered > unanswered
      let status: "current" | "marked" | "answered" | "unanswered";
      if (isCurrent)    status = "current";
      else if (isMarked) status = "marked";
      else if (attempt)  status = "answered";
      else               status = "unanswered";
 
      return {
        index,
        questionId: qId,
        status,
        selectedOptionIndex: attempt?.selectedOptionIndex ?? null,
      };
    });
 
    return {
      totalQuestions:  session.totalQuestions,
      answeredCount:   session.attempts.length,
      markedCount:     session.markedQuestionIds.length,
      unansweredCount: session.totalQuestions - session.attempts.length,
      questions,
    };
  }
 

  export default getQuizMap;