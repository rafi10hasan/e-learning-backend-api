import express from 'express';
import authRouter from '../modules/auth/auth.route';
import { contentRouter } from '../modules/content/content.route';
import adminRouter from '../modules/dashboard';
import departmentRouter from '../modules/department/department.route';
import facultyRouter from '../modules/faculty/faculty.route';
import passageRouter from '../modules/passage/passage.route';
import questionRouter from '../modules/question/question.route';
import quizRouter from '../modules/quiz-session/quiz.session.route';
import subjectRouter from '../modules/subject/subject.route';
import testRouter from '../modules/test/test.route';
import userRouter from '../modules/user/user.route';


const routersVersionOne = express.Router();

const appRouters = [
  {
    path: '/user',
    router: userRouter,
  },
  {
    path: '/admin',
    router: adminRouter,
  },
  {
    path: '/auth',
    router: authRouter,
  },

  {
    path: '/content',
    router: contentRouter,
  },
  {
    path: '/subject',
    router: subjectRouter,
  },

  {
    path: '/faculty',
    router: facultyRouter,
  },

  {
    path: '/department',
    router: departmentRouter,
  },

  {
    path: '/question',
    router: questionRouter,
  },

  {
    path: '/test-archive',
    router: testRouter,
  },

  {
    path: '/quiz',
    router: quizRouter,
  },

  {
    path: '/passage',
    router: passageRouter,
  },

];

appRouters.forEach((router) => {
  routersVersionOne.use(router.path, router.router);
});

export default routersVersionOne;
