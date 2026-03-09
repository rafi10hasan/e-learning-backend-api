import httpStatus from 'http-status';
import nodemailer from 'nodemailer';
import config from '../../config';
import firebaseAdmin from '../../config/firebase.config';
import { getSocketIO } from '../../socket copy/socketConnection';
import { AppError } from '../../utils';
import getUserNotificationCount from '../../utils/getUnseenNotificationCount';
import { TNotification } from './notification.constant';
import { INotificationPayload } from './notification.interface';
import Notification from './notification.model';
import {
  NotificationPayloads,
  notificationTemplates,
} from './notification.template';

export const sendNotificationByEmail = async (
  email: string,
  type: TNotification,
  data: NotificationPayloads
) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.nodemailer.email,
        pass: config.nodemailer.password,
      },
    });

    const html = notificationTemplates[type](data);

    const mailOptions = {
      from: config.nodemailer.email,
      to: email,
      subject: `Steady Hands - ${type.replace('_', ' ')}`,
      html,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error);
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to send email'
    );
  }
};

export const sendNotificationBySocket = async (
  notificationData: INotificationPayload
) => {
  const io = getSocketIO();
  await Notification.create(notificationData);

  const updatedNotification = await getUserNotificationCount(
    notificationData.receiver.toString()
  );

  io.to(notificationData.receiver.toString()).emit(
    'notification',
    updatedNotification
  );
};

export const sendPushNotification = async (
  fcmToken: string,
  data: {
    title: string;
    content: string;
    time: string;
  }
) => {
  try {
    const message = {
      notification: {
        title: data.title,
        body: data.content,
      },
      token: fcmToken,
      data: {
        time: data.time,
      },
    };

    const response = await firebaseAdmin.messaging().send(message);

    return response;
  } catch (error: unknown) {
    throw new AppError(
      httpStatus.NO_CONTENT,
      error instanceof Error ? error.message : String(error)
    );
  }
};
