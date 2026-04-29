import { Types } from "mongoose";

export interface IOtpToken extends Document {
  userId: Types.ObjectId;
  type: 'email_verification' | 'password_reset';
  otpHash: string;
  expiresAt: Date;
  createdAt: Date;

  isVerificationOtpMatched(plainTextOtp: string): Promise<boolean>;
}