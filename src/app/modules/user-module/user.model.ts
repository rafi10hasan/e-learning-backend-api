import bcrypt from 'bcrypt';
import parsePhoneNumberFromString from 'libphonenumber-js';
import mongoose from 'mongoose';
import validator from 'validator';
import { PROVIDER, USER_ROLE } from './user.constant';
import { IUser, IUserModel } from './user.interface';

export const fullNameMinLength: number = 3;
export const fullNameMaxLength: number = 20;
export const passwordLength = 8;

export const userSchema = new mongoose.Schema<IUser>(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [fullNameMinLength, `Full name must be at least ${fullNameMinLength} characters`],
      maxlength: [fullNameMaxLength, `Full name cannot exceed characters ${fullNameMaxLength}`],
      validate: {
        validator: function (value: string) {
          return /^[A-Za-z\s]+$/.test(value);
        },
        message: 'Full name can contain only letters and spaces',
      },
    },

    email: {
      type: String,
      required: [true, 'Email is required!'],
      lowercase: true,
      trim: true,
      validate: {
        validator: (value: string) => validator.isEmail(value),
        message: (props: { value: string }) => `${props.value} is not a valid email!`,
      },
    },
    password: {
      type: String,
      trim: true,
      required: true,
      minlength: [passwordLength, `Password must be at least ${passwordLength} characters`],
      validate: {
        validator: function (value) {
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(value);
        },
        message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character',
      },
    },

    phone: {
      type: String,
      unique: true,
      required: false,
      validate: {
        validator: (value: string): boolean => {
          const phone = parsePhoneNumberFromString(value, 'AU');
          return !!phone && phone.isValid() && phone.getType() === 'MOBILE';
        },
        message: (props) => `${props.value} is not a valid Australian mobile number`,
      },
    },

    profileImage: {
      type: String,
      default: '',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    fcmToken: {
      type: String,
      default: null,
    },
    provider: {
      type: String,
      enum: Object.values(PROVIDER),
    },
    isSocialLogin: {
      type: Boolean,
      default: false,
    },
    verificationOtp: {
      type: String,
    },
    verificationOtpExpiry: {
      type: Date,
    },

    passwordResetOtp: {
      type: String,
    },
    passwordResetExpiry: {
      type: Date,
    },
    isOtpVerified: {
      type: Boolean,
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLE),
    },

    isVerificationCompleted: {
      type: Boolean,
      default: false,
    },
    stripeCustomerId: {
      type: String,
    },
    stripeAccountId: {
      type: String,
    },
    isStripeConnected: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    passwordChangedAt: { type: Date },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

userSchema.pre('save', async function () {
  const saltRounds = 8;

  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, saltRounds);
  }

  if (this.isModified('verificationOtp') && this.verificationOtp) {
    this.verificationOtp = await bcrypt.hash(this.verificationOtp, saltRounds);
  }

  if (this.isModified('passwordResetOtp') && this.passwordResetOtp) {
    this.passwordResetOtp = await bcrypt.hash(this.passwordResetOtp, saltRounds);
  }
});

// isUserExistsByEmail
userSchema.statics.isUserExistsByEmail = async function (email: string): Promise<IUser | null> {
  return await User.findOne({ email }).select('+password');
};

// isPasswordMatched
userSchema.methods.isPasswordMatched = async function (plainTextPassword: string): Promise<boolean> {
  return await bcrypt.compare(plainTextPassword, this.password);
};

userSchema.methods.isVerificationOtpMatched = async function (plainTextOtp: string): Promise<boolean> {
  return await bcrypt.compare(plainTextOtp, this.verificationOtp);
};

userSchema.methods.isResetPasswordOtpMatched = async function (plainTextOtp: string): Promise<boolean> {
  return await bcrypt.compare(plainTextOtp, this.passwordResetOtp);
};

// isJWTIssuedBeforePasswordChanged
userSchema.methods.isJWTIssuedBeforePasswordChanged = function (jwtIssuedTimestamp: number): boolean {
  const passwordChangedTime = new Date(this.passwordChangedAt).getTime() / 1000;
  return passwordChangedTime > jwtIssuedTimestamp;
};

userSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  },
});

userSchema.index({
  firstName: 'text',
  lastName: 'text',
  email: 'text',
});

const User = mongoose.model<IUser, IUserModel>('User', userSchema);
export default User;
