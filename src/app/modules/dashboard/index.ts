import { Router } from "express";
import dashboardQuestionRouter from "./question/question.route";


const adminRouter = Router();


adminRouter.use('/questions', dashboardQuestionRouter);


export default adminRouter;