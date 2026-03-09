import { randomUserImage } from '../../../utilities/randomUserImage';
import { BadRequestError } from '../../errors/request/apiError';
import { IUser } from '../user-module/user.interface';
import User from '../user-module/user.model';

import { deleteImageFromCloudinary } from '../../../cloudinary/deleteImageFromCloudinary';
import { getCloudinaryPublicId } from '../../../cloudinary/getCoudinaryPublicId';
import { uploadToCloudinary } from '../../../cloudinary/uploadImageToCLoudinary';
import { TAdminProfileImages } from './admin.interface';

// service for create new admin

const createAdmin = async (data: Partial<IUser>) => {
  const isAdminExist = await User.findOne({ email: data.email });
  if (isAdminExist) {
    throw new BadRequestError('This admin already exist');
  }
  const adminPayload = {
    ...data,
    profileImage: randomUserImage(),
  };

  const admin = await User.create(adminPayload);
  if (!admin) {
    throw new BadRequestError('Failed to create new admin!');
  }
  const { password, ...adminInfoAcceptPass } = admin.toObject();
  return adminInfoAcceptPass;
};

// service for get all admin
const getAllAdminAndSuperAdmin = async () => {
  const users = await User.find({
    role: { $in: ['admin', 'super-admin'] },
  })
    .select('-password')
    .lean();

  // Sort: return -1 to move 'super-admin' to the top
  return users.sort((a, b) => {
    if (a.role === 'super-admin' && b.role !== 'super-admin') return -1;
    if (a.role !== 'super-admin' && b.role === 'super-admin') return 1;
    return 0;
  });
};
// service for get specific admin
const getSpecificAdmin = async (user: IUser) => {
  const adminData = {
    fullName: user.fullName,
    profileImage: user.profileImage,
    email: user.email,
  };
  return adminData;
};

// service for get specific admin by email
const getAdminByEmail = async (email: string) => {
  return await User.findOne({ email });
};

const updateProfileImage = async (user: IUser, files: TAdminProfileImages) => {
  const profileImage = files?.profile_image?.[0];
  if (profileImage) {
    const upload = await uploadToCloudinary(profileImage, 'profile_images');
    if (upload.secure_url) {
      const publicId = getCloudinaryPublicId(user.profileImage as string);
      if (publicId) await deleteImageFromCloudinary(publicId);
      user.profileImage = upload.secure_url;
      await user.save();
    }
  }
  return {
    profileImage: user.profileImage,
  };
};

// service for update specific admin
const updateSpecificAdmin = async (user: IUser, data: Partial<IUser>) => {
  return await User.updateOne({ _id: user._id }, data, {
    runValidators: true,
    new: true
  });
};

// service for delete specific admin
const deleteSpecificAdmin = async (id: string) => {
  return await User.deleteOne({ _id: id });
};

export default {
  createAdmin,
  getAllAdminAndSuperAdmin,
  getSpecificAdmin,
  getAdminByEmail,
  updateSpecificAdmin,
  deleteSpecificAdmin,
  updateProfileImage,
};
