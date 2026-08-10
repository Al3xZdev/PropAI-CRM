// Cloudinary Upload Service
// Handles image uploads to Cloudinary for public access

const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
require('dotenv').config();

// Configure Cloudinary
const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
};

if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
  console.warn('⚠️ Cloudinary not configured: missing CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET in .env');
} else {
  cloudinary.config(cloudinaryConfig);
}

console.log('☁️ Cloudinary configured:', process.env.CLOUDINARY_CLOUD_NAME);

/**
 * Upload image buffer to Cloudinary
 * Returns public URL accessible by Instagram
 */
async function uploadImageFromBuffer(buffer, originalName) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'realestate/properties',
        resource_type: 'image',
        use_filename: true,
        unique_filename: true,
        overwrite: false
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          console.log('✅ Image uploaded to Cloudinary:', result.secure_url);
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format
          });
        }
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

/**
 * Upload image from URL to Cloudinary
 */
async function uploadImageFromUrl(imageUrl) {
  try {
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: 'realestate/properties',
      resource_type: 'image',
      use_filename: true,
      unique_filename: true
    });

    console.log('✅ Image from URL uploaded:', result.secure_url);
    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format
    };
  } catch (error) {
    console.error('Cloudinary URL upload error:', error);
    throw error;
  }
}

/**
 * Delete image from Cloudinary
 */
async function deleteImage(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
}

/**
 * Test connection to Cloudinary
 */
async function testConnection() {
  try {
    const result = await cloudinary.api.resources({ 
      type: 'upload', 
      max_results: 1 
    });
    console.log('✅ Cloudinary connection successful');
    return true;
  } catch (error) {
    console.error('❌ Cloudinary connection failed:', error.message);
    return false;
  }
}

module.exports = {
  uploadImageFromBuffer,
  uploadImageFromUrl,
  deleteImage,
  testConnection,
  cloudinary
};
