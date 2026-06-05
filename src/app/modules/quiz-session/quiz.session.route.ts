import { Router } from "express";
import authMiddleware from "../../middlewares/auth.middleware";
import { validateRequest } from "../../middlewares/request.validator";
import { quizSessionController } from "./quiz.session.controller";
import quizSessionValidationZodSchema from "./quiz.session.zod";
import { USER_ROLE } from "../user/user.constant";


const quizRouter = Router();

quizRouter.post(
  '/start',
  authMiddleware(USER_ROLE.STUDENT),
  validateRequest({
    body: quizSessionValidationZodSchema.quizSessionSchema,
  }),
  quizSessionController.startQuiz,
);

quizRouter.post(
  '/complete',
  authMiddleware(USER_ROLE.STUDENT),
  quizSessionController.completeQuiz,
);


quizRouter.get(
  '/review',
  authMiddleware(USER_ROLE.STUDENT),
  quizSessionController.getReviewQuiz,
);

quizRouter.patch(
  '/session-status',
  authMiddleware(USER_ROLE.STUDENT),
  quizSessionController.getSessionStatus,
);

export default quizRouter;