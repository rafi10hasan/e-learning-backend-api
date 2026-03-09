import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import asyncHandler from '../../../shared/asynchandler';
import sendResponse from '../../../shared/sendResponse';
import { BadRequestError } from '../../errors/request/apiError';
import adminServices from './admin.services';
import { TAdminProfileImages } from './admin.interface';

// controller for create new admin
const createAdmin = asyncHandler(async (req: Request, res: Response) => {
  const adminData = req.body;
  const admin = await adminServices.createAdmin(adminData);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Admin has been created successfully!',
    data: admin,
  });
});

// controller for get all admin
const getAllAdmin = asyncHandler(async (_req: Request, res: Response) => {
  const admins = await adminServices.getAllAdminAndSuperAdmin();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Admin data retrieve successfully',
    data: admins,
  });
});

// controller for get specific admin
const getSpecificAdmin = asyncHandler(async (req: Request, res: Response) => {
  const admin = await adminServices.getSpecificAdmin(req.user);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Admin found successfull',
    data: admin,
  });
});

// controller for update specific admin
const updateSpecificAdmin = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body;
  const updatedAdmin = await adminServices.updateSpecificAdmin(req.user, data);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Admin update successfull',
    data: updatedAdmin
  });
});

const changeProfileImage = asyncHandler(async (req: Request, res: Response) => {
  const files = req.files as TAdminProfileImages;

  const result = await adminServices.updateProfileImage(req.user,files);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'profile image has been updated succesfully!',
    data: result,
  });
});

// controller for delete specific admin
const deleteSpecificAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const admin = await adminServices.deleteSpecificAdmin(id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Admin delete successfully',
  });
});

export default {
  createAdmin,
  getAllAdmin,
  getSpecificAdmin,
  updateSpecificAdmin,
  deleteSpecificAdmin,
  changeProfileImage,
};
