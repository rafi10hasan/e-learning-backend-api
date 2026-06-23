import { Types } from 'mongoose';
import config from '../../../config';
import otpMailTemplate from '../../../mailTemplate/otpMailTemplate';
import { generateOTP } from '../../../utilities/generateOtp';
import sendMail from '../../../utilities/sendEmail';
import { BadRequestError, InternalServerError } from '../../errors/request/apiError';
import OtpToken from '../otpToken/otp.token.model';
import { SessionModel } from '../session/session.model';

export const sendVerificationOtp = async (userId: Types.ObjectId, email: string) => {
  const otp = generateOTP();
  const expiresInMinutes = Number(config.otp_expires_in);

  if (isNaN(expiresInMinutes) || expiresInMinutes <= 0) {
    throw new InternalServerError('OTP expiry configuration is invalid.');
  }

  await OtpToken.deleteOne({ userId, type: 'email_verification' });

  await OtpToken.create({
    userId,
    type: 'email_verification',
    otpHash: otp,
    expiresAt: new Date(Date.now() + expiresInMinutes * 60 * 1000),
  });

  try {
    await sendMail({
      from: config.gmail_app_user,
      to: email,
      subject: 'Verification Code',
      html: otpMailTemplate(otp, expiresInMinutes),
    });
  } catch {
    await OtpToken.deleteOne({ userId, type: 'email_verification' });
    throw new BadRequestError('Failed to send verification email. Try again.');
  }
};

export const invalidateUserOldSession = async (userId: string) => {
  await SessionModel.updateOne(
    { user: userId },
    { refreshToken: null, tokenExpiresAt: null }
  );
};
