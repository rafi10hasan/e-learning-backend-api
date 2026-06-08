import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import asyncHandler from "../../../shared/asynchandler";
import sendResponse from "../../../shared/sendResponse";
import { BadRequestError } from "../../errors/request/apiError";
import { quizSessionService } from "./quiz.session.service";


const startQuiz = asyncHandler(async (req: Request, res: Response) => {
  const result = await quizSessionService.startQuiz(req.user, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Quiz started successfully.",
    data: result,
  });
});


const completeQuiz = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const result = await quizSessionService.completeQuiz(sessionId, req.user._id);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Quiz completed successfully.",
    data: result,
  });
});


const getReviewQuiz = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { index } = req.body;
  if (!index) {
    throw new BadRequestError("Question index is required.");
  }
  const result = await quizSessionService.getQuestionReview(sessionId, req.user._id, Number(index));
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Quiz review retrieved successfully.",
    data: result,
  });
});

const getSessionStatus = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const result = await quizSessionService.getSessionStatus(sessionId, req.user._id);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Session status retrieved successfully.",
    data: result,
  });
});


const getQuizMapIntodb = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const result = await quizSessionService.getQuizMap(sessionId, req.user._id);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Quiz map retrieved successfully.",
    data: result,
  });
});

export const quizSessionController = {
  startQuiz,
  completeQuiz,
  getReviewQuiz,
  getSessionStatus,
  getQuizMapIntodb
}