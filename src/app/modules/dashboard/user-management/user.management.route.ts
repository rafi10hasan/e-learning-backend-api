import { Router } from "express";
import authMiddleware from "../../../middlewares/auth.middleware";
import { USER_ROLE } from "../../user/user.constant";
import { userManagementController } from "./user.management.controller";



const userManagementRouter = Router();

userManagementRouter.get(
    '/overview',
    authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
    userManagementController.getUserStatsIntoDb,
);

userManagementRouter.get(
    '/list',
    authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
    userManagementController.getAllUsersIntoDb,
);


export default userManagementRouter;