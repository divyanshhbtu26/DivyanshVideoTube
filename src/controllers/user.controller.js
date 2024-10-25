import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async (userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

            // Saving Refresh Token in Database for further recognizations :---
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating refresh and access tokens")
    }
}

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

const loginUser = asyncHandler( async (req , res) => {
    
    // Get user details from frontend via POSTMAN everything we want (req body se -> data lelo)
            /* We have used Cookie-Parser middleware in app.js , so now we can access req and res both 
               for cookies in taking and sending requests and responses...*/
    const {email , username , password} = req.body
    if(!username && !email){
        throw new ApiError(400,"UserName or Email is Required!!")
    }

    // Get username and email// Find the user , whther registered or not 
    const user = await User.findOne({
        $or: [ { username },{ email }]
    })

    if(!user){
        throw new ApiError(404,"User does not exists!!")
    }

    // Password check

    const isPasswordValid = await user.isPasswordCorrect(password);
    if(!isPasswordValid){
        throw new ApiError(401,"Invalid User Credentials!!")
    }

    // Access and Refresh Token

    const {accessToken , refreshToken} = await generateAccessAndRefreshTokens(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    
    // Send Cookies 

    const options = {
        // Cookies can only be modified by Servers :--
        httpOnly : true,
        secure : true
    }

    // Send Response

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200,
            {
                user : loggedInUser , accessToken, refreshToken
            },
            "User Logged In Successfully!!"
        )
    )
})

const logoutUser = asyncHandler (async (req,res)=>{
    // Find user :--
            // We will design a middleware for accessing cookies:---Go to middlewares authentication
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        // Cookies can only be modified by Servers :--
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new ApiResponse(200,{},"User Logged Out!!")
    )
})

const refreshAccessToken = asyncHandler (async (req,res) => {
    // Refresh Token , the one which user is currently sending for request can be acessed as:---
    const incomingrefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingrefreshToken){
        throw new ApiError(401,"Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingrefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        // The information about the previously saved Refresh Token by the user:---
    
        const user = await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401,"Invalid Refresh Token")
        }
    
        // Check whether they both are same :---
    
        if(incomingrefreshToken!==user?.refreshToken)
        {
            throw new ApiError(401,"Refresh Token is expired or used")
        }
    
        const options = {
            httpOnly:true,
            secure:true
        }
        const {accessToken,newrefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newrefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken,refreshToken:newrefreshToken},
                "Access Token Refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid Refresh Token")
    }
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}