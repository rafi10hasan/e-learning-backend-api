
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

export default testRouter;