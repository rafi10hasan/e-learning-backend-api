import { Document, Model, Types } from 'mongoose';
import { ISocialLinks } from '../host-module/host.interface';
import { TProvider, TUserRole } from './user.constant';

export interface registerPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  role: 'guest' | 'host';
}

export interface userDataPayload {
  fullName: string;
  email: string;
  phone: string;
  verificationOtp: string;
  verificationOtpExpiry: Date;
  role: 'guest' | 'host';
}

export type TProfileImages = {
  profile_image: Express.Multer.File[];
  profile_gallery: Express.Multer.File[];
};

export interface profilePayload {
  user: Types.ObjectId;
  fullName: string;
  email: string;
  gender: string;
  phone: string;
  dateOfBirth: string;
  role: 'guest' | 'host';
}

export interface registerSocialPayload {
  email: string;
  fullName: string;
  provider: TProvider;
}

export interface IProfileUpdatePayload {
  fullName: string;
  dateOfBirth: Date;
  bio: string;
  antecode: string;
  address: string;
  occupation: string;
  socialLinks: ISocialLinks;
  photoGallery: string[];
  profileImage?: string;
  profileCompletionRate?: number;
}

// Instance methods
export interface IUser extends Document {
  _id: string;
  email: string;
  fullName: string;
  phone: string;
  profileImage?: string;
  password: string;
  passwordChangedAt?: Date;
  fcmToken?: string | null;
  passwordResetOtp?: string;
  passwordResetExpiry?: Date;
  isOtpVerified: boolean;
  isEmailVerified: boolean;
  verificationOtp?: string;
  verificationOtpExpiry?: Date;
  role: TUserRole;
  provider?: TProvider;
  isSocialLogin: boolean;
  isVerificationCompleted: boolean;
  stripeCustomerId: string;
  stripeAccountId: string;
  isStripeConnected: boolean;
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
