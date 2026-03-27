import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import asyncHandler from "../../../shared/asynchandler";
import sendResponse from "../../../shared/sendResponse";
import { subjectService } from "./subject.service";
import { TGetSubjectQueryPayload } from "./subject.zod";

const createSubjectIntodb = asyncHandler(async (req: Request, res: Response) => {
    const result = await subjectService.createSubject(req.body);

    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Subject created successfully.",
        data: result,
    });
});


const getAllSubjects = asyncHandler(async (req: Request, res: Response) => {
    const result = await subjectService.getAllSubjects(req.query as TGetSubjectQueryPayload);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Subject retrieved successfully.",
        data: result,
    });
});

export const subjectController = {
    createSubjectIntodb,
    getAllSubjects,
};