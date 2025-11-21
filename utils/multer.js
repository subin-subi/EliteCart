import multer from "multer";
import cloudinary from "cloudinary";
import pkg from "multer-storage-cloudinary";

const CloudinaryStorage = pkg.CloudinaryStorage || pkg.default;

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary.v2,
  params: {
    folder: "Elitecart",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

const upload = multer({ storage });
export default upload;
