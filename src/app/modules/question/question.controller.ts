import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { QuestionFilterInput } from "../../../helpers/questionFilter";
import asyncHandler from "../../../shared/asynchandler";
import sendResponse from "../../../shared/sendResponse";
import { QuestionFiles } from "./question.interface";
import Question from "./question.model";
import { questionService } from "./question.service";


const createQuestion = asyncHandler(async (req: Request, res: Response) => {
    const result = await questionService.createQuestion(req.body, req.files as QuestionFiles);
    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Question created successfully.",
        data: result,
    });
});

const createQuestionmany = asyncHandler(async (req: Request, res: Response) => {
    const result = await Question.insertMany(req.body);
    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Question created successfully.",
        data: result,
    });
});

const importQuestionIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const csvFile = files?.csv_file?.[0];

    if (!csvFile) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "CSV file upload is required" });
    }

    const result = await questionService.importQuestionsToDb(csvFile.buffer);

    if (!result.success && result.validCount === 0) {
        return sendResponse(res, {
            statusCode: StatusCodes.BAD_REQUEST,
            success: false,
            message: "No valid questions found to import.",
            data: { errors: result.failedRows },
        });
    }

    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Import processing completed.",
        data: {
            summary: {
                insertedCount: result.insertedData?.length || 0,
                skippedCount: result.skippedData?.length || 0,
                failedCount: result.failedData?.length || 0,
            },
            inserted: result.insertedData || [], // Notun add kora questions
            skipped: result.skippedData || [],   // Database-e age thekei thaka questions
            failed: result.failedData || [],     // Validation error rows
        },
    });
});

const getAllQuestionByExamTypeAndSubjects = asyncHandler(async (req: Request, res: Response) => {
    const result = await questionService.fetchQuestions({
        ...req.query,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
    } as QuestionFilterInput & { page?: number; limit?: number });

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Questions fetched successfully.",
        meta: result.meta,
        data: result.data,
    });
});



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
    getAllQuestionByExamTypeAndSubjects,
    createQuestionmany,
    importQuestionIntoDb
    //   getAllQuestions,
    //   getQuestionById,
    //   updateQuestion,
    //   publishQuestion,
    //   deleteQuestion,
};