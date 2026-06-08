import { Router } from "express";
import authMiddleware from "../../../middlewares/auth.middleware";
import { USER_ROLE } from "../../user/user.constant";
import { dashboardQuestionController } from "./question.controller";


const dashboardQuestionRouter = Router();

dashboardQuestionRouter.get(
    '/',
    authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
    dashboardQuestionController.getQuestionOverview,
);

export default dashboardQuestionRouter;