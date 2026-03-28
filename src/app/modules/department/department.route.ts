import { Router } from 'express';

import authMiddleware from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/request.validator';
import { USER_ROLE } from '../user/user.constant';
import departmentValidationZodSchema from './department.zod';
import { departmentController } from './department.controller';




const departmentRouter = Router();

departmentRouter.post(
    '/add/:facultyId',
    authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
    validateRequest(
        {
            body: departmentValidationZodSchema.createDepartmentSchema,
        }
    ),
    departmentController.createDepartmentIntodb,
);


departmentRouter.get(
    '/retrieve/:facultyId',
    authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
    departmentController.getAllDepartments,
);
export default departmentRouter;