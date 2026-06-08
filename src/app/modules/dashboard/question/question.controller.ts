import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import asyncHandler from "../../../../shared/asynchandler";
import sendResponse from "../../../../shared/sendResponse";
import { dashboardQuestionService } from "./question.service";




const getQuestionOverview = asyncHandler(async (req: Request, res: Response) => {
    const result = await dashboardQuestionService.getQuestionOverview();
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Question overview retrieved successfully.",
        data: result,
    });
});


export const dashboardQuestionController = {
    getQuestionOverview,
}