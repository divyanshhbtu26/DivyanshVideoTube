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
            // $unset : {
                // refreshToken :1
            // }
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

const changeCurrentUserPassword = asyncHandler (async (req,res) => {
    const {oldPassword , newPassword} = req.body

        /* If confirm password als require:
        // if(confirmPswrd!==newPswrd){
        //    throw new ApiError
        // }*/

    /**
     * Get information about User
     * We will get information from the req.user as we have created a middleware of our own inside     auth.middleware.js t get data about user for logging out , same as here:---
     */
    const user =await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid Old Password")
    }
    user.password=newPassword
    // Baki k validations save na ho paye:---
    await user.save({validateBeforeSave:false})
    return res
    .status(200)
    .json(
        new ApiResponse(200,{},"Password Changed Successfully")
    )
})

const getCurrentUser = asyncHandler (async (req,res) => {
    return res
    .status(200)
    .json(
        new ApiResponse(200,req.user,"Current user fetched !!")
    )
})

const updateAccountDetails = asyncHandler (async (req,res) => {
    const {fullname , email} = req.body
    if(!fullname || !email){
        throw new ApiError(400,"All fiels are required")
    }

    /* User ki details le k fullname and email hata sakte h and then ek nya fullname and email bana k bhej sakte h wapas se , OR the way written down in code:--- */

    const user =await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullname,
                email 
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user , "Account Details Updated Successfully"))
})

const updateUserAvatar = asyncHandler (async (req,res) => {
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar File is Missing")
    }
    const avatar =await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(400,"Error while uploading on avatar")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Avatar updated Successfully")
    )
})

const updateUserCoverImage = asyncHandler (async (req,res) => {
    const CoverImageLocalPath = req.file?.path
    if(!CoverImageLocalPath){
        throw new ApiError(400,"CoverImage File is Missing")
    }
    const CoverImage =await uploadOnCloudinary(CoverImageLocalPath)
    if(!CoverImage.url){
        throw new ApiError(400,"Error while uploading on CoverImage")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                CoverImage:CoverImage.url
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"CoverImage updated Successfully")
    )
})

const getUserChannelProfile = asyncHandler (async (req,res) => {
    const {username}= await req.params
    if(!username?.trim()){
        throw new ApiError(400,"Username is missing")
    }
    const channel = await User.aaggregate([
        {
            $match:{
                username:username.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                susbcribersCount:{
                    $size:"$subscribers"
                },
                channelsSubscribedToCount:{
                    $size:"subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id, "$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            //Give all the information needed :---
            $project:{
                fullname:1,
                username:1,
                susbcribersCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }
    ])
    if(!channel?.length){
        throw new ApiError(404,"Channel does not exists!")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User Channel fetched successfully.")
    )
})

const getWatchHistory = asyncHandler (async (req,res) => {
    const user = await User.aggregate([
        {
            $match : {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup : {
                from : "videos",
                localField : "watchHistory",
                foreignField : "_id",
                as : "watchHistory",
                pipeline:[
                    {
                        $lookup : {
                            from : "users",
                            localField : "owner",
                            foreignField : "_id",
                            as : "owner",
                            pipeline : [
                                {
                                    $project : {
                                        fullname : 1,
                                        username : 1,
                                        avatar : 1
                                    }
                                }
                            ]
                        }
                    },
                    // So as to improve the structure of nest aggregated of owner
                    {
                        $addFields : {
                            owner : {
                                $first : "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json (
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch History fetched"
        )
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentUserPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}