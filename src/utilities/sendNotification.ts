import { INotification } from '../app/modules/notification-module/notification.interface';
import Notification from '../app/modules/notification-module/notification.model';
import { getIO } from '../socket/socketconn';
import getUserNotificationCount from './getUserNotificationCount';

const sendNotification = async (notificationData: INotification) => {
  const io = getIO();
  await Notification.create(notificationData);

  const updatedNotification = await getUserNotificationCount(notificationData.receiver.toString());

  io.to(notificationData.receiver.toString()).emit('notification', updatedNotification);
};

export default sendNotification;
