import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { TExamTypes } from "../../../interfaces";
import asyncHandler from "../../../shared/asynchandler";
import sendResponse from "../../../shared/sendResponse";
import { BadRequestError } from "../../errors/request/apiError";
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

const getSubjectsByType = asyncHandler(async (req: Request, res: Response) => {

    const plan = req.user.plan as string;

    const result = await subjectService.getSubjectsOrDepartmentsByExamType(plan as TExamTypes, req.user.faculty as string);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Subject retrieved successfully.",
        data: result,
    });
});


const getSubjectsByDepartments = asyncHandler(async (req: Request, res: Response) => {
    const departments = req.body.departments;
    if (departments.length === 0) {
        throw new BadRequestError("At least one department must be selected.");
    }
    const result = await subjectService.getSubjectsByDepartments(departments);

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
    getSubjectsByType,
    getSubjectsByDepartments
};