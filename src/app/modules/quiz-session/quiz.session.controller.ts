import { StatusCodes } from "http-status-codes";
import asyncHandler from "../../../shared/asynchandler";
import sendResponse from "../../../shared/sendResponse";
import { testService } from "../test/test.service";
import { Request, Response } from "express";


const startQuiz = asyncHandler(async (req: Request, res: Response) => {
  const result = await testService.createTest(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Quiz started successfully.",
    data: result,
  });
});

export const quizSessionController = {
  startQuiz,
}