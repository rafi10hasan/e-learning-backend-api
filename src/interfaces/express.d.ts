import { IUser } from '../app/modules/user-module/user.interface';

declare global {
  namespace Express {
    interface Request {
      user: IUser;
    }
  }
}
