import express from 'express';

import { uploadFile } from '../../../helpers/fileuploader';
import authMiddleware from '../../middlewares/auth.middleware';
import { validateFormDataRequest } from '../../middlewares/request.validator';
import { validateFileSizes } from '../../middlewares/validateFileSize';
import { USER_ROLE } from '../user-module/user.constant';
import blogController from './blog.controller';
import blogValidationZodSchema from './blog.zod.validation';

const blogRouter = express.Router();
blogRouter.get('/specific-role', authMiddleware(USER_ROLE.GUEST, USER_ROLE.HOST), blogController.getAllBlogsByRole);
blogRouter.post(
  '/create',
  authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
  uploadFile(),
  validateFileSizes,
  validateFormDataRequest(blogValidationZodSchema.createBlogSchema),
  blogController.createBlog,
);
blogRouter.get('/get-all', authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN), blogController.getAllBlogs);
blogRouter.get(
  '/:id',
  authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN, USER_ROLE.GUEST, USER_ROLE.HOST),
  blogController.getSpecificBlogDetails,
);

blogRouter.get('/retrieve/recent', authMiddleware(USER_ROLE.GUEST, USER_ROLE.HOST), blogController.recentsBlog);
blogRouter.patch(
  '/update/:id',
  authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
  uploadFile(),
  validateFileSizes,
  validateFormDataRequest(blogValidationZodSchema.updateBlogSchema),
  blogController.updateBlog,
);
blogRouter.delete('/delete/:id', authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN), blogController.deleteBlog);

export default blogRouter;
