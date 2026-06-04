import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import sendResponse from '../../../shared/sendResponse';

import asyncHandler from '../../../shared/asynchandler';
import { TProfileImage } from './user.interface';
import { userService } from './user.service';


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


const choosePlanIntoDb = asyncHandler(async (req: Request, res: Response) => {
  const { plan } = req.body as { plan: string };

  const result = await userService.choosePlan(req.user, plan);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Plan chosen successfully',
    data: result,
  });
});

export const userController = {
  createAccountIntoDb,
  choosePlanIntoDb
};
