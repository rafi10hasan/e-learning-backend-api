export const USER_ROLE = {
  GUEST: 'guest',
  HOST: 'host',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super-admin'
} as const;

export const USER_GENDER = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
} as const;

export const PROVIDER = {
  GOOGLE: 'google',
  APPLE: 'apple',
} as const;

export type TProvider = (typeof PROVIDER)[keyof typeof PROVIDER];

export type TUserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];
export type TGender = (typeof USER_GENDER)[keyof typeof USER_GENDER];

export const defaultUserImage: string[] = [
  'https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg',
  'https://cdn-icons-png.freepik.com/512/303/303593.png',
  'https://cdn-icons-png.flaticon.com/512/306/306205.png',
];
