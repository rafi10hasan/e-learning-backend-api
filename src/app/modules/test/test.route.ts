
import { Router } from 'express';

import authMiddleware from '../../middlewares/auth.middleware';

import { validateRequest } from '../../middlewares/request.validator';
import { uploadFile } from '../../../helpers/fileuploader';
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

testRouter.post(
    '/import-csv',
    authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
    uploadFile(),
    testController.importTestsFromCsvIntoDb,
);

testRouter.get(
    '/official',
    authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN,USER_ROLE.STUDENT),
    testController.getAllOfficialTestsIntoDb
);

testRouter.get(
    '/additional',
    authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN,USER_ROLE.STUDENT),
    testController.getAllAdditionalTestsIntoDb
);

testRouter.get(
  '/year-range',
  authMiddleware(USER_ROLE.STUDENT),
  testController.getYearRange,
);

testRouter.get(
    '/questions/:testId',
    authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN,USER_ROLE.STUDENT),
    testController.getQuestionsByTestIdIntoDb
);

export default testRouter;