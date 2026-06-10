import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import asyncHandler from "../../../../shared/asynchandler";
import sendResponse from "../../../../shared/sendResponse";
import { PassageFiles } from "../../passage/passage.interface";
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

const getQuestionById = asyncHandler(async (req: Request, res: Response) => {
    const result = await dashboardQuestionService.getQuestionById(req.params.questionId as string);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Question retrieved successfully.",
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



const createPassage = asyncHandler(async (req: Request, res: Response) => {
    const result = await dashboardQuestionService.createPassage(req.body, req.files as PassageFiles);
    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Passage created successfully.",
        data: result,
    });
});


const importTestsFromCsvIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const csvFile = files?.csv_file?.[0];

    if (!csvFile) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "CSV file upload is required",
        });
    }

    // Delegate the CSV import work to the service layer.
    const result = await dashboardQuestionService.importTestsFromCsvFile(csvFile.buffer);

    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Test and questions imported successfully.",
        data: result,
    });
});

export const dashboardQuestionController = {
    getQuestionOverview,
    getAllQuestions,
    getAllTestArchiveIntoDashboard,
    createPassage,
    importTestsFromCsvIntoDb,
    getQuestionById
}