import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import asyncHandler from "../../../../shared/asynchandler";
import sendResponse from "../../../../shared/sendResponse";
import { dashboardQuestionService } from "./question.service";
import { TQuestionListInput, TTestListInput } from "./question.zod";




const getQuestionOverview = asyncHandler(async (req: Request, res: Response) => {
    const result = await dashboardQuestionService.getQuestionOverview();
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Question overview retrieved successfully.",
        data: result,
    });
});

const getAllQuestions = asyncHandler(async (req: Request, res: Response) => {
    const result = await dashboardQuestionService.getAllQuestions(req.query as unknown as TQuestionListInput);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Questions retrieved successfully.",
        data: result,
    });
});

const getAllTestArchiveIntoDashboard = asyncHandler(async (req: Request, res: Response) => {
    const result = await dashboardQuestionService.getAllTestArchive(req.query as unknown as TTestListInput);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Test archive retrieved successfully.",
        data: result,
    });
});

export const dashboardQuestionController = {
    getQuestionOverview,
    getAllQuestions,
    getAllTestArchiveIntoDashboard,
}