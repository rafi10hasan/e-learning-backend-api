import { Request, Response } from 'express';
import httpStatus from 'http-status';
import notificationServices from './notification.services';
import { asyncHandler } from '../../utils';
import sendResponse from '../../utils/sendResponse';

const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.id;
  const data = await notificationServices.getAllNotifications(req.query, userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Notification seen successfully',
    data: data,
  });
});

const markAsSeen = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = await notificationServices.markNotificationAsSeen(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Notification seen successfully',
    data: data,
  });
});

const getUnseenNotificationCount = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.id;
  const count = await notificationServices.getAllUnseenNotificationCount(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Unseen notification count fetched successfully',
    data: count,
  });
});

export default {
  getNotifications,
  markAsSeen,
  getUnseenNotificationCount,
};
