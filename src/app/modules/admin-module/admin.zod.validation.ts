import validator from 'validator';
import { z } from 'zod';
import { passwordLength } from '../user-module/user.model';
// Base schema for shared validation logic
const createAdminSchema = z.object({
  fullName: z.string({
    error: (issue) => {
      if (issue.input === undefined) return 'fullName name is required';
      if (typeof issue.input !== 'string') return 'fullName name must be a string';
      return 'Invalid Last name format';
    },
  }),

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
      validator: function (value: string) {
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(value);
      },
      message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character',
    },
  },
});

const updateAdminSchema = z.object({
  fullName: z.string({
    error: (issue) => {
      if (issue.input === undefined) return 'fullName name is required';
      if (typeof issue.input !== 'string') return 'fullName name must be a string';
      return 'Invalid Last name format';
    },
  }),
});

const adminValidationZodSchema = {
  createAdminSchema,
  updateAdminSchema,
};

export default adminValidationZodSchema;
