
import { Types } from "mongoose";
import { BadRequestError, NotFoundError } from "../../errors/request/apiError";
import Question from "../question/question.model";
import Subscription from "../subscription/subscription.model";
import { IUser } from "../user/user.interface";
import { QUIZ_STATUS } from "./quiz.session.constant";
import { QuizSession } from "./quiz.session.model";
import { getRemaining, sortWithPassage, splitCountBySubject } from "./quiz.session.utils";
import { TQuizSessionPayload } from "./quiz.session.zod";



// start quiz session
const startQuiz = async (user: IUser, payload: TQuizSessionPayload) => {
  const {
    subjectIds, facultyId,
    departmentIds, difficultyLevel, questionCount, year,
  } = payload;

  // একটাই in_progress session থাকতে পারবে
  const existing = await QuizSession.findOne({
    user: user._id,
    status: QUIZ_STATUS.IN_PROGRESS,
  });
  if (existing) {
    throw new BadRequestError(
      "You already have an active quiz session. Please complete or wait for it to expire."
    );
  }

  // ── Subscription check ──
  const now = new Date();
  const subscription = await Subscription.findOne({
    user: user._id,
    status: "active",
    endDate: { $gt: now },
  });
  const isPremium = !!subscription;

  // ── Seen questions — completed + expired থেকে ──
  const seenAgg = await QuizSession.aggregate([
    {
      $match: {
        user: user._id,
        examType: user.plan,
        status: { $in: [QUIZ_STATUS.COMPLETED, QUIZ_STATUS.EXPIRED] },
      },
    },
    { $unwind: "$questionIds" },
    { $group: { _id: null, ids: { $addToSet: "$questionIds" } } },
  ]);
  const seenIds: Types.ObjectId[] = seenAgg[0]?.ids ?? [];

  // ── Subject-wise split: 50q, 3 subjects → [17, 17, 16] ──
  const counts = splitCountBySubject(questionCount, subjectIds.length);

  // base filter — সব subjects-এর জন্য shared
  const baseFilter: Record<string, unknown> = {
    examType: user.plan,
    status: "published",
    isActive: true,
  };

  // premium না থাকলে শুধু free questions
  if (!isPremium) baseFilter.access = "free";
  if (year) baseFilter.year = Number(year);
  if (difficultyLevel) baseFilter.difficultyLevel = difficultyLevel;
  if (facultyId) baseFilter.faculty = new Types.ObjectId(facultyId);
  if (departmentIds?.length) {
    baseFilter.departments = {
      $in: departmentIds.map((id: string) => new Types.ObjectId(id)),
    };
  }

  // ── প্রতিটা subject-এর জন্য আলাদা query ──
  const allQuestions: {
    _id: Types.ObjectId;
    subject: Types.ObjectId;
    passage?: Types.ObjectId;
    order?: number;
  }[] = [];

  for (let i = 0; i < subjectIds.length; i++) {
    const subjectId = new Types.ObjectId(subjectIds[i]);
    const neededCount = counts[i];

    // প্রথমে seen বাদ দিয়ে চেষ্টা
    let qs = await Question.aggregate([
      {
        $match: {
          ...baseFilter,
          subject: subjectId,
          _id: { $nin: seenIds },
        },
      },
      { $sample: { size: neededCount } },
      { $project: { _id: 1, subject: 1, passage: 1, order: 1 } },
    ]);

    // pool শেষ হলে — seen reset, full pool থেকে নাও
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

    // passage questions serial wise sort
    const sorted = sortWithPassage(qs);
    allQuestions.push(...sorted);
  }

  if (allQuestions.length === 0) {
    throw new NotFoundError("No questions available for the selected filters.");
  }

  const questionIds = allQuestions.map((q) => q._id);
  const totalQuestions = questionIds.length;
  const durationSeconds = totalQuestions * 60; // 1 min per question
  const startedAt = new Date();

  // ── questionSubjectMap ──
  // completeQuiz-এ subject-wise grid-এর জন্য
  // unanswered questions-এরও subject জানা যাবে
  const questionSubjectMap = allQuestions.map((q) => ({
    questionId: q._id,
    subjectId: q.subject,
  }));

  // ── passageQuestionMap ──
  // getQuestion-এ dynamic questionRange calculate করতে লাগবে
  const passageGroupMap = new Map<string, Types.ObjectId[]>();
  for (const q of allQuestions) {
    if (q.passage) {
      const key = q.passage.toString();
      if (!passageGroupMap.has(key)) passageGroupMap.set(key, []);
      passageGroupMap.get(key)!.push(q._id);
    }
  }
  const passageQuestionMap = [...passageGroupMap.entries()].map(
    ([passageId, qIds]) => ({
      passageId: new Types.ObjectId(passageId),
      questionIds: qIds,
    })
  );

  const session = await QuizSession.create({
    user: user._id,
    examType: user.plan,
    subjectIds: subjectIds.map((id: string) => new Types.ObjectId(id)),
    ...(facultyId && { faculty: new Types.ObjectId(facultyId) }),
    ...(departmentIds?.length && { departmentIds: departmentIds.map((id: string) => new Types.ObjectId(id)) }),
    ...(difficultyLevel && { difficultyLevel }),
    ...(year && { year: Number(year) }),
    questionIds,
    totalQuestions,
    durationSeconds,
    correctCount: 0,
    incorrectCount: 0,
    currentIndex: 0,
    markedQuestionIds: [],
    questionSubjectMap,
    passageQuestionMap,
    status: QUIZ_STATUS.IN_PROGRESS,
    startedAt,
  });

  return {
    sessionId: session._id,
    totalQuestions,
    durationSeconds,
    remainingSeconds: durationSeconds,
    currentIndex: 0,
    currentQuestionId: questionIds[0],
  };
};

// submit single answer

// complete quiz session
const completeQuiz = async (sessionId: string, userId: Types.ObjectId) => {
  const session = await QuizSession.findOne({
    _id: new Types.ObjectId(sessionId),
    user: userId,
  }).populate("questionSubjectMap.subjectId", "name");

  if (!session) throw new NotFoundError("Session not found.");
  if (session.status === "completed") throw new BadRequestError("Quiz already completed.");
  if (session.status === "expired") throw new BadRequestError("Quiz has expired.");

  await QuizSession.updateOne(
    { _id: session._id },
    { $set: { status: "completed", completedAt: new Date() } }
  );

  const skippedCount =
    session.totalQuestions - session.correctCount - session.incorrectCount;

  const scorePercent = Math.round(
    (session.correctCount / session.totalQuestions) * 100
  );

  // ── attempt map — O(1) lookup ──
  const attemptMap = new Map(
    session.attempts.map((a) => [a.questionId.toString(), a])
  );

  // ── questionId → subjectId lookup ──
  const questionSubjectLookup = new Map(
    session.questionSubjectMap.map((q) => [
      q.questionId.toString(),
      q.subjectId,
    ])
  );

  // ── subject-wise breakdown — "Results by subject" ──
  // subjectId → { name, correct, total }
  const subjectResultMap = new Map<
    string,
    { subjectId: Types.ObjectId; name: string; correct: number; total: number }
  >();

  for (const q of session.questionSubjectMap) {
    const subjectDoc = q.subjectId as any;
    const key = (subjectDoc._id ?? subjectDoc).toString();
    const subjectName = subjectDoc.name ?? "";

    if (!subjectResultMap.has(key)) {
      subjectResultMap.set(key, {
        subjectId: subjectDoc._id ?? subjectDoc,
        name: subjectName,
        correct: 0,
        total: 0,
      });
    }

    console.log({ subjectResultMap })

    const attempt = attemptMap.get(q.questionId.toString());
    const entry = subjectResultMap.get(key)!;
    entry.total += 1;
    if (attempt?.isCorrect) entry.correct += 1;
  }

  // ── questionResults — grid-এর জন্য ──
  // correct/incorrect/unanswered + subjectId (frontend group করবে)
  const questionResults = session.questionIds.map((qId, index) => {
    const attempt = attemptMap.get(qId.toString());
    const subjectId = questionSubjectLookup.get(qId.toString()) ?? null;

    return {
      index: index + 1,
      questionId: qId,
      subjectId,
      status: !attempt
        ? "unanswered"
        : attempt.isCorrect ? "correct" : "incorrect",
    };
  });
  console.log({ questionResults })
  return {
    sessionId: session._id,
    totalQuestions: session.totalQuestions,
    correctCount: session.correctCount,
    incorrectCount: session.incorrectCount,
    skippedCount,
    scorePercent,
    subjectResults: [...subjectResultMap.values()],
    questionResults,
  };
};

// get quiz review
const getQuestionReview = async (sessionId: string, userId: Types.ObjectId, index: number) => {
  const session = await QuizSession.findOne({
    _id: new Types.ObjectId(sessionId),
    user: userId,
  }).select("status questionIds attempts");

  console.log({ index, sessionId })
  if (!session) throw new NotFoundError("Session not found.");
  if (session.status !== "completed") throw new BadRequestError("Quiz not completed.");

  const questionId = session.questionIds[index - 1];
  if (!questionId) throw new BadRequestError("Invalid index.");

  const question = await Question.findById(questionId)
    .select("questionText questionImageUrl options correctOptionIndex explanation passage subject");
  if (!question) throw new NotFoundError("Question not found.");

  const attempt = session.attempts.find(
    (a) => a.questionId.toString() === questionId.toString()
  );

  console.log({ question, attempt })
  return {
    index,
    questionText: question.questionText,
    questionImage: question.questionImageUrl ?? null,
    options: question.options,
    correctOptionIndex: question.correctOptionIndex,
    explanation: question.explanation ?? null,
    selectedOptionIndex: attempt?.selectedOptionIndex ?? null,
    status: !attempt
      ? "unanswered"
      : attempt.isCorrect ? "correct" : "incorrect",
  };
}

// get quiz session status
const getSessionStatus = async (sessionId: string, userId: Types.ObjectId) => {
  const session = await QuizSession.findOne({
    _id: new Types.ObjectId(sessionId),
    user: userId,
  }).select("-attempts");

  if (!session) throw new NotFoundError("Session not found.");

  return {
    status: session.status,
    remainingSeconds: Math.floor(getRemaining(session)),
    currentIndex: session.currentIndex,
    totalQuestions: session.totalQuestions,
    correctCount: session.correctCount,
    incorrectCount: session.incorrectCount,
  };
}

// get quiz map 

const getQuizMap = async (sessionId: string, userId: Types.ObjectId) => {
  const session = await QuizSession.findOne({
    _id: new Types.ObjectId(sessionId),
    user: userId,
  }).select("status questionIds attempts markedQuestionIds currentIndex totalQuestions");

  if (!session) throw new NotFoundError("Session not found.");
  if (session.status !== "in_progress") throw new BadRequestError("Quiz is not in progress.");

  const answeredMap = new Map(
    session.attempts.map((a) => [a.questionId.toString(), a])
  );
  const markedSet = new Set(
    session.markedQuestionIds.map((id) => id.toString())
  );

  const questions = session.questionIds.map((qId, index) => {
    const qIdStr = qId.toString();
    const attempt = answeredMap.get(qIdStr);
    const isMarked = markedSet.has(qIdStr);
    const isCurrent = index === session.currentIndex;

    // status priority: current > marked > answered > unanswered
    let status: "current" | "marked" | "answered" | "unanswered";
    if (isCurrent) status = "current";
    else if (isMarked) status = "marked";
    else if (attempt) status = "answered";
    else status = "unanswered";

    return {
      index,
      questionId: qId,
      status,
      selectedOptionIndex: attempt?.selectedOptionIndex ?? null,
    };
  });

  return {
    totalQuestions: session.totalQuestions,
    answeredCount: session.attempts.length,
    markedCount: session.markedQuestionIds.length,
    unansweredCount: session.totalQuestions - session.attempts.length,
    questions,
  };
}


export const quizSessionService = {
  startQuiz,
  completeQuiz,
  getQuestionReview,
  getSessionStatus,
  getQuizMap
};
