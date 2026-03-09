import express from 'express';

import { auth } from '../../middlewares';
import { ROLE } from '../auth-module/auth.interface';
import notificationController from './notification.controller';

const notificationRouter = express.Router();

notificationRouter.get('/get-notifications/:id', auth(ROLE.ARTIST, ROLE.CLIENT), notificationController.getNotifications);
notificationRouter.patch('/mark-notification', auth(ROLE.ARTIST, ROLE.CLIENT), notificationController.markAsSeen);
notificationRouter.get('/unseen-notification-count/:id', auth(ROLE.ARTIST, ROLE.CLIENT), notificationController.getUnseenNotificationCount);

export default notificationRouter;
