import parsePhoneNumberFromString from 'libphonenumber-js';
import { z } from 'zod';
import { fullNameMaxLength, fullNameMinLength, passwordLength } from './user.model';

const createAuthSchema = z.object({
  firstName: z
    .string({
      error: (issue) => {
        if (issue.input === undefined) return 'First name is required';
        if (typeof issue.input !== 'string') return 'First name must be a string';
        return 'Invalid first name format';
      },
    })
    .min(fullNameMinLength, `First name must be at least ${fullNameMinLength} characters long`)
    .max(fullNameMaxLength, `First name cannot exceed ${fullNameMaxLength} characters`)
    .regex(/^[a-zA-Z\s]+$/, 'First name can only contain letters and spaces'),

  lastName: z
    .string({
      error: (issue) => {
        if (issue.input === undefined) return 'Last name is required';
        if (typeof issue.input !== 'string') return 'Last name must be a string';
        return 'Invalid Last name format';
      },
    })
    .min(fullNameMinLength, `First name must be at least ${fullNameMinLength} characters long`)
    .max(fullNameMaxLength, `First name cannot exceed ${fullNameMaxLength} characters`)
    .regex(/^[a-zA-Z\s]+$/, 'First name can only contain letters and spaces'),

  email: z
    .email({
      error: (issue) => {
        switch (true) {
          case issue.input === undefined:
            return 'Email address is required';
          case issue.input === null:
            return 'Email cannot be null';
          case typeof issue.input !== 'string':
            return 'Email must be text';
          default:
            return 'Please provide a valid email address';
        }
      },
    })
    .pipe(z.string().min(5, 'Email must be at least 5 characters long'))
    .pipe(z.string().max(254, 'Email cannot exceed 254 characters'))
    .pipe(
      z.string().refine((email) => email.includes('@') && email.split('@')[1].includes('.'), 'Email must contain a domain with extension'),
    )
    .transform((email) => email.toLowerCase().trim()),

  password: z
    .string({
      error: (issue) => {
        if (issue.input === undefined) return 'Password is required';
        if (typeof issue.input !== 'string') return 'Password must be a string';
        return 'Invalid password format';
      },
    })
    .min(passwordLength, `Password must be at least ${passwordLength} characters long`)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[@$!%*?&#]/, 'Password must contain at least one special character'),

  gender: z.enum(['male', 'female', 'other'], {
    error: (issue) => {
      if (issue.input === undefined) return 'Gender is required';
      if (typeof issue.input !== 'string') return 'Gender must be a string';
      return 'Gender must be either male,female or other';
    },
  }),

  role: z.enum(['guest', 'host'], {
    error: (issue) => 'Role must be either guest or host',
  }),

  dateOfBirth: z
    .string({
      error: (issue) => {
        if (issue.input === undefined) return 'Date of birth is required';
        if (typeof issue.input !== 'string') return 'Date of birth must be a string';
        return 'Invalid date of birth format';
      },
    })
    .refine((val) => !Number.isNaN(Date.parse(val)), {
      message: 'Date of birth must be a valid date',
    })
    .refine((val) => new Date(val) <= new Date(), {
      message: 'Date of birth cannot be in the future',
    })
    .refine(
      (val) => {
        const dob = new Date(val);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        return age >= 18;
      },
      {
        message: 'You must be at least 18 years old',
      },
    ),

  phone: z
    .string({
      error: (issue) => {
        if (issue.input === undefined) return 'Phone number is required';
        if (typeof issue.input !== 'string') return 'Phone number must be a string';
        return 'Invalid phone number format';
      },
    })
    .regex(/^\d+$/, 'Phone number must contain only digits') // only digits
    .refine(
      (value) => {
        const phone = parsePhoneNumberFromString(value, 'AU');
        return !!phone && phone.isValid() && phone.getType() === 'MOBILE';
      },
      {
        message: 'Phone number must be a valid Australian mobile number',
      },
    ),
});

const createSocialAuthSchema = z.object({
  provider: z.enum(['google', 'apple'], {
    message: 'Provider must be google or apple',
  }),
  token: z
    .string({
      message: 'Token is required',
    })
    .min(10, { message: 'Invalid token' }),

  fcmToken: z.string({
    message: 'FCM token must be a string',
  }),
});

const updateUserSchema = z.object({
  body: z
    .object({
      status: z.enum(['active', 'disabled']).optional(),
      verified: z.boolean().optional(),
    })
    .refine(
      (data) => {
        const hasStatus = data.status !== undefined;
        const hasVerified = data.verified !== undefined;
        // allow only one of them to be present
        return !(hasStatus && hasVerified);
      },
      {
        message: 'You can only update either "status" or "verified", not both at the same time.',
      },
    ),
});

export const socialLinksSchema = z
  .object({
    facebook: z
      .url({
        protocol: /^https$/,
        hostname: /(^|\.)facebook\.com$/,
        error: () => 'Facebook link must be a valid facebook URL',
      })
      .optional(),

    instagram: z
      .url({
        protocol: /^https$/,
        hostname: /(^|\.)instagram\.com$/,
        error: () => 'instagram link must be a valid instagram URL',
      })
      .optional(),

    tiktok: z
      .url({
        protocol: /^https$/,
        hostname: /(^|\.)tiktok\.com$/,
        error: () => 'tiktok link must be a valid tiktok URL',
      })
      .optional(),

    threads: z
      .url({
        protocol: /^https$/,
        hostname: /(^|\.)threads\.com$/,
        error: () => 'threads link must be a valid threads URL',
      })
      .optional(),

    dribble: z
      .url({
        protocol: /^https$/,
        hostname: /(^|\.)dribble\.com$/,
        error: () => 'dribble link must be a valid dribble URL',
      })
      .optional(),
  })
  .partial();

const profileUpdateSchema = z.object({
  fullName: z
    .string({ error: () => 'Full name must be a string' })
    .min(2, { error: () => 'Full name must be at least 2 characters' })
    .max(100, { error: () => 'Full name must not exceed 100 characters' })
    .optional(),

  dateOfBirth: z.coerce.date({ error: () => 'Date of birth must be a valid date' }).optional(),

  bio: z
    .string({ error: () => 'Bio must be a string' })
    .min(10, { error: () => 'Bio must be at least 10 characters' })
    .max(1000, { error: () => 'Bio must not exceed 1000 characters' })
    .optional(),

  antecode: z
    .string({ error: () => 'Antecode must be a string' })
    .min(10, { error: () => 'Antecode must be at least 10 characters' })
    .max(30, { error: () => 'Antecode must not exceed 30 characters' })
    .optional(),

  address: z
    .string({ error: () => 'Address must be a string' })
    .min(5, { error: () => 'Address must be at least 5 characters' })
    .max(40, { error: () => 'Address must not exceed 40 characters' })
    .optional(),

  occupation: z
    .string({ error: () => 'Occupation must be a string' })
    .min(3, { error: () => 'Occupation must be at least 3 characters' })
    .max(15, { error: () => 'Occupation must not exceed 15 characters' })
    .optional(),

  socialLinks: socialLinksSchema.optional(),

  photoGallery: z
    .array(z.url({ error: () => 'Gallery image must be a valid URL' }))
    .max(5, { error: () => 'You can upload a maximum of 5 gallery images' })
    .optional(),
});

const userValidationZodSchema = {
  createAuthSchema,
  updateUserSchema,
  createSocialAuthSchema,
  profileUpdateSchema,
};

export default userValidationZodSchema;

/*

export const registerUserValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100),
    email: z
      .string({ invalid_type_error: 'Please add a valid email' })
      .email('Invalid email format')
      .optional(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    phone: z.string().min(1, 'Phone number is required').max(15).optional(),
  }),
});






phone: z
    .string()
    .min(11, "Phone number must be at least 11 digits")
    .max(15, "Phone number cannot exceed 15 digits")
    .regex(/^[0-9]+$/, "Phone number must contain only numbers"),

  address: z.string().max(200, "Address cannot exceed 200 characters").optional(),

  geoLocation: z
    .object({
      type: z.literal("Point"),
      coordinates: z
        .tuple([
          z.number(),
          z.number(),
        ])
        .refine(
          ([lat, lng]) =>
            lat >= -90 &&
            lat <= 90 &&
            lng >= -180 &&
            lng <= 180,
          "Invalid latitude or longitude values"
        ),
    })
    .optional(),


*/
