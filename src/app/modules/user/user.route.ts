import { Router } from 'express';
import { validateRequest } from '../../middlewares/request.validator';
import { userController } from './user.controller';
import userValidationZodSchema from './user.validations';
import authMiddleware from '../../middlewares/auth.middleware';
import { USER_ROLE } from './user.constant';

const userRouter = Router();

userRouter.post(
  '/create',
  validateRequest({
    body: userValidationZodSchema.createAuthSchema,
  }),
  userController.createAccountIntoDb,
);

userRouter.post(
  '/choose-plan',
  authMiddleware(USER_ROLE.STUDENT),
  userController.choosePlanIntoDb,
);


userRouter.get(
  '/plan',
  authMiddleware(USER_ROLE.STUDENT),
  userController.getUserPlanIntoDb,
);


export default userRouter;
