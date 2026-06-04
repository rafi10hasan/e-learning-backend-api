
import { Schema, Types } from "mongoose";
import { QuizSession } from "./quiz.session.model";
import { IUser } from "../user/user.interface";
import { shuffle, splitCountBySubject } from "./quiz.session.utils";
import Question from "../question/question.model";
import { BadRequestError, NotFoundError } from "../../errors/request/apiError";
import { TQuizSessionPayload } from "./quiz.session.zod";
import { QUIZ_STATUS } from "./quiz.session.constant";

// start quiz session
const startQuiz = async (user:IUser, payload: TQuizSessionPayload) => {
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
    

    const seenAgg = await QuizSession.aggregate([
      {
        $match: {
          user:     user._id,
          examType: user.plan,
          status:   { $in: [QUIZ_STATUS.IN_PROGRESS, QUIZ_STATUS.EXPIRED] },
        },
      },
      { $unwind: "$questionIds" },
      { $group: { _id: null, ids: { $addToSet: "$questionIds" } } },
    ]);
    const seenIds: Types.ObjectId[] = seenAgg[0]?.ids ?? [];
 
    // ── Subject-wise split: 50q, 3 subjects → [17, 17, 16] ──
    const counts = splitCountBySubject(questionCount, subjectIds.length);
 
    // base filter 
    const baseFilter: Record<string, unknown> = {
      examType:user.plan,
      status:   "published",
      isActive: true,
    };
 
    // optional filters
    if (year)              baseFilter.year           = year;
    if (difficultyLevel)   baseFilter.difficultyLevel = difficultyLevel;
    if (facultyId)         baseFilter.faculty         = new Schema.Types.ObjectId(facultyId);
    if (departmentIds?.length) {
      baseFilter.departments = {
        $in: departmentIds.map((id:any) => new Schema.Types.ObjectId(id)),
      };
    }
 
    // ── প্রতিটা subject-এর জন্য আলাদা query ──
    const allQuestions: { _id: Types.ObjectId; subject: Types.ObjectId }[] = [];
 
    for (let i = 0; i < subjectIds.length; i++) {
      const subjectId   = new Schema.Types.ObjectId(subjectIds[i]);
      const neededCount = counts[i];
 
      // প্রথমে seen বাদ দিয়ে চেষ্টা
      let qs = await Question.aggregate([
        {
          $match: {
            ...baseFilter,
            subject: subjectId,
            _id:     { $nin: seenIds },   // seen exclude
          },
        },
        { $sample: { size: neededCount } },
        { $project: { _id: 1, subject: 1, correctOptionIndex: 1 } },
      ]);
 
      // pool শেষ হলে — seen reset, full pool থেকে নাও
      if (qs.length < neededCount) {
        qs = await Question.aggregate([
          {
            $match: {
              ...baseFilter,
              subject: subjectId,
              // _id: $nin নেই — সব questions eligible
            },
          },
          { $sample: { size: neededCount } },
          { $project: { _id: 1, subject: 1, correctOptionIndex: 1 } },
        ]);
      }
 
      allQuestions.push(...qs);
    }
 
    if (allQuestions.length === 0) {
      throw new NotFoundError("No questions available for the selected filters.");
    }
 
    // সব questions একসাথে shuffle
    const shuffled        = shuffle(allQuestions);
    const questionIds     = shuffled.map((q) => q._id);
    const totalQuestions  = questionIds.length;
    const durationSeconds = totalQuestions * 60; // 1 min per question
    const now             = new Date();
 
    const session = await QuizSession.create({
      user:     user._id,
      examType: user.plan,
      subjectIds:  subjectIds.map((id:any) => new Schema.Types.ObjectId(id)),
      ...(facultyId             && { faculty:       new Schema.Types.ObjectId(facultyId) }),
      ...(departmentIds?.length && { departmentIds: departmentIds.map((id:any) => new Schema.Types.ObjectId(id)) }),
      ...(difficultyLevel       && { difficultyLevel }),
      ...(year                  && { year }),
      questionIds,
      totalQuestions,
      durationSeconds,
      correctCount:  0,
      incorrectCount: 0,
      currentIndex:  0,
      status:        QUIZ_STATUS.IN_PROGRESS,
      startedAt:     now,
    });
 
    return {
      sessionId:         session._id,
      totalQuestions,
      durationSeconds,
      remainingSeconds:  durationSeconds,
      currentIndex:      0,
      currentQuestionId: questionIds[0],
    };
  }
 

  export const quizSessionService = {
    startQuiz,
  };