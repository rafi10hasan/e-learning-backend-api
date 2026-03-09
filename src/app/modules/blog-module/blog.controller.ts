import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import sendResponse from '../../../shared/sendResponse';

import asyncHandler from '../../../shared/asynchandler';
import { TBlogImages } from './blog.constant';
import blogServices from './blog.services';

const createBlog = asyncHandler(async (req: Request, res: Response) => {
  const file = req.files as TBlogImages;
  const result = await blogServices.createBlog(req.body, file);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Blog has been created succesfully',
    data: result,
  });
});

const getAllBlogsByRole = asyncHandler(async (req: Request, res: Response) => {
  const user: any = req.user;
  console.log(user.role);
  const result = await blogServices.retrieveAllBlogsByRole(req.query, user.role);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Blog data has been retrieved succesfully',
    data: result,
  });
});

const getSpecificBlogDetails = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await blogServices.retrieveSpecificBlogDetails(id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Blog data has been retrieved succesfully',
    data: result,
  });
});

const recentsBlog = asyncHandler(async (req: Request, res: Response) => {
  const result = await blogServices.retrieveRecentBlogs(3, req.user.role as 'guest' | 'host');
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Recent Blog data has been retrieved succesfully',
    data: result,
  });
});

const getAllBlogs = asyncHandler(async (req: Request, res: Response) => {
  const result = await blogServices.retrieveAllBlogs(req.query);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Blog data has been retrieved succesfully',
    data: result,
  });
});

const updateBlog = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const file = req.files as TBlogImages;
  const result = await blogServices.updateBlog(id, req.body, file);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Blog data has been updated successfully',
    data: result,
  });
});

const deleteBlog = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await blogServices.deleteBlog(id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Blog data has been deleted succesfully',
    data: result,
  });
});

export default {
  createBlog,
  recentsBlog,
  getAllBlogs,
  getAllBlogsByRole,
  getSpecificBlogDetails,
  updateBlog,
  deleteBlog,
};
