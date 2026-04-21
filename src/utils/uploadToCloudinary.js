const { cloudinary } = require('../config/cloudinary');

const uploadToCloudinary = (buffer, folder, publicId, options = {}) => {
    const defaultTransformations = [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto' },
        { fetch_format: 'auto' },
    ];

    const postTransformations = [
        { quality: 'auto' },
        { fetch_format: 'auto' },
    ];

    const transformations = options?.type === 'post' ? postTransformations : defaultTransformations;

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: `${process.env.CLOUDINARY_FOLDER}/${folder}`,                          
                public_id: publicId,             
                overwrite: true,
                invalidate: true,            
                transformation: transformations,
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );

        uploadStream.end(buffer);
    });
};

module.exports = uploadToCloudinary;