import { Request } from 'express';
import multer from 'multer';

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/svg+xml'];

const storage = multer.memoryStorage();

// Per-field max size (bytes)
export const MAX_FILE_SIZES: Record<string, number> = {
  profile_image: 1 * 1024 * 1024,
  profile_gallery: 1 * 1024 * 1024,
  listing_images: 2 * 1024 * 1024,
  listing_thumbnail: 2 * 1024 * 1024,
  blog_image: 1 * 1024 * 1024,
  category_image: 1 * 1024 * 1024,
  photo_id: 2 * 1024 * 1024,
  passport: 2 * 1024 * 1024,
  driving_license: 2 * 1024 * 1024,
};

export const MAX_FILE_COUNTS: Record<string, number> = {
  profile_image: 1,
  profile_gallery: 5,
  listing_thumbnail: 5,
  listing_images: 5,
  blog_image: 1,
  category_image: 1,
  photo_id: 1,
  passport: 1,
  driving_license: 1,
};

const fileFilter = (_req: Request, file: Express.Multer.File, cb: any) => {
  const allowedFieldnames = Object.keys(MAX_FILE_SIZES);

  // Field validation
  if (!allowedFieldnames.includes(file.fieldname)) {
    return cb(new Error(`Invalid fieldname: ${file.fieldname}`));
  }

  // Image-only validation (including driving_license)
  if (!IMAGE_MIME_TYPES.includes(file.mimetype)) {
    const allowedFormats = IMAGE_MIME_TYPES.map((type) => type?.split('/')[1]).join(', ');
    return cb(new Error(`${file.fieldname} must be an image file: ${allowedFormats}`));
  }

  // Per-file size validation
  const maxSize = MAX_FILE_SIZES[file.fieldname];
  if (file.size > maxSize) {
    return cb(new Error(`${file.fieldname} exceeds the size limit of ${maxSize / (1024 * 1024)}MB`));
  }

  cb(null, true);
};

export const uploadFile = () =>
  multer({
    storage,
    fileFilter,
  }).fields([
    { name: 'profile_image', maxCount: 1 },
    { name: 'profile_gallery', maxCount: 5 },
    { name: 'listing_thumbnail', maxCount: 5 },
    { name: 'listing_images', maxCount: 5 },
    { name: 'blog_image', maxCount: 1 },
    { name: 'category_image', maxCount: 1 },
    { name: 'photo_id', maxCount: 1 },
    { name: 'passport', maxCount: 1 },
    { name: 'driving_license', maxCount: 1 },
  ]);
