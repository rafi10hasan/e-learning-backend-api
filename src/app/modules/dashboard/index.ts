import { Router } from "express";
import dashboardQuestionRouter from "./question/question.route";
import userManagementRouter from "./user-management/user.management.route";
import userOverviewRouter from "./overview/overview.route";


const adminRouter = Router();


adminRouter.use('/questions', dashboardQuestionRouter);
adminRouter.use('/users', userManagementRouter);
adminRouter.use('/overview', userOverviewRouter);


export default adminRouter;