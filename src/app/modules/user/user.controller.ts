import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import sendResponse from '../../../shared/sendResponse';

import asyncHandler from '../../../shared/asynchandler';
import { userService } from './user.service';
import { TProfileImage } from './user.interface';


// register user
const createAccountIntoDb = asyncHandler(async (req: Request, res: Response) => {
  const userPayload = req.body;
  const result = await userService.createAccount(userPayload);
  // console.log(result);
  const isVerificationRequired = result.status === 'UNVERIFIED';
  sendResponse(res, {
    statusCode: isVerificationRequired ? StatusCodes.BAD_REQUEST : StatusCodes.CREATED,
    success: isVerificationRequired ? false : true,
    message: isVerificationRequired ? 'Your Account is not verified. Please verify your email to complete registration' : 'User has been registered successfully.Check your email to verify your Account',
    data: result,
  });
});


const updateUserProfile = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.updateUserProfile(req.user,req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Profile updated successfully',
    data: result,
  });
});

const changeLanguageIntoDb = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.updateUserLanguage(req.user, req.body.language);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Language changed successfully',
    data: result,
  });
});

const updateUserProfileImage = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.updateUserProfileImage(req.user,req.files as TProfileImage);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Profile image updated successfully',
    data: result,
  });
});

const getUserProfile = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.getUserProfile(req.user);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Profile fetched successfully',
    data: result,
  });
});


const choosePlanIntoDb = asyncHandler(async (req: Request, res: Response) => {
  
  const result = await userService.choosePlan(req.user, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Plan chosen successfully',
    data: result,
  });
});


const getUserPlanIntoDb = asyncHandler(async (req: Request, res: Response) => {

  const result = await userService.getUserPlan(req.user);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Plan retrieved successfully',
    data: result,
  });
});

export const userController = {
  createAccountIntoDb,
  choosePlanIntoDb,
  getUserPlanIntoDb,
  updateUserProfile,
  changeLanguageIntoDb,
  updateUserProfileImage,
  getUserProfile,
};
