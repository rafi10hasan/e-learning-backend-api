import { Request, Response } from "express";
import asyncHandler from "../../../../shared/asynchandler";
import sendResponse from "../../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import { overviewUserService } from "./overview.service";


const getRecentUsersIntoDb = asyncHandler(async (req: Request, res: Response) => {

    const result = await overviewUserService.getRecentUsers();
    // console.log(result);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: result.length > 0 ? 'Recent users data has been retrieved successfully' : 'No recent users found',
        data: result,
    });
});

const getUserGrowthIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    const result = await overviewUserService.getUserGrowth(year);
    // console.log(result);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'User growth data has been retrieved successfully',
        data: result,
    });
});


const getStatsOverviewIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const result = await overviewUserService.getStatsOverview();
    // console.log(result);
    res.set('Cache-Control', 'no-store');
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Stats overview has been retrieved successfully',
        data: result,
    });
});



export const overviewController ={
    getRecentUsersIntoDb,
    getUserGrowthIntoDb,
    getStatsOverviewIntoDb,
}