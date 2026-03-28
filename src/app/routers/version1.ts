import express from 'express';
import authRouter from '../modules/auth/auth.route';
import { contentRouter } from '../modules/content/content.route';
import departmentRouter from '../modules/department/department.route';
import facultyRouter from '../modules/faculty/faculty.route';
import questionRouter from '../modules/question/question.route';
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
];

appRouters.forEach((router) => {
  routersVersionOne.use(router.path, router.router);
});

export default routersVersionOne;
