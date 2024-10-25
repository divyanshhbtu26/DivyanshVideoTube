import {v2 as cloudinary} from "cloudinary"
import fs from "fs"


// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        // UPLOAD FILE ON CLOUDINARY
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
            // public_id: 'candy', // Optional: Uncomment to use a specific public ID
        });

        // FILE HAS BEEN UPLOADED SUCCESSFULLY
                // console.log("File has been uploaded to Cloudinary:", response.url);
            // Agar successfuly upload hogi tb bhi remove ho jayegi file:---
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        console.error("Error uploading to Cloudinary:", error);
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath); // remove the locally saved temporary file
        }
        return null;
    }
};

export {uploadOnCloudinary}