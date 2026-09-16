// integrations/cloudinary.service.js
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";
import logger from "../utils/logger.js";

// multer gives us the file as a buffer (memoryStorage), not a path on disk,
// so we upload it via a stream instead of cloudinary.uploader.upload(path)
export const uploadBufferToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    logger.warn("Failed to delete Cloudinary asset", { publicId, error: err.message });
  }
};
