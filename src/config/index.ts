import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({
  path: path.join(process.cwd(), '.env'),
});

const envSchema = z.object({
  NODE_ENV: z.enum(['production', 'development', 'test']).default('development'),
  PORT: z.preprocess((val) => Number(val), z.number().default(5002)),
  SERVER_URL: z.string().min(1, 'Server URL is required'),
  BASE_URL: z.string().min(1, 'Base URL is required'),
  MONGODB_URL: z.string().min(1, 'MongoDB connection URL is required'),

  GMAIL_APP_USER: z.string().email('Invalid email format'),
  GMAIL_APP_PASSWORD: z.string().min(1, 'Gmail app password is required'),

  ADMIN_PASSWORD: z.string().min(1, 'Admin password is required'),
  ADMIN_EMAIL: z.string().email('Invalid email format'),

  SALT_ROUNDS: z.string().min(1, 'Salt rounds is required'),

  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'Cloudinary cloud name is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'Cloudinary API key is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'Cloudinary API secret is required'),

  JWT_ACCESS_TOKEN_SECRET: z.string().min(1, 'Access token secret key is required'),
  JWT_ACCESS_TOKEN_EXPIRESIN: z.string().default('1d'),
  JWT_REFRESH_TOKEN_SECRET: z.string().min(1, 'Refresh token secret key is required'),
  JWT_REFRESH_TOKEN_EXPIRESIN: z.string().default('7d'),
  OTP_EXPIRY_MINUTES: z.string().min(1, 'OTP expiry minutes is required'),
  OTP_TOKEN_EXPIRESIN: z.string().default('2m'),
});

const envVars = envSchema.parse(process.env);

export default {
  node_env: envVars.NODE_ENV,
  server_port: envVars.PORT,
  server_url: envVars.SERVER_URL,
  base_url: envVars.BASE_URL,
  mongodb_url: envVars.MONGODB_URL,

  gmail_app_user: envVars.GMAIL_APP_USER,
  gmail_app_password: envVars.GMAIL_APP_PASSWORD,

  admin_password: envVars.ADMIN_PASSWORD,
  admin_email: envVars.ADMIN_EMAIL,

  salt_rounds: envVars.SALT_ROUNDS,

  cloudinary_cloud_name: envVars.CLOUDINARY_CLOUD_NAME,
  cloudinary_api_key: envVars.CLOUDINARY_API_KEY,
  cloudinary_api_secret: envVars.CLOUDINARY_API_SECRET,

  jwt_access_token_secret: envVars.JWT_ACCESS_TOKEN_SECRET,
  jwt_access_token_expiresin: envVars.JWT_ACCESS_TOKEN_EXPIRESIN,
  jwt_refresh_token_secret: envVars.JWT_REFRESH_TOKEN_SECRET,
  jwt_refresh_token_expiresin: envVars.JWT_REFRESH_TOKEN_EXPIRESIN,
  otp_expires_in: envVars.OTP_EXPIRY_MINUTES,
  otp_token_expiresin: envVars.OTP_TOKEN_EXPIRESIN,
};