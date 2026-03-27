import { Router } from 'express';

import authMiddleware from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/request.validator';
import { USER_ROLE } from '../user/user.constant';
import { subjectController } from './subject.controller';
import subjectValidationZodSchema from './subject.zod';


const subjectRouter = Router();

subjectRouter.post(
  '/add',
  authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
  validateRequest(
    {
      body: subjectValidationZodSchema.createSubjectSchema,
    }
  ),
  subjectController.createSubjectIntodb,
);


subjectRouter.get(
  '/retrieve',
  authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
  validateRequest({
    query: subjectValidationZodSchema.getSubjectQuerySchema
  }),
  subjectController.getAllSubjects,
);
export default subjectRouter;