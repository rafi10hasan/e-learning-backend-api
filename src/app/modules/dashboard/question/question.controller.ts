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
    const uploadedFile = files?.csv_file?.[0];

    if (!uploadedFile) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "File upload is required (.csv or .xlsx)",
        });
    }

    const { summary, test, questions } = await dashboardQuestionService.importTestsFromFile(uploadedFile.buffer);

    if (summary.errors.length > 0 || !test) {
        return sendResponse(res, {
            statusCode: StatusCodes.OK,
            success: false,
            message: "Validation completed with errors. No data was imported.",
            data: { summary },
        });
    }

    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Test and questions imported successfully.",
        data: { summary, test, questions },
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