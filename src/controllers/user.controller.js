import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const registerUser = asyncHandler( async (req, res) =>{


    // Get user details from frontend via POSTMAN everything we want 

    const {fullname , email , username , password} = req.body
    // console.log( "email : ", email );
    // console.log("Cover Image:", coverImage);

    // Validation whether every information is correct , no empty and all

    /*if (fullname === ""){
        throw new ApiError(400 , " FullName is required ")
    }*/
    if(
        // If ay field will be empty , it will return true!!
        [fullname , email, username , password].some((field)=>
         field?.trim()==="")
    ){
        throw new ApiError(400, " All Fields are required ")
    }

    // Check if user is not already exists-- check username and email 

    const existedUser = await User.findOne({
        $or: [{username} , {email}]
    })
    if(existedUser){
        throw new ApiError(409, "User with email or username already existed!!")
    }

// WE CAN DO:
// console.log(REQ.FILES)

    // Check for images ,

        // Multer Middleware gives access of req.files for multiple files
    const avatarLocalPath = req.files?.avatar[0]?.path  ;         // Multer will provide with all the path of the file.
    const coverImageLocalPath = req.files?.coverImage[0]?.path
    // Again check for Avatar
    // If avatar path not found, return error:---
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    // Check for Cover Image
        /*let coverImageLocalPath;
        if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
            coverImageLocalPath=req.files.coverImage[0].path
        }*/

// OR CHECK COVERIMAGE LIKE THIS:--
    let coverImageUrl = ""; // Default value if coverImage is not uploaded
    if (coverImageLocalPath) {
        const coverImage = await uploadOnCloudinary(coverImageLocalPath);
        coverImageUrl = coverImage?.url || ""; // Use the URL if upload was successful
    }
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }

    // Upload them to Cloudinary, Avatar
    // Create User Object - create entry in db

        // Agar error milega to Async Hnadler se handle ho jayega 
    const user = await User.create({
        fullname,
        avatar: avatar?.url || req.files?.avatar[0]?.path,
        // CoverImage if present give it's URL , otherwise a null response..
        coverImage: coverImageUrl    ,
        email,
        password,
        username:username.toLowerCase()               
    })
    

    // Remove password and refresh token fields from response

    // Check whether user is created or not , and Database by default gives us a option of _id:--- 
    // If user found , thumbs up:---
    const createdUser = await User.findById(user._id).select(
        // By default are selected , so manually select those you want to delete and add "-" sign
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering a user!!")
    }

    // Check whether response comes (User created) or is it a null response and return Response

        // We will use ApiResponse we have already created in utils section:-----
    return res.status(201).json(
        new ApiResponse(200,createdUser , "User Registered Successfully!!")
    )

} )

export {registerUser,

}