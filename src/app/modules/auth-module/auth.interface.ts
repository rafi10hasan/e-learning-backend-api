import { TProvider } from '../user-module/user.constant';

export interface jwtPayload {
  id: string;
  role: string;
}

export interface loginPayload {
  email: string;
  password: string;
  fcmToken?: string;
}

export interface socialLoginPayload {
  provider: TProvider;
  token: string;
  fcmToken: string;
}
