import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import asyncHandler from "../../../shared/asynchandler";
import sendResponse from "../../../shared/sendResponse";
import { questionService } from "./question.service";


const createQuestion = asyncHandler(async (req: Request, res: Response) => {
    const result = await questionService.createQuestion(req.body);
    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Question created successfully.",
        data: result,
    });
});

// const getAllQuestions = asyncHandler(async (req: Request, res: Response) => {
//   const filter = {
//     ...req.query,
//     page: req.query.page ? Number(req.query.page) : 1,
//     limit: req.query.limit ? Number(req.query.limit) : 20,
//   };
//   const result = await questionService.getAllQuestions(filter);
//   sendResponse(res, {
//     statusCode: StatusCodes.OK,
//     success: true,
//     message: "Questions fetched successfully.",
//     data: result,
//   });
// });

// const getQuestionById = asyncHandler(async (req: Request, res: Response) => {
//   const result = await questionService.getQuestionById(req.params.id);
//   sendResponse(res, {
//     statusCode: StatusCodes.OK,
//     success: true,
//     message: "Question fetched successfully.",
//     data: result,
//   });
// });

// const updateQuestion = asyncHandler(async (req: Request, res: Response) => {
//   const result = await questionService.updateQuestion(req.params.id, req.body);
//   sendResponse(res, {
//     statusCode: StatusCodes.OK,
//     success: true,
//     message: "Question updated successfully.",
//     data: result,
//   });
// });

// const publishQuestion = asyncHandler(async (req: Request, res: Response) => {
//   const result = await questionService.publishQuestion(req.params.id);
//   sendResponse(res, {
//     statusCode: StatusCodes.OK,
//     success: true,
//     message: "Question published successfully.",
//     data: result,
//   });
// });

// const deleteQuestion = asyncHandler(async (req: Request, res: Response) => {
//   await questionService.deleteQuestion(req.params.id);
//   sendResponse(res, {
//     statusCode: StatusCodes.OK,
//     success: true,
//     message: "Question deleted successfully.",
//   });
// });

export const questionController = {
    createQuestion,
    //   getAllQuestions,
    //   getQuestionById,
    //   updateQuestion,
    //   publishQuestion,
    //   deleteQuestion,
};