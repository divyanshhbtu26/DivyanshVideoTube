import { Router } from "express";
import { 
    changeCurrentUserPassword, 
    getCurrentUser, 
    getUserChannelProfile, 
    getWatchHistory, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    registerUser, 
    updateAccountDetails, 
    updateUserAvatar, 
    updateUserCoverImage 
} from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
    upload.fields([
        // All these are all files listed :----
        {
            name: "avatar",
            maxcount : 1
        },
        {
            name: "coverImage", 
            maxcount : 1 
        }
    ]),
    registerUser
)

router.route("/login").post(loginUser)


// Secured Routes
router.route("/logout").post(verifyJWT , logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT , changeCurrentUserPassword)
router.route("/current-user").get(verifyJWT , getCurrentUser)
router.route("/update-account-details").patch(verifyJWT, updateAccountDetails) // dont use post , using post will update every single informations loaded overthere. Using patch will update the desired updations needed by user.
router.route("/avatar").patch(
    verifyJWT , 
    upload.single("avatar"),updateUserAvatar
)
router.route("/cover-image").patch(
    verifyJWT , 
    upload.single("coverImage"),updateUserCoverImage
)
router.route("/c/:username").get(verifyJWT , getUserChannelProfile)  // bcpz we r using req.params
router.route("/history").get(verifyJWT, getWatchHistory)

export default router