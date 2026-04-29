import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import asyncHandler from "../../../shared/asynchandler";
import sendResponse from "../../../shared/sendResponse";
import { quizTemplateService } from "./quiz.service";

const createQuizTemplate = asyncHandler(async (req: Request, res: Response) => {
  const result = await quizTemplateService.createQuizTemplate(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Quiz template created successfully.",
    data: result,
  });
});

const getAllTemplates = asyncHandler(async (req: Request, res: Response) => {
  const result = await quizTemplateService.getAllTemplates(req.query);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Quiz templates fetched successfully.",
    data: result,
  });
});

const getTemplateById = asyncHandler(async (req: Request, res: Response) => {
  const result = await quizTemplateService.getTemplateById(req.params.id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Quiz template fetched successfully.",
    data: result,
  });
});

// const generateQuiz = asyncHandler(async (req: Request, res: Response) => {
//   const userId = req.user?._id.toString()!;
//   const result = await quizTemplateService.generateQuiz(req.params.id, userId);
//   sendResponse(res, {
//     statusCode: StatusCodes.OK,
//     success: true,
//     message: "Quiz generated successfully.",
//     data: result,
//   });
// });

const publishTemplate = asyncHandler(async (req: Request, res: Response) => {
  const result = await quizTemplateService.publishTemplate(req.params.id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Quiz template published successfully.",
    data: result,
  });
});

const updateTemplate = asyncHandler(async (req: Request, res: Response) => {
  const result = await quizTemplateService.updateTemplate(req.params.id, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Quiz template updated successfully.",
    data: result,
  });
});

const deleteTemplate = asyncHandler(async (req: Request, res: Response) => {
  await quizTemplateService.deleteTemplate(req.params.id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Quiz template deleted successfully.",
  });
});

export const quizTemplateController = {
  createQuizTemplate,
  getAllTemplates,
  getTemplateById,
  // generateQuiz,
  publishTemplate,
  updateTemplate,
  deleteTemplate,
};