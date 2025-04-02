import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();  

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Ensures HTTPS URLs
});

/**
 * Upload file to Cloudinary
 * @param {string} filePath - Path to the temporary file
 * @returns {Promise} - Cloudinary upload result
 */
export const uploadToCloudinary = (filePath) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      filePath,
      {
        resource_type: "auto",
        folder: "posts",
      },
      (error, result) => {
        // Remove the temporary file
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) console.error("Error removing temp file:", unlinkErr);
        });

        if (error) return reject(error);
        resolve(result);
      }
    );
  });
};
