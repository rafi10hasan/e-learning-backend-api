import config from '../../../config';
import registrationEmailTemplate from '../../../mailTemplate/registrationTemplate';
import { generateOTP } from '../../../utilities/generateOtp';
import { randomUserImage } from '../../../utilities/randomUserImage';
import sendMail from '../../../utilities/sendEmail';
import { BadRequestError, UnauthorizedError } from '../../errors/request/apiError';
import { USER_ROLE } from './user.constant';

import mongoose, { Types } from 'mongoose';
import { deleteImageFromCloudinary } from '../../../cloudinary/deleteImageFromCloudinary';
import { uploadToCloudinary } from '../../../cloudinary/uploadImageToCLoudinary';
import { guestRepository } from '../guest-module/guest.repository';

import { getCloudinaryPublicId } from '../../../cloudinary/getCoudinaryPublicId';
import { hostRepository } from '../host-module/host.repository';
import { calculateProfileCompletion } from '../host-module/host.utils';
import { IProfileUpdatePayload, IUser, registerPayload, TProfileImages } from './user.interface';
import { userRepository } from './user.repository';

// register Account
const createAccount = async (payload: registerPayload) => {
  console.log(payload);
  const session = await mongoose.startSession();
  session.startTransaction();

  // 1. Check if user already exists

  try {
    const existingUser = await userRepository.findByEmail(payload.email);

    if (existingUser && existingUser.isDeleted) {
      throw new UnauthorizedError('Unauthorized access');
    }

    if (existingUser) {
      throw new BadRequestError('User Already Exist with this email!');
    }

    // 3. Generate OTP and profile image
    const verificationOtp = generateOTP();
    const profileImage = randomUserImage();

    const fullName = payload.firstName + ' ' + payload.lastName;

    // 4. Prepare user payload
    const userPayload = {
      email: payload.email,
      fullName: fullName,
      phone: payload.phone,
      password: payload.password,
      verificationOtpExpiry: new Date(Date.now() + Number(config.otp_expires_in) * 60 * 1000),
      verificationOtp,
      profileImage: profileImage,
      role: payload.role,
    };
    // 5. Create user in DB
    const newUser = await userRepository.createUser(userPayload, session);
    if (!newUser) throw new BadRequestError('Failed to create user. Try again.');

    const profilePayload = {
      user: new Types.ObjectId(newUser._id),
      fullName,
      email: payload.email,
      phone: payload.phone,
      profileImage: profileImage,
      gender: payload.gender,
      dateOfBirth: payload.dateOfBirth,
      role: payload.role,
    };

    switch (payload.role) {
      case USER_ROLE.GUEST:
        const guestProfile = await guestRepository.createGuestProfile(profilePayload, session);
        if (!guestProfile) {
          throw new BadRequestError('Failed to create Guest profile. Try Again');
        }
        break;

      case USER_ROLE.HOST:
        const hostProfile = await hostRepository.createHostProfile(profilePayload, session);
        if (!hostProfile) {
          throw new BadRequestError('Failed to create Host profile. Try Again');
        }
        break;

      default:
        throw new BadRequestError('Invalid role provided.');
    }

    const mailOptions = {
      from: config.gmail_app_user,
      to: payload.email,
      subject: 'Email Verification Code',
      html: registrationEmailTemplate(verificationOtp, Number(config.otp_expires_in), 'Roomy'),
    };

    await sendMail(mailOptions);
    await session.commitTransaction();
    session.endSession();

    return {
      message: 'check your email to verify your Account',
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// update profile

const updateProfile = async (user: IUser, payload: IProfileUpdatePayload, files: TProfileImages) => {
  // Determine if the user is host or guest
  const isHost = user.role === 'host';
  const repository = isHost ? hostRepository : guestRepository;

  const profile = await repository.findByAuthID(user.id);
  if (!profile) throw new BadRequestError('Profile not found for this account');

  let profileImage = profile.profileImage;

  // Profile image upload
  if (files?.profile_image?.length) {
    const result = await uploadToCloudinary(files.profile_image[0], 'profile_images');
    if (result.secure_url) {
      const publicId = getCloudinaryPublicId(profileImage);
      if (publicId) {
        await deleteImageFromCloudinary(profileImage);
      }
      profileImage = result.secure_url;
    }
  }

  const keptImages: string[] = payload.photoGallery || [];
  const removedImages = profile.photoGallery.filter((img: string) => !keptImages.includes(img));
  if (removedImages.length > 0) {
    await Promise.all(removedImages.map((img: string) => deleteImageFromCloudinary(img)));
  }

  let uploadedImages: string[] = [];
  if (files?.profile_gallery?.length) {
    const uploads = await Promise.all(files.profile_gallery.map((file) => uploadToCloudinary(file, 'profile_gallery')));
    uploadedImages = uploads.map((img: any) => img.secure_url);
  }

  const images = [...keptImages, ...uploadedImages];
  const profilePayload = { ...payload, profileImage, photoGallery: images };

  try {
    // Update profile
    const result = await repository.updateProfile(profile._id, profilePayload); // or updateGuestProfile
    if (!result) throw new BadRequestError('Failed to update profile');

    // Update completion percentage
    const completionPercentage = calculateProfileCompletion(result);
    await repository.updateProfile(profile._id, { profileCompletionRate: completionPercentage });

    // Update user object
    user.fullName = result.fullName;
    user.profileImage = profileImage;
    await user.save();

    return null;
  } catch (error: any) {
    if (profileImage) await deleteImageFromCloudinary(profileImage);
    if (uploadedImages.length > 0) {
      await Promise.all(uploadedImages.map((img) => deleteImageFromCloudinary(img)));
    }
    throw new BadRequestError(error.message || 'Failed to update profile');
  }
};

// const updateProfile = async (user: IUser, payload: IProfileUpdatePayload, files: TProfileImages) => {
//   const profile = await hostRepository.findByAuthID(user.id);
//   if (!profile) {
//     throw new BadRequestError('profile not found for this account');
//   }

//   let profileImage = profile.profileImage;

//   if (files?.profile_image?.length) {
//     const result = await uploadToCloudinary(files.profile_image[0], 'profile_images');

//     if (result.secure_url) {
//       await deleteImageFromCloudinary(profileImage);
//       profileImage = result.secure_url;
//     }
//   }

//   // Images frontend wants to keep
//   const keptImages: string[] = payload.photoGallery || [];

//   // Images removed by frontend
//   const removedImages = profile.photoGallery.filter((img) => !keptImages.includes(img));

//   // Delete removed images from Cloudinary
//   if (removedImages.length > 0) {
//     await Promise.all(removedImages.map((img) => deleteImageFromCloudinary(img)));
//   }

//   // Upload new images
//   let uploadedImages: string[] = [];
//   if (files?.profile_gallery?.length) {
//     const uploads = await Promise.all(files.profile_gallery.map((file) => uploadToCloudinary(file, 'profile_gallery')));
//     uploadedImages = uploads.map((img: any) => img.secure_url);
//   }

//   // Final images list
//   const images = [...keptImages, ...uploadedImages];
//   const profilePayload = {
//     ...payload,
//     profileImage,
//     photoGallery: images,
//   };

//   try {
//     const result = await hostRepository.updateHostProfile(profile._id, profilePayload);
//     if (!result) {
//       throw new BadRequestError('failed to profile update');
//     }
//     const completionPercentage = calculateProfileCompletion(result);
//     await hostRepository.updateHostProfile(profile._id, { profileCompletionRate: completionPercentage });
//     user.fullName = result.fullName;
//     user.profileImage = profileImage;
//     await user.save();
//     return null;
//   } catch (error: any) {
//     if (profileImage) await deleteImageFromCloudinary(profileImage);
//     if (uploadedImages.length > 0) {
//       await Promise.all(uploadedImages.map((img) => deleteImageFromCloudinary(img)));
//     }

//     throw new BadRequestError(error.message || 'Failed to profile update.');
//   }
// };

export const userService = {
  createAccount,
  updateProfile,
};
