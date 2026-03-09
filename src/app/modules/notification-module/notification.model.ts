import { model, Schema } from 'mongoose';
import { INotification } from './notification.interface';
import { NOTIFICATION_TYPE } from './notification.constant';

const notificationSchema = new Schema<INotification>(
  {
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isSeen: {
      type: Boolean,
      default: false,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPE),
      required: true,
    },
    redirectId: {
      type: String,
      default: null,
    },
  },

  {
    timestamps: true,
    versionKey: false,
  }
);

const Notification = model<INotification>('Notification', notificationSchema);

export default Notification;
