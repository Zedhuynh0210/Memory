const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload buffer lên Cloudinary, trả về secure_url.
 * @param {Buffer} buffer - Buffer ảnh từ multer (memoryStorage)
 * @param {Object} options - { folder: 'avatars' | 'memories' }
 * @returns {Promise<string>} secure_url
 */
function uploadFromBuffer(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: options.folder || "memories", ...options },
      (err, result) => {
        if (err) return reject(err);
        resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
}

module.exports = { cloudinary, uploadFromBuffer };
