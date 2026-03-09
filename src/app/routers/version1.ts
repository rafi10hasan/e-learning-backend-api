import express from 'express';

import adminRouter from '../modules/admin-module/admin.routes';
import authRouter from '../modules/auth-module/auth.route';
import userRouter from '../modules/user-module/user.route';
import hostRouter from '../modules/host-module/host.routes';
import verificationRouter from '../modules/verification-module/verification.routes';
import categoryRouter from '../modules/category-module/category.routes';
import blogRouter from '../modules/blog-module/blog.routes';
import termsConditionRouter from '../modules/terms-condition-module/termsCondition.routes';
import privacyPolicyRouter from '../modules/privacy-policy-module/privacyPolicy.routes';
import listingRouter from '../modules/listing-module/listing.routes';

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
    path: '/admin',
    router: adminRouter,
  },

    {
    path: '/host',
    router: hostRouter,
  },
  {
    path: '/blog',
    router: blogRouter,
  },
  {
    path: '/categories',
    router: categoryRouter,
  },
  {
    path: '/listings',
    router: listingRouter,
  },
  {
    path: '/verification',
    router: verificationRouter,
  },
  {
    path: '/terms-condition',
    router: termsConditionRouter,
  },
  {
    path: '/privacy-policy',
    router: privacyPolicyRouter,
  },
];

appRouters.forEach((router) => {
  routersVersionOne.use(router.path, router.router);
});

export default routersVersionOne;
