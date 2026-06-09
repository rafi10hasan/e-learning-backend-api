import { Router } from "express";
import authMiddleware from "../../../middlewares/auth.middleware";
import { validateRequest } from "../../../middlewares/request.validator";
import { USER_ROLE } from "../../user/user.constant";
import { dashboardQuestionController } from "./question.controller";
import questionQueryValidationZodSchema from "./question.zod";


const dashboardQuestionRouter = Router();

dashboardQuestionRouter.get(
    '/overview',
    authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
    dashboardQuestionController.getQuestionOverview,
);

dashboardQuestionRouter.get(
    '/questions',
    authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
    validateRequest({
        query: questionQueryValidationZodSchema.questionListValidation
    }),
    dashboardQuestionController.getAllQuestions,
);


dashboardQuestionRouter.get(
    '/test-archive',
    authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
    validateRequest({
        query: questionQueryValidationZodSchema.questionListValidation
    }),
    dashboardQuestionController.getAllTestArchiveIntoDashboard,
);

export default dashboardQuestionRouter;