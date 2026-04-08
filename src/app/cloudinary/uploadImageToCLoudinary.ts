import sharp from 'sharp';
import cloudinary from "../../config/cloudinary.config";

export const uploadToCloudinary = (
  file: Express.Multer.File,
  folderName: 'profile_images' | 'question_images' | 'option_images',
): Promise<{ secure_url: string; public_id: string }> => {
  return new Promise(async (resolve, reject) => {

    const compressedBuffer = await sharp(file.buffer)
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folderName,
        resource_type: 'image',
        format: 'webp'
      },
      (error, result) => {
        if (error || !result) {
          return reject(
            new Error(`Cloudinary upload failed: ${error?.message}`)
          );
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      },
    );

    stream.end(compressedBuffer);
  });
};