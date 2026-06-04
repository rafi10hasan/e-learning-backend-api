import { randomUserImage } from '../../../utilities/randomUserImage';
import { BadRequestError } from '../../errors/request/apiError';

import { sendVerificationOtp } from '../auth/auth.utils';
import { USER_ROLE, USER_STATUS } from './user.constant';
import { IUser } from './user.interface';
import User from './user.model';
import { TRegistrationPayload } from './user.validations';

// create account
const createAccount = async (payload: TRegistrationPayload) => {
  const existingUser = await User.findOne({ email: payload.email }).select('+password');

  if (existingUser) {
    if (existingUser.deletedAt) {
      // Restore user
      existingUser.deletedAt = null;
      existingUser.status = USER_STATUS.ACTIVE;
      existingUser.password = payload.password;
      existingUser.verification.emailVerifiedAt = null; // reset verification

      try {
        await sendVerificationOtp(existingUser._id, payload.email);
      } catch {
        // Mail failed — don't restore, keep as deleted
        throw new BadRequestError('Failed to send verification email. Try again.');
      }

      // Save only after mail succeeds
      await existingUser.save();
      return { status: 'UNVERIFIED' };
    }

    if (existingUser.status === USER_STATUS.BLOCKED) {
      throw new BadRequestError('This account is blocked. Contact support.');
    }

    if (existingUser.status === USER_STATUS.DISABLED) {
      throw new BadRequestError('This account is currently disabled. Please login again to enable it.');
    }

    if (!existingUser.verification.emailVerifiedAt) {
      await sendVerificationOtp(existingUser._id, payload.email);
      return { status: 'UNVERIFIED' };
    }

    throw new BadRequestError('An account with this email already exists.');
  }

  // Create user without saving to DB first
  const newUser = new User({
    ...payload,
    avatar: randomUserImage(),
    role: USER_ROLE.STUDENT,
    status: USER_STATUS.ACTIVE,
  });

  try {
    await sendVerificationOtp(newUser._id, payload.email);
  } catch {
    // Mail failed — don't save user to DB
    throw new BadRequestError('Failed to send verification email. Try again.');
  }

  // Save only after mail succeeds
  await newUser.save();

  return { id: newUser._id, email: newUser.email };
};


const choosePlan = async (user: IUser, plan: string) =>{
  user.plan = plan;
  await user.save();
  return null;
};

export const userService = {
  createAccount,
  choosePlan
};
