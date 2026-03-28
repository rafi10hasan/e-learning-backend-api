import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import asyncHandler from "../../../shared/asynchandler";
import sendResponse from "../../../shared/sendResponse";
import { facultyService } from "./faculty.service";



const createFacultyIntodb = asyncHandler(async (req: Request, res: Response) => {
    const result = await facultyService.createFaculty(req.body);

    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Faculty created successfully.",
        data: result,
    });
});


const getAllFaculties = asyncHandler(async (req: Request, res: Response) => {
    const result = await facultyService.getAllFaculties();

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Faculty retrieved successfully.",
        data: result,
    });
});

export const facultyController = {
    createFacultyIntodb,
    getAllFaculties,
};