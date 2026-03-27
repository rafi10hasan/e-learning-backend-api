import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import asyncHandler from "../../../shared/asynchandler";
import sendResponse from "../../../shared/sendResponse";
import { testService } from "./test.service";

const createTest = asyncHandler(async (req: Request, res: Response) => {
  const result = await testService.createTest(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Test created successfully.",
    data: result,
  });
});

const getAllTests = asyncHandler(async (req: Request, res: Response) => {
  const result = await testService.getAllTests(req.query);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Tests fetched successfully.",
    data: result,
  });
});

const getTestById = asyncHandler(async (req: Request, res: Response) => {
  const result = await testService.getTestById(req.params.id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Test fetched successfully.",
    data: result,
  });
});

const getTestWithQuestions = asyncHandler(async (req: Request, res: Response) => {
  const result = await testService.getTestWithQuestions(req.params.id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Test with questions fetched successfully.",
    data: result,
  });
});

// admin — question bank filter করে linkable questions দেখবে
const getLinkableQuestions = asyncHandler(async (req: Request, res: Response) => {
  const result = await testService.getLinkableQuestions(
    req.params.id,
    req.query
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Linkable questions fetched successfully.",
    data: result,
  });
});

const linkQuestions = asyncHandler(async (req: Request, res: Response) => {
  const result = await testService.linkQuestions(
    req.params.id,
    req.body.questionIds
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Questions linked successfully.",
    data: result,
  });
});

const removeQuestion = asyncHandler(async (req: Request, res: Response) => {
  const result = await testService.removeQuestion(
    req.params.id,
    req.params.questionId
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Question removed successfully.",
    data: result,
  });
});

const reorderQuestions = asyncHandler(async (req: Request, res: Response) => {
  const result = await testService.reorderQuestions(
    req.params.id,
    req.body.questionIds
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Questions reordered successfully.",
    data: result,
  });
});

const publishTest = asyncHandler(async (req: Request, res: Response) => {
  const result = await testService.publishTest(req.params.id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Test published successfully.",
    data: result,
  });
});

const updateTest = asyncHandler(async (req: Request, res: Response) => {
  const result = await testService.updateTest(req.params.id, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Test updated successfully.",
    data: result,
  });
});

const deleteTest = asyncHandler(async (req: Request, res: Response) => {
  await testService.deleteTest(req.params.id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Test deleted successfully.",
  });
});

export const testController = {
  createTest,
  getAllTests,
  getTestById,
  getTestWithQuestions,
  getLinkableQuestions,
  linkQuestions,
  removeQuestion,
  reorderQuestions,
  publishTest,
  updateTest,
  deleteTest,
};