
import { Router } from 'express';

import authMiddleware from '../../middlewares/auth.middleware';

import { validateRequest } from '../../middlewares/request.validator';
import { USER_ROLE } from '../user/user.constant';
import { testController } from './test.controller';
import testValidationZodSchema from './test.zod';



const testRouter = Router();

testRouter.post(
    '/add',
    authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
    validateRequest({ body: testValidationZodSchema.createTestSchema }),
    testController.createTest,
);

testRouter.get(
    '/official',
    authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
    testController.getAllOfficialTestsIntoDb
);

testRouter.get(
    '/additional',
    authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
    testController.getAllAdditionalTestsIntoDb
);

testRouter.get(
    '/questions/:testId',
    authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
    testController.getQuestionsByTestIdIntoDb
);

export default testRouter;