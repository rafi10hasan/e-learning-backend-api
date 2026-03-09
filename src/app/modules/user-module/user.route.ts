import { Router } from 'express';

import { uploadFile } from '../../../helpers/fileuploader';
import authMiddleware from '../../middlewares/auth.middleware';
import { validateFormDataRequest, validateRequest } from '../../middlewares/request.validator';
import { validateFileSizes } from '../../middlewares/validateFileSize';
import { USER_ROLE } from './user.constant';
import { userController } from './user.controller';
import userValidationZodSchema from './user.validations';
import { cancellationPolicyController } from '../cancellation-policy-module/cancellation.policy.controller';

const userRouter = Router();

userRouter.post(
  '/create',
  validateRequest({
    body: userValidationZodSchema.createAuthSchema,
  }),
  userController.createAccountIntoDb,
);

userRouter.patch(
  '/profile/update',
  authMiddleware(USER_ROLE.GUEST, USER_ROLE.HOST),
  uploadFile(),
  validateFileSizes,
  validateFormDataRequest(userValidationZodSchema.profileUpdateSchema),
  userController.updateProfileIntoDb
);

userRouter.get(
  '/cancellation/policy/retrieve',
  authMiddleware(USER_ROLE.GUEST, USER_ROLE.HOST),
  cancellationPolicyController.getCancellationPoliciesByUser,
);
// userRouter.post(
//   '/create-rider-profile',
//   authMiddleware(USER_ROLE.RIDER),
//   validateRequest({
//     body: userValidationZodSchema.riderProfileSchema,
//   }),
//   userController.createRiderProfileIntoDb,
// );

// userRouter.post(
//   '/redeem-referral',
//   authMiddleware(USER_ROLE.RIDER),
//   userController.redeemReferralCodeIntoDb,
// );
export default userRouter;
