import express from 'express';
import authMiddleware from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/request.validator';
import { authController } from '../auth-module/auth.controller';
import { authValidationZodSchema } from '../auth-module/auth.validation';
import dashboardController from '../dashboard-module/dashboard.controller';
import privacyPolicyControllers from '../privacy-policy-module/privacyPolicy.controllers';
import termsConditionControllers from '../terms-condition-module/termsCondition.controllers';
import adminController from './admin.controllers';
import adminValidationZodSchema from './admin.zod.validation';
import { cancellationZodValidation } from '../cancellation-policy-module/cancellation.policy.zod';
import { cancellationPolicyController } from '../cancellation-policy-module/cancellation.policy.controller';
import { USER_ROLE } from '../user-module/user.constant';

const adminRouter = express.Router();

adminRouter.post(
  '/auth/login',
  validateRequest({
    body: authValidationZodSchema.loginAuthSchema,
  }),
  authController.adminLoginWithCredential,
);

adminRouter.post('/create', authMiddleware(USER_ROLE.SUPER_ADMIN), adminController.createAdmin);
adminRouter.get('/retrieve/all', authMiddleware(USER_ROLE.SUPER_ADMIN), adminController.getAllAdmin);
adminRouter.get('/retrieve/:id', authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN), adminController.getSpecificAdmin);

adminRouter.patch(
  '/update',
  authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
  validateRequest({
    body: adminValidationZodSchema.updateAdminSchema,
  }),
  adminController.updateSpecificAdmin,
);

adminRouter.delete('/delete/:id', authMiddleware(USER_ROLE.SUPER_ADMIN), adminController.deleteSpecificAdmin);

adminRouter.get('/dashboard/info',authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN), dashboardController.getDashboardInfo);
adminRouter.get('/dashboard/recent-users', authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN), dashboardController.getRecentUsers);
adminRouter.get('/dashboard/yearly-user-stats', authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN), dashboardController.getYearlyUserStats);

adminRouter.get(
  '/terms-condition/retrieve',
  authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
  termsConditionControllers.getTermsCondition,
);
adminRouter.get(
  '/privacy-policy/retrieve',
  authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
  privacyPolicyControllers.getPrivacyPolicy,
);
adminRouter.post(
  '/privacy-policy/create-or-update',
  authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
  privacyPolicyControllers.createOrUpdatePrivacyPolicy,
);
adminRouter.post(
  '/terms-condition/create-or-update',
  authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
  termsConditionControllers.createOrUpdateTermsCondition,
);

adminRouter.post(
  '/cancellation/policy/create',
  authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
  validateRequest({
    body: cancellationZodValidation.createCancellationPolicySchema
  }),
  cancellationPolicyController.createCancellationPolicy,
);

adminRouter.patch(
  '/cancellation/policy/update/:id',
  authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
  validateRequest({
    body: cancellationZodValidation.updateCancellationPolicySchema
  }),
  cancellationPolicyController.updateCancellationPolicy,
);

adminRouter.delete(
  '/cancellation/policy/delete/:id',
  authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
  cancellationPolicyController.deleteCancellationPolicy,
);

adminRouter.get(
  '/cancellation/policy/retrieve',
  authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN, USER_ROLE.GUEST, USER_ROLE.HOST),
  cancellationPolicyController.getAllCancellationPolicies,
);

export default adminRouter;
