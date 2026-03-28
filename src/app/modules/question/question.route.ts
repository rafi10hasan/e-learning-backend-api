
import { Router } from 'express';

import { uploadFile } from '../../../helpers/fileuploader';
import authMiddleware from '../../middlewares/auth.middleware';
import { validateFormDataRequest } from '../../middlewares/request.validator';
import { validateFileSizes } from '../../middlewares/validateFileSize';
import { USER_ROLE } from '../user/user.constant';
import { questionController } from './question.controller';
import questionValidationZodSchema from './question.zod';



const questionRouter = Router();

questionRouter.post(
    '/add',
    authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
    uploadFile(),
    validateFileSizes,
    validateFormDataRequest(questionValidationZodSchema.createQuestionSchema),
    questionController.createQuestion,
);


questionRouter.get(
    '/fetch',
    authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
    questionController.getAllQuestionByExamTypeAndSubjects,
);

export default questionRouter;