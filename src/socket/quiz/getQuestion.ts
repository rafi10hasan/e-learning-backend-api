import { Types } from "mongoose";
import { QuizSession } from "../../app/modules/quiz-session/quiz.session.model";
import { BadRequestError, NotFoundError } from "../../app/errors/request/apiError";
import Question from "../../app/modules/question/question.model";



const getQuestion = async (sessionId: string, userId: Types.ObjectId, index: number) => {
  const session = await QuizSession.findOne({
    _id:  new Types.ObjectId(sessionId),
    user: userId,
  }).select("status questionIds totalQuestions attempts markedQuestionIds");

  if (!session)                         throw new NotFoundError("Session not found.");
  if (session.status !== "in_progress") throw new BadRequestError("Quiz is not in progress.");
  if (index >= session.totalQuestions)  throw new BadRequestError("No more questions.");

  const questionId = session.questionIds[index];

  const question = await Question.findById(questionId)
    .select("-correctOptionIndex -explanation -status -isActive -createdAt -updatedAt")
    .populate("passage", "title passageImageUrl questionRange"); // passage populate
  if (!question) throw new NotFoundError("Question not found.");

  const existingAttempt = session.attempts.find(
    (a) => a.questionId.toString() === questionId.toString()
  );

  const isMarked = session.markedQuestionIds.some(
    (id) => id.toString() === questionId.toString()
  );

  // ── Previous question ──
  // index > 0 হলে আগের question-এর data পাঠাও
  let previousQuestion = null;
  if (index > 0) {
    const prevQuestionId = session.questionIds[index - 1];
    const prevAttempt    = session.attempts.find(
      (a) => a.questionId.toString() === prevQuestionId.toString()
    );
    previousQuestion = {
      index:               index - 1,
      questionId:          prevQuestionId,
      selectedOptionIndex: prevAttempt?.selectedOptionIndex ?? null,
    };
  }

  return {
    index,
    totalQuestions:      session.totalQuestions,
    questionId:          question._id,
    questionText:        question.questionText,
    questionImage:       question.questionImageUrl ?? null,
    options:             question.options,
    passage:             question.passage ?? null, // { title, passageImageUrl, questionRange }
    selectedOptionIndex: existingAttempt?.selectedOptionIndex ?? null,
    isMarked,
    previousQuestion,   // null হলে প্রথম question
  };
};
 

  export default getQuestion;