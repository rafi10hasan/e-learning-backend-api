import express from 'express';
import authRouter from '../modules/auth/auth.route';
import { contentRouter } from '../modules/content/content.route';
import subjectRouter from '../modules/subject/subject.route';
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
];

appRouters.forEach((router) => {
  routersVersionOne.use(router.path, router.router);
});

export default routersVersionOne;
