import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import asyncHandler from '../../../shared/asynchandler';
import sendResponse from '../../../shared/sendResponse';

import { BadRequestError } from '../../errors/request/apiError';
import dashboardServices from './dashboard.services';

const getDashboardInfo = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardServices.fetchDasboardPageData();
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'dashboard info retrieved successfully',
    data: data,
  });
});

const getRecentUsers = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardServices.getRecentUsers();
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'recent users retrieved successfully',
    data: data,
  });
});

const getYearlyUserStats = asyncHandler(async (req: Request, res: Response) => {
  const year = parseInt(req.query.year as string, 10);
  if (!year || isNaN(year)) {
    throw new BadRequestError('year is required');
  }
  const data = await dashboardServices.getYearlyUserStats(year);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'yearly user stats retrieved successfully',
    data: data,
  });
});

// const getYearlyEarningStats = asyncHandler(async (req: Request, res: Response) => {
//     const year = parseInt(req.query.year as string, 10);
//   if (!year || isNaN(year)) {
//     throw new CustomError.BadRequestError(
//       'year is required'
//     );
//   }
//   const data = await dashboardServices.getYearlyAdminEarnings(year);
//   sendResponse(res, {
//     statusCode: StatusCodes.OK,
//     success: true,
//     message: 'yearly earning stats retrieved successfully',
//     data: data
//   });
// });

export default {
  getDashboardInfo,
  getYearlyUserStats,
  getRecentUsers,
};
