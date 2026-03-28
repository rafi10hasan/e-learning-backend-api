import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import asyncHandler from "../../../shared/asynchandler";
import sendResponse from "../../../shared/sendResponse";
import { departmentService } from "./department.service";


const createDepartmentIntodb = asyncHandler(async (req: Request, res: Response) => {
    const { facultyId } = req.params;
    const result = await departmentService.createDepartmentUnderFaculty(req.body, facultyId);
    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Department created successfully.",
        data: result,
    });
});


const getAllDepartments = asyncHandler(async (req: Request, res: Response) => {
    const { facultyId } = req.params;
    const result = await departmentService.getAllDepartmentByFacultyId(facultyId);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Department retrieved successfully.",
        data: result,
    });
});

export const departmentController = {
    createDepartmentIntodb,
    getAllDepartments,
};