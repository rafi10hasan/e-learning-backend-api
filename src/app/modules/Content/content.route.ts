import { Router } from 'express';
import authMiddleware from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/request.validator';
import { USER_ROLE } from '../user/user.constant';
import { ContentController } from './content.controller';
import { contentZodValidation } from './content.zod';


const contentRouter = Router();

contentRouter.post(
  '/create-or-update',
  authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN, USER_ROLE.STUDENT),
  validateRequest({
    body: contentZodValidation.createOrUpdatePageSchema,
  }),
  ContentController.createContentOrUpdate,
);

// getAllContent
contentRouter.get('/retrieve', authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN), ContentController.getAllContent);

// getContentByType
contentRouter.get('/retrieve/:type', authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN,USER_ROLE.STUDENT), ContentController.getContentByType);

export default contentRouter;
