import { Router } from 'express';
import authMiddleware from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/request.validator';
import { USER_ROLE } from '../user/user.constant';
import { ContentController } from './content.controller';
import { contentZodValidation } from './content.zod';


const router = Router();

router.post(
  '/create-or-update',
  authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN, USER_ROLE.STUDENT),
  validateRequest({
    body: contentZodValidation.createOrUpdatePageSchema,
  }),
  ContentController.createContentOrUpdate,
);

// getAllContent
router.get('/retrieve', authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN), ContentController.getAllContent);

// getContentByType
router.get('/retrieve/:type', authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN,USER_ROLE.STUDENT), ContentController.getContentByType);

export const contentRouter = router;
