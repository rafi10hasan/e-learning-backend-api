import { Document, Model, Types } from 'mongoose';
<<<<<<< HEAD
import { TProvider, TUserRole, TUserStatus } from './user.constant';
=======
import { TProvider, TUserRole } from './user.constant';
>>>>>>> c4d66ed249b34077675a2dae65462ed850027e47


export type TProfileImage = {
  profile_image: Express.Multer.File[];
};

export interface registerSocialPayload {
  email: string;
  fullName: string;
  provider: TProvider;
}


//Instance methods
export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  fullName: string;
  avatar?: string;
  password: string;
  passwordChangedAt?: Date;
<<<<<<< HEAD
  verification: {
    emailVerifiedAt: Date | null;
    phoneVerifiedAt: Date | null;
  };
=======
  passwordResetOtp?: string;
  passwordResetExpiry?: Date;
  isOtpVerified?: boolean;
  verification: {
    emailVerifiedAt: Date | null;
    phoneVerifiedAt: Date | null;
  },
  verificationOtp?: string;
  verificationOtpExpiry?: Date;
>>>>>>> c4d66ed249b34077675a2dae65462ed850027e47
  role: TUserRole;
  provider?: TProvider;
  isSocialLogin: boolean;
  status: TUserStatus;
  disabledAt: Date | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  isPasswordMatched(plainTextPassword: string): Promise<boolean>;
  isJWTIssuedBeforePasswordChanged(jwtIssuedTimestamp: number | undefined): boolean;
}

// Static methods
export interface IUserModel extends Model<IUser> {
  isUserExistsByEmail(email: string): Promise<IUser | null>;
}
