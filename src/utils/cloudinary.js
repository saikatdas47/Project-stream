import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    if (!localFilePath) {
        return null;
    }

    try {
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });
        console.log('Cloudinary upload response:', response.url);
        return response;
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw error;
    } finally {
        await fs.unlink(localFilePath).catch(() => {});
    }
};

export { uploadOnCloudinary };  
