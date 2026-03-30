import config from '../../../config';
import registrationEmailTemplate from '../../../mailTemplate/registrationTemplate';
import { generateOTP } from '../../../utilities/generateOtp';
import { randomUserImage } from '../../../utilities/randomUserImage';
import sendMail from '../../../utilities/sendEmail';
import { BadRequestError } from '../../errors/request/apiError';

import { sendVerificationOtp } from '../auth/auth.utils';
import { USER_ROLE } from './user.constant';
import { userRepository } from './user.repository';
import { TRegistrationPayload } from './user.validations';

// create account
const createAccount = async (payload: TRegistrationPayload) => {
  const existingUser = await userRepository.findByEmail(payload.email);

  if (existingUser?.isDeleted) {
    throw new BadRequestError('This email is blocked. Please contact support to reactivate.');
  }

  if (existingUser && !existingUser.isEmailVerified) {
    await sendVerificationOtp(existingUser, payload.email);
    return { status: 'UNVERIFIED' };
  }

  if (existingUser?.isEmailVerified) {
    throw new BadRequestError('An account with this email already exists.');
  }

  const profileImage = randomUserImage();
  const verificationOtp = generateOTP();

  const mailOptions = {
    from: config.gmail_app_user,
    to: payload.email,
    subject: 'Email Verification',
    html: registrationEmailTemplate(verificationOtp, Number(config.otp_expires_in), 'ride_share'),
  };

  try {
    await sendMail(mailOptions);
  } catch (error) {
    throw new BadRequestError('Failed to send verification email. Please try again!.');
  }


  const userPayload = {
    ...payload,
    verificationOtp,
    verificationOtpExpiry: new Date(Date.now() + Number(config.otp_expires_in) * 60 * 1000),
    avatar: profileImage,
    role: USER_ROLE.STUDENT,
  };

  const newUser = await userRepository.createUser(userPayload);
  if (!newUser) throw new BadRequestError('Failed to create user. Try again later.');

  return { id: newUser._id, email: newUser.email };

};



export const userService = {
  createAccount
};
