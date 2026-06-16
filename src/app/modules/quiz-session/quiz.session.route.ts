import { Router } from "express";
import authMiddleware from "../../middlewares/auth.middleware";
import { validateRequest } from "../../middlewares/request.validator";
import { USER_ROLE } from "../user/user.constant";
import { quizSessionController } from "./quiz.session.controller";
import quizSessionValidationZodSchema from "./quiz.session.zod";


const quizRouter = Router();

quizRouter.get(
  '/template',
  authMiddleware(USER_ROLE.STUDENT),
  quizSessionController.getQuizzes,
);

quizRouter.post(
  '/start-full-simulation/:testId',
  authMiddleware(USER_ROLE.STUDENT),
  quizSessionController.startFullSimulationQuiz,
);

quizRouter.post(
  '/start',
  authMiddleware(USER_ROLE.STUDENT),
  validateRequest({
    body: quizSessionValidationZodSchema.quizSessionSchema,
  }),
  quizSessionController.startQuiz,
);

quizRouter.post(
  '/complete/:sessionId',
  authMiddleware(USER_ROLE.STUDENT),
  quizSessionController.completeQuiz,
);


quizRouter.post(
  '/review/:sessionId',
  authMiddleware(USER_ROLE.STUDENT),
  quizSessionController.getReviewQuiz,
);

quizRouter.patch(
  '/session-status',
  authMiddleware(USER_ROLE.STUDENT),
  quizSessionController.getSessionStatus,
);

quizRouter.get(
  '/summary/:sessionId',
  authMiddleware(USER_ROLE.STUDENT),
  quizSessionController.getQuizSummary,
);


quizRouter.get(
  '/map/:sessionId',
  authMiddleware(USER_ROLE.STUDENT),
  quizSessionController.getQuizMapIntodb,
);

export default quizRouter;