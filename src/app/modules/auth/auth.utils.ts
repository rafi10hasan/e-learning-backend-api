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

  // If OTP exists in DB, TTL guarantees it's still valid (expired ones are auto-deleted)
  const existingOtp = await OtpToken.findOne({ userId, type: 'email_verification' });

  if (existingOtp) {
    throw new BadRequestError('OTP still valid. Please wait before requesting a new one.');
  }

  // Safety net — delete any stale OTP before creating new one
  await OtpToken.deleteOne({ userId, type: 'email_verification' });

  // Use create so pre('save') hook fires and hashes the OTP automatically
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
      html: otpMailTemplate(otp, expiresInMinutes), // plain OTP sent to user
    });
  } catch {
    // Mail failed — delete OTP so user can retry
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
