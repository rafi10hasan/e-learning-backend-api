
import { Schema, Types } from "mongoose";
import { QuizSession } from "./quiz.session.model";
import { IUser } from "../user/user.interface";
import { getRemaining, shuffle, sortWithPassage, splitCountBySubject } from "./quiz.session.utils";
import Question from "../question/question.model";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../errors/request/apiError";
import { TQuizSessionPayload } from "./quiz.session.zod";
import { QUIZ_STATUS } from "./quiz.session.constant";
import Subscription from "../subscription/subscription.model";



// start quiz session
const startQuiz = async (user: IUser, payload: TQuizSessionPayload) => {
  const {
    subjectIds, facultyId,
    departmentIds, difficultyLevel, questionCount, year,
  } = payload;

  const existing = await QuizSession.findOne({
    user:   user._id,
    status: QUIZ_STATUS.IN_PROGRESS,
  });
  if (existing) {
    throw new BadRequestError(
      "You already have an active quiz session. Please complete or wait for it to expire."
    );
  }

  // ── Subscription check ──
  const now          = new Date();
  const subscription = await Subscription.findOne({
    user:    user._id,
    status:  "active",
    endDate: { $gt: now },
  });
  const isPremium = !!subscription;

  // ── Seen questions ──
  const seenAgg = await QuizSession.aggregate([
    {
      $match: {
        user:     user._id,
        examType: user.plan,
        status:   { $in: [QUIZ_STATUS.COMPLETED, QUIZ_STATUS.EXPIRED] },
      },
    },
    { $unwind: "$questionIds" },
    { $group: { _id: null, ids: { $addToSet: "$questionIds" } } },
  ]);
  const seenIds: Types.ObjectId[] = seenAgg[0]?.ids ?? [];

  const counts = splitCountBySubject(questionCount, subjectIds.length);

  // base filter
  const baseFilter: Record<string, unknown> = {
    examType: user.plan,
    status:   "published",
    isActive: true,
    // premium না থাকলে শুধু free questions
    ...(!isPremium && { access: "free" }),
  };

  if (year)              baseFilter.year            = year;
  if (difficultyLevel)   baseFilter.difficultyLevel  = difficultyLevel;
  if (facultyId)         baseFilter.faculty          = new Types.ObjectId(facultyId);
  if (departmentIds?.length) {
    baseFilter.departments = {
      $in: departmentIds.map((id: string) => new Types.ObjectId(id)),
    };
  }

  // ── প্রতিটা subject-এর জন্য আলাদা query ──
  // subject order ঠিক রাখতে subject-wise array তৈরি করো
  const questionsBySubject: {
    subjectId: Types.ObjectId;
    questions: { _id: Types.ObjectId; subject: Types.ObjectId; passage?: Types.ObjectId; order?: number }[];
  }[] = [];

  for (let i = 0; i < subjectIds.length; i++) {
    const subjectId   = new Types.ObjectId(subjectIds[i]);
    const neededCount = counts[i];

    let qs = await Question.aggregate([
      {
        $match: {
          ...baseFilter,
          subject: subjectId,
          _id:     { $nin: seenIds },
        },
      },
      { $sample: { size: neededCount } },
      { $project: { _id: 1, subject: 1, passage: 1, order: 1 } },
    ]);

    // pool শেষ হলে seen reset
    if (qs.length < neededCount) {
      qs = await Question.aggregate([
        {
          $match: {
            ...baseFilter,
            subject: subjectId,
          },
        },
        { $sample: { size: neededCount } },
        { $project: { _id: 1, subject: 1, passage: 1, order: 1 } },
      ]);
    }

    // passage-এর questions serial wise sort করো
    // passage আছে → passage id দিয়ে group, order অনুযায়ী sort
    // passage নেই → আগে রাখো বা পরে — আপনার choice
    const sorted = sortWithPassage(qs);

    questionsBySubject.push({ subjectId, questions: sorted });
  }

  // ── সব subjects একসাথে জোড়া — subject order maintain ──
  // shuffle করবো না — subject অনুযায়ী sorted থাকবে
  const allQuestions = questionsBySubject.flatMap((s) => s.questions);

  if (allQuestions.length === 0) {
    throw new NotFoundError("No questions available for the selected filters.");
  }

  const questionIds     = allQuestions.map((q) => q._id);
  const totalQuestions  = questionIds.length;
  const durationSeconds = totalQuestions * 60;
  const startedAt       = new Date();

  const session = await QuizSession.create({
    user:     user._id,
    examType: user.plan,
    subjectIds:  subjectIds.map((id: string) => new Types.ObjectId(id)),
    ...(facultyId             && { faculty:       new Types.ObjectId(facultyId) }),
    ...(departmentIds?.length && { departmentIds: departmentIds.map((id: string) => new Types.ObjectId(id)) }),
    ...(difficultyLevel       && { difficultyLevel }),
    ...(year                  && { year }),
    questionIds,
    totalQuestions,
    durationSeconds,
    correctCount:   0,
    incorrectCount: 0,
    currentIndex:   0,
    status:         QUIZ_STATUS.IN_PROGRESS,
    startedAt,
  });

  return {
    sessionId:         session._id,
    totalQuestions,
    durationSeconds,
    remainingSeconds:  durationSeconds,
    currentIndex:      0,
    currentQuestionId: questionIds[0],
  };
};

 
// complete quiz session
const completeQuiz = async (sessionId: string, userId: Types.ObjectId) => {
  const session = await QuizSession.findOne({
    _id:  new Types.ObjectId(sessionId),
    user: userId,
  });

  if (!session)                        throw new NotFoundError("Session not found.");
  if (session.status === "completed")  throw new BadRequestError("Quiz already completed.");
  if (session.status === "expired")    throw new BadRequestError("Quiz has expired.");

  await QuizSession.updateOne(
    { _id: session._id },
    { $set: { status: "completed", completedAt: new Date() } }
  );

  const skippedCount =
    session.totalQuestions - session.correctCount - session.incorrectCount;

  const scorePercent = Math.round(
    (session.correctCount / session.totalQuestions) * 100
  );

  // subject-wise breakdown
  const subjectMap = new Map<string, { correct: number; total: number }>();
  for (const attempt of session.attempts) {
    const key = attempt.subjectId.toString();
    if (!subjectMap.has(key)) subjectMap.set(key, { correct: 0, total: 0 });
    const s = subjectMap.get(key)!;
    s.total  += 1;
    s.correct += attempt.isCorrect ? 1 : 0;
  }

  // attemptMap — O(1) lookup
  const attemptMap = new Map(
    session.attempts.map((a) => [a.questionId.toString(), a])
  );

  // question grid — correct/incorrect/unanswered
  const questionResults = session.questionIds.map((qId, index) => {
    const attempt = attemptMap.get(qId.toString());
    return {
      index:  index + 1,
      status: !attempt
                ? "unanswered"
                : attempt.isCorrect ? "correct" : "incorrect",
    };
  });

  return {
    sessionId:       session._id,
    totalQuestions:  session.totalQuestions,
    correctCount:    session.correctCount,
    incorrectCount:  session.incorrectCount,
    skippedCount,
    scorePercent,
    subjectResults:  Object.fromEntries(subjectMap),
    questionResults,  // grid-এর জন্য
  };
};

// get quiz review
const getQuestionReview = async (sessionId: string, userId: Types.ObjectId, index: number) => {
  const session = await QuizSession.findOne({
    _id:  new Types.ObjectId(sessionId),
    user: userId,
  }).select("status questionIds attempts");

  if (!session)                       throw new NotFoundError("Session not found.");
  if (session.status !== "completed") throw new BadRequestError("Quiz not completed.");

  const questionId = session.questionIds[index];
  if (!questionId)                    throw new BadRequestError("Invalid index.");

  const question = await Question.findById(questionId)
    .select("questionText questionImageUrl options correctOptionIndex explanation passage subject");
  if (!question)                      throw new NotFoundError("Question not found.");

  const attempt = session.attempts.find(
    (a) => a.questionId.toString() === questionId.toString()
  );

  return {
    index,
    questionText:        question.questionText,
    questionImage:       question.questionImageUrl ?? null,
    options:             question.options,
    correctOptionIndex:  question.correctOptionIndex,   
    explanation:         question.explanation ?? null,
    selectedOptionIndex: attempt?.selectedOptionIndex ?? null,  
    status:              !attempt
                           ? "unanswered"
                           : attempt.isCorrect ? "correct" : "incorrect",
  };
}

// get quiz session status
const getSessionStatus = async (sessionId: string, userId: Types.ObjectId) => {
    const session = await QuizSession.findOne({
      _id:  new Types.ObjectId(sessionId),
      user: userId,
    }).select("-attempts");
 
    if (!session) throw new NotFoundError("Session not found.");
 
    return {
      status:           session.status,
      remainingSeconds: Math.floor(getRemaining(session)),
      currentIndex:     session.currentIndex,
      totalQuestions:   session.totalQuestions,
      correctCount:     session.correctCount,
      incorrectCount:   session.incorrectCount,
    };
  }


export const quizSessionService = {
    startQuiz,
    completeQuiz,
    getQuestionReview,
    getSessionStatus
};