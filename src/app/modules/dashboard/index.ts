import { Router } from "express";
import dashboardQuestionRouter from "./question/question.route";


const adminRouter = Router();


adminRouter.use('/dashboard', dashboardQuestionRouter);


export default adminRouter;