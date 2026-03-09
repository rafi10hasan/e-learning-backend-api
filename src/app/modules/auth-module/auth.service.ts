import config from '../../../config';
import jwtHelpers from '../../../helpers/jwtHelpers';
import otpMailTemplate from '../../../mailTemplate/otpMailTemplate';
import { generateOTP } from '../../../utilities/generateOtp';
import sendMail from '../../../utilities/sendEmail';
import { BadRequestError, UnauthorizedError } from '../../errors/request/apiError';
import { SessionModel } from '../session-module/session.model';

import { IUser } from '../user-module/user.interface';
import { userRepository } from '../user-module/user.repository';
import { jwtPayload, loginPayload } from './auth.interface';
import { sendVerificationOtp } from './auth.utils';

// login with credential
const loginWithCredential = async (credential: loginPayload) => {
  const { email, password, fcmToken } = credential;

  const user = await userRepository.findByEmail(email);
  if (!user) throw new UnauthorizedError('user not found with this email');

  if (user.isDeleted) {
    throw new UnauthorizedError('Unauthorized Access');
  }
  if (!user.isActive) {
    throw new UnauthorizedError('Unauthorized Access');
  }

  if (!user.password && user.isSocialLogin) {
    throw new BadRequestError('please login with your social account');
  }

  const isPasswordMatch = await user.isPasswordMatched(password);
  if (!isPasswordMatch) throw new BadRequestError(`password didn't match`);

  if (!user.isEmailVerified) {
    await sendVerificationOtp(user, email);
    return {
      status: 'unverified',
      message: 'Your Account is not verified. Please verify your email to login',
    };
  }

  user.fcmToken = fcmToken;
  await user.save();

  const JwtPayload: jwtPayload = {
    id: user._id.toString(),
    role: user.role,
  };
  const tokens = await jwtHelpers.generateTokens(JwtPayload);
  return {
    ...tokens,
    isVerificationCompleted: user.isVerificationCompleted,
  };
};

// login with admin
const AdminSignInWithCredential = async (credential: loginPayload) => {
  const { email, password } = credential;

  const user = await userRepository.findByEmail(email);
  if (!user) throw new UnauthorizedError('user not found with this email');

  if (!['admin', 'super-admin'].includes(user.role)) {
    throw new UnauthorizedError('Unauthorized Access');
  }
  if (user.isDeleted) {
    throw new UnauthorizedError('Unauthorized Access');
  }

  if (!user.isActive) {
    throw new UnauthorizedError('Unauthorized Access');
  }

  if (!user.password && user.isSocialLogin) {
    throw new BadRequestError('please login with your social account');
  }

  const isPasswordMatch = await user.isPasswordMatched(password);
  if (!isPasswordMatch) throw new BadRequestError(`password didn't match`);

  const JwtPayload: jwtPayload = {
    id: user._id.toString(),
    role: user.role,
  };
  const tokens = await jwtHelpers.generateTokens(JwtPayload);
  return {
    ...tokens,
  };
};

// verify account by otp
const verifyAccountByOtp = async (email: string, otp: string) => {
  // const user = await Auth.findOne({ email: userEmail });
  const user = await userRepository.findByEmail(email);

  if (!user) {
    throw new BadRequestError('User Not Found!');
  }

  if (user.isEmailVerified) {
    throw new BadRequestError('This account is already verified!');
  }

  const isVerificationOtpMatched = await user.isVerificationOtpMatched(otp);

  // If OTP is invalid, throw error
  if (!isVerificationOtpMatched) {
    throw new BadRequestError('OTP is invalid');
  }

  // Check if OTP is expired
  const now = new Date();
  if (!user.verificationOtpExpiry || user.verificationOtpExpiry < now) {
    throw new BadRequestError('OTP has expired. Please Request a fresh Otp!');
  }

  // Mark user as verified
  user.isEmailVerified = true;
  user.verificationOtp = undefined;
  user.verificationOtpExpiry = undefined;
  await user.save();

  const JwtPayload: jwtPayload = {
    id: user._id.toString(),
    role: user.role,
  };

  const tokens = await jwtHelpers.generateTokens(JwtPayload);
  // Generate access and refresh tokens

  // Return tokens to client
  return {
    ...tokens,
    isVerificationCompleted: user.isVerificationCompleted,
  };
};

// resend signip otp
const resendEmailVerificationOtpAgain = async (email: string) => {
  const user = await userRepository.findByEmail(email);

  if (!user) {
    throw new BadRequestError('User not found!');
  }

  if (user.isEmailVerified) {
    throw new BadRequestError('This account is already verified!');
  }

  const now = new Date();

  // Check if OTP is expired or missing
  const isExpired = !user.verificationOtpExpiry || user.verificationOtpExpiry < now;

  if (!isExpired) {
    throw new BadRequestError('Current OTP is still valid.');
  }

  // Generate new OTP
  const verificationOtp = generateOTP();
  const expiresInMinutes = Number(config.otp_expires_in);

  // Save OTP + expiry
  user.verificationOtp = verificationOtp;
  user.verificationOtpExpiry = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  await user.save();

  // Send email
  const mailOptions = {
    from: config.gmail_app_user,
    to: user.email,
    subject: 'Email Verification',
    html: otpMailTemplate(verificationOtp, expiresInMinutes),
  };

  await sendMail(mailOptions);

  return null;
};

const resetPasswordOtpAgain = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await userRepository.findByEmail(normalizedEmail, ['passwordResetOtp', 'passwordResetExpiry', 'email']);

  if (!user) {
    throw new UnauthorizedError('User not found!');
  }

  // If no OTP was ever generated → user never initiated forgot password
  if (!user.passwordResetExpiry) {
    throw new BadRequestError('Please request a forget password before attempting to a new OTP.');
  }

  const now = new Date();

  // If OTP is still valid → do not resend
  if (user.passwordResetExpiry > now) {
    throw new BadRequestError('Current OTP is still valid.');
  }

  // Generate new OTP
  const otp = generateOTP();
  const expiresInMinutes = Number(config.otp_expires_in);

  user.passwordResetOtp = otp;
  user.passwordResetExpiry = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  await user.save();

  await sendMail({
    from: config.gmail_app_user,
    to: user.email,
    subject: 'Password Reset Code',
    html: otpMailTemplate(otp, expiresInMinutes),
  });

  return null;
};

// forget password
const forgotPassword = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await userRepository.findByEmail(normalizedEmail);

  if (!user) {
    throw new UnauthorizedError('User not found!');
  }

  if (user.isSocialLogin && !user.password) {
    throw new BadRequestError("Social user don't have password to change!");
  }

  const now = new Date();
  const expiresInMinutes = Number(config.otp_expires_in);
  // Generate new OTP

  const otp = generateOTP();

  const otpExpiry = new Date(now.getTime() + expiresInMinutes * 60 * 1000);

  user.passwordResetOtp = otp;
  user.passwordResetExpiry = otpExpiry;
  await user.save();

  const mailOptions = {
    from: config.gmail_app_user,
    to: email,
    subject: 'Password Reset verification Code',
    html: otpMailTemplate(otp, expiresInMinutes),
  };

  // Send OTP
  await sendMail(mailOptions);
  return null;
};

// verifyOtpForForgetPassword
const verifyForgetPasswordByOtp = async (email: string, otp: string) => {
  const user = await userRepository.findByEmail(email, ['passwordResetOtp', 'passwordResetExpiry']);
  console.log({ user: user });
  if (!user) {
    throw new UnauthorizedError('User not found!');
  }

  // Check if OTP is expired
  const now = new Date();
  if (!user.passwordResetExpiry || user.passwordResetExpiry < now) {
    throw new BadRequestError('OTP has expired. Please request a Fresh OTP!');
  }

  const isResetPasswordOtpMatched = await user.isResetPasswordOtpMatched(otp);

  // If OTP is invalid, throw error
  if (!isResetPasswordOtpMatched) {
    throw new BadRequestError('OTP is Incorrect');
  }
  user.isOtpVerified = true;
  await user.save();
  return null;
};

// resetPasswordIntoDB
const resetWithNewPassword = async (email: string, newPassword: string) => {
  const user = await userRepository.findByEmail(email);
  if (!user) throw new BadRequestError('User not found');

  if (!user.isOtpVerified) {
    throw new BadRequestError('reset password otp is not verified! please verify again');
  }

  if (!user.passwordResetOtp && !user.passwordResetExpiry) {
    throw new BadRequestError('No password reset request found');
  }

  user.password = newPassword;

  user.passwordResetOtp = undefined;
  user.passwordResetExpiry = undefined;
  await user.save();

  const JwtPayload: jwtPayload = {
    id: user._id.toString(),
    role: user.role,
  };
  const tokens = await jwtHelpers.generateTokens(JwtPayload);
  return {
    ...tokens,

    isVerificationCompleted: user.isVerificationCompleted,
  };
};

//change Password
const changePassword = async (currentUser: IUser, currentPassword: string, newPassword: string) => {
  console.log('access');
  const user = await userRepository.findById(currentUser._id.toString());
  if (!user) throw new UnauthorizedError('User not found!');

  if (user.isSocialLogin && !user.password) {
    throw new BadRequestError("Social user don't have password to change!");
  }

  const isMatchCurrentPassword = await user.isPasswordMatched(currentPassword);
  if (!isMatchCurrentPassword) throw new BadRequestError('Current password is incorrect');

  const isMatchCurrentPasswordAndNewPassword = await user.isPasswordMatched(newPassword);
  if (isMatchCurrentPasswordAndNewPassword) throw new BadRequestError(`Don't use current password. Provide a new password`);

  user.password = newPassword;
  user.passwordChangedAt = user.passwordChangedAt = new Date(Date.now() - 15000);
  await user.save();

  const JwtPayload: jwtPayload = {
    id: user._id.toString(),
    role: user.role,
  };
  const tokens = await jwtHelpers.generateTokens(JwtPayload);
  return tokens;
};

// get Access Token By Refresh Token

const generateNewAccessTokenByRefreshToken = async (refreshToken: string) => {
  if (!refreshToken) {
    throw new UnauthorizedError('Unauthorized request');
  }
  // decode the refresh token
  const decoded = jwtHelpers.verifyToken(refreshToken, config.jwt_refresh_token_secret!) as any;

  const { id, iat } = decoded;

  // fetch user
  const user = await userRepository.findById(id, '-password');
  if (!user) throw new UnauthorizedError('User not found');

  // check if user is active or deleted
  if (!user.isActive || user.isDeleted) {
    throw new UnauthorizedError('Unauthorized access');
  }

  // fetch session
  const session = await SessionModel.findOne({ user: id });
  if (!session || session.refreshToken !== refreshToken) {
    throw new UnauthorizedError('Refresh token expired or used');
  }

  if (user.passwordChangedAt && iat < user.passwordChangedAt.getTime() / 1000) {
    throw new UnauthorizedError('Token issued before password change');
  }

  const JwtPayload: jwtPayload = {
    id: user._id.toString(),
    role: user.role,
  };

  // generate new tokens
  const tokens = await jwtHelpers.generateTokens(JwtPayload);
  return tokens;
};

export const userAuthService = {
  loginWithCredential,
  AdminSignInWithCredential,
  verifyAccountByOtp,
  resendEmailVerificationOtpAgain,
  changePassword,
  verifyForgetPasswordByOtp,
  forgotPassword,
  resetWithNewPassword,
  resetPasswordOtpAgain,
  generateNewAccessTokenByRefreshToken,
};
