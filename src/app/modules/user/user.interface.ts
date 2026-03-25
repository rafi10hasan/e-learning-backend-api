import { Document, Model, Types } from 'mongoose';
import { TBadge, TProvider, TSubscriptionMode, TSubscriptionPlan, TSubscriptionStatus, TUserRole } from './user.constant';


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
  city: string;
  password: string;
  passwordChangedAt?: Date;
  passwordResetOtp?: string;
  passwordResetExpiry?: Date;
  isOtpVerified?: boolean;
  isEmailVerified: boolean;
  verificationOtp?: string;
  verificationOtpExpiry?: Date;
  role: TUserRole;
  provider?: TProvider;
  isSocialLogin: boolean;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  isPasswordMatched(plainTextPassword: string): Promise<boolean>;
  isVerificationOtpMatched(plainTextOtp: string): Promise<boolean>;
  isResetPasswordOtpMatched(plainTextOtp: string): Promise<boolean>;
  isJWTIssuedBeforePasswordChanged(jwtIssuedTimestamp: number | undefined): boolean;
}

// Static methods
export interface IUserModel extends Model<IUser> {
  isUserExistsByEmail(email: string): Promise<IUser | null>;
}
