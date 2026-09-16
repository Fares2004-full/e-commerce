// was uploadToCloudinary.js
import appError from "../errors/AppError.js";
import multer from "multer";


const uploadMemory = (size, noOfFiles) => {
  const storage = multer.memoryStorage();
  const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(appError.create("File must be an image", 400), false);
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: size * 1024 * 1024,
      files: noOfFiles,
      fields: 10,
    },
  });
};

export default uploadMemory;
