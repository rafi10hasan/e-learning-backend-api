import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import asyncHandler from "../../../../shared/asynchandler";
import sendResponse from "../../../../shared/sendResponse";
import { adminService } from "./admin.service";




const getMeIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const result = await adminService.getMe(req.user);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'User profile retrieved successfully',
        data: result,
    });
});



export const adminController = {
    getMeIntoDb,
}