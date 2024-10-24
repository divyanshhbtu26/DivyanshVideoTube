import mongoose , {Schema} from "mongoose "
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const userSchema=new Schema(
    {
        username:{
            type:String,
            required:true,
            unique:true,
            lowecase:true,
            trim:true,
            index:true  //it will come in searching feild fast
        },
        email:{
            type:String,
            required:true,
            unique:true,
            lowecase:true,
            trim:true
        },
        fullname:{
            type:String,
            required:true,
            trim:true,
            index:true
        },
        avatar:{
            type:String, //cloudinary URL
            required:true
        },
        coverImage:{
            type:String, //cloudinary URL
        },
        watchHistory:[
            {
                type:Schema.Types.ObjectId,
                ref: "Video"
            }
        ],
        password:{
            type:String,
            required:[true,'Password is Required']
        },
        refreshToken:{
            type:String
        }
    },
    {
        timestamps :true
    }
)

//BCRYPT gives many hooks functionality to use in our code , and these hooks are used via different forms like here we are using bcrypt.hash(this.password,10),, here 10 signifies the nuber of rounds:--- 
//HOOK creation
userSchema.pre("save", async function (next) {
    if(!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password,10)
    next()
})

//METHOD creation
// Done to check whether the provided password matches the hashed password in the database
userSchema.methods.isPasswordCorrect = async function (password){
    return await bcrypt.compare(password, this.password)  // return TRUE or FALSE
}

//GENERATING TOKEN
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id:this._id,
            email: this.email,
            username:this.username,
            fullname:this.fullname
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id:this._id,
            email: this.email,
            username:this.username,
            fullname:this.fullname
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User=mongoose.model("User",userSchema)