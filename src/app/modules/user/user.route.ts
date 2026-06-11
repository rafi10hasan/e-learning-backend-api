import { Router } from 'express';
import authMiddleware from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/request.validator';
import { USER_ROLE } from './user.constant';
import { userController } from './user.controller';
import userValidationZodSchema from './user.validations';
import { uploadFile } from '../../../helpers/fileuploader';
import { validateFileSizes } from '../../middlewares/validateFileSize';

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


userRouter.patch(
  '/update-profile',
  authMiddleware(USER_ROLE.STUDENT),
  validateRequest({
    body: userValidationZodSchema.updateUserProfileSchema,
  }),
  userController.updateUserProfile,
);

userRouter.patch(
  '/update-profile-image',
  authMiddleware(USER_ROLE.STUDENT),
  uploadFile(),
  validateFileSizes,
  userController.updateUserProfileImage,
);

userRouter.get(
  '/get-profile',
  authMiddleware(USER_ROLE.STUDENT),
  userController.getUserProfile,
);


export default userRouter;
