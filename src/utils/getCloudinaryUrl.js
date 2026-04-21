const { cloudinary } = require('../config/cloudinary');

/**
 * Converts a Cloudinary public_id to a fully qualified delivery URL.
 * Returns `null` when no public_id is provided.
 *
 * @param {string|null} publicId — the public_id stored in the database
 * @param {object} [options]  — optional Cloudinary transformation overrides
 * @returns {string|null}
 */
const getCloudinaryUrl = (publicId, options = {}) => {
  if (!publicId) return null;

  return cloudinary.url(publicId, {
    secure: true,
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto' },
      { fetch_format: 'auto' },
    ],
    ...options,
  });
};

module.exports = getCloudinaryUrl;
