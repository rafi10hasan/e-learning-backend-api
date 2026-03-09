import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import sendResponse from '../../../shared/sendResponse';

import asyncHandler from '../../../shared/asynchandler';
import { BadRequestError } from '../../errors/request/apiError';
import { TProfileImages } from './user.interface';
import { userService } from './user.services';

// register user

// register
const createAccountIntoDb = asyncHandler(async (req: Request, res: Response) => {
  const userPayload = req.body;
  const result = await userService.createAccount(userPayload);
  // console.log(result);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: result.message,
    data: null,
  });
});

const updateProfileIntoDb = asyncHandler(async (req: Request, res: Response) => {
  const files = req.files as TProfileImages;
  const isBodyEmpty = Object.keys(req.body || {}).length === 0;
  const isFilesEmpty = !files || Object.keys(files).length === 0;
  if (isBodyEmpty && isFilesEmpty) {
    throw new BadRequestError('please at least one field change to update');
  }
  const result = await userService.updateProfile(req.user, req.body, files);
  // console.log(result);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'profile has been updated successfully!',
    data: result,
  });
});

export const userController = {
  createAccountIntoDb,
  updateProfileIntoDb,
};
