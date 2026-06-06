

import { Router } from 'express';

import { uploadFile } from '../../../helpers/fileuploader';
import authMiddleware from '../../middlewares/auth.middleware';
import { validateFormDataRequest } from '../../middlewares/request.validator';
import { validateFileSizes } from '../../middlewares/validateFileSize';
import { USER_ROLE } from '../user/user.constant';
import passageValidationZodSchema from './passage.zod';
import { passageController } from './passage.controller';



const passageRouter = Router();

passageRouter.post(
    '/add',
    authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
    uploadFile(),
    validateFileSizes,
    validateFormDataRequest(passageValidationZodSchema.passageSchema),
    passageController.createPassage,
);

export default passageRouter;