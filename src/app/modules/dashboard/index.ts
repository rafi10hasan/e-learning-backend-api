import { Router } from "express";
import dashboardQuestionRouter from "./question/question.route";
import userManagementRouter from "./user-management/user.management.route";
import userOverviewRouter from "./overview/overview.route";
import { adminController } from "./admin/admin.controller";
import authMiddleware from "../../middlewares/auth.middleware";
import { USER_ROLE } from "../user/user.constant";


const adminRouter = Router();


adminRouter.use('/questions', dashboardQuestionRouter);
adminRouter.use('/users', userManagementRouter);
adminRouter.use('/overview', userOverviewRouter);
adminRouter.use('/get-me', authMiddleware(USER_ROLE.SUPER_ADMIN), adminController.getMeIntoDb);


export default adminRouter;