import { Router } from "express";
import { uploadFile } from "../../../../helpers/fileuploader";
import authMiddleware from "../../../middlewares/auth.middleware";
import { validateFormDataRequest, validateRequest } from "../../../middlewares/request.validator";
import { validateFileSizes } from "../../../middlewares/validateFileSize";
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
    '/',
    authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
    validateRequest({
        query: questionQueryValidationZodSchema.questionListValidation
    }),
    dashboardQuestionController.getAllQuestions,
);

dashboardQuestionRouter.get(
    '/single/:questionId',
    authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
    dashboardQuestionController.getQuestionById,
);

dashboardQuestionRouter.get(
    '/test-archive',
    authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
    validateRequest({
        query: questionQueryValidationZodSchema.questionListValidation
    }),
    dashboardQuestionController.getAllTestArchiveIntoDashboard,
);

dashboardQuestionRouter.post(
    '/passage/add',
    authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
    uploadFile(),
    validateFileSizes,
    validateFormDataRequest(questionQueryValidationZodSchema.passageSchema),
    dashboardQuestionController.createPassage,
);


dashboardQuestionRouter.get(
    '/passages',
    authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
    dashboardQuestionController.getPassages,
);

dashboardQuestionRouter.post(
    '/import-csv',
    authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
    uploadFile(),
    dashboardQuestionController.importTestsFromCsvIntoDb,
);

export default dashboardQuestionRouter;