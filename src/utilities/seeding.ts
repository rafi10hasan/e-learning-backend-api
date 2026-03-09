import { USER_ROLE } from '../app/modules/user-module/user.constant';
import User from '../app/modules/user-module/user.model';
import config from '../config';
import { randomUserImage } from './randomUserImage';

const adminData = {
  fullName: 'ADMIN',
  role: USER_ROLE.SUPER_ADMIN,
  email: config.admin_email,
  password: config.admin_password,
  profileImage: randomUserImage(),
  isEmailVerified: true,
  isActive: true,
};

const seedingAdmin = async () => {
  try {
    const admin = await User.findOne({
      role: USER_ROLE.SUPER_ADMIN,
      email: config.admin_email,
    });
    if (!admin) {
      await User.create(adminData);

      console.log('admin seeded successfully!');
    } else {
      console.log('admin already exists!');
    }
  } catch (error) {
    console.log('Error seeding super admin', error);
  }
};

export default seedingAdmin;
