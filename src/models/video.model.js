import mongoose ,{Schema} from "mongoose"
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"
import mongooseAggregate from "mongoose-aggregate-paginate-v2"

const videoSchema =new Schema(
    {
        videoFile:{
            type:String,  //clodinary UrL
            required:true
        },
        thumbnail:{
            type:String,  //clodinary UrL
            required:true
        },
        title:{
            type:String,  
            required:true
        },
        description:{
            type:String,  
            required:true
        },
        duration:{
            type:Number,  //clodinary UrL
            required:true
        },
        views:{
            type:Number,  //clodinary UrL
            default:0
        },
        isPublished:{
            type:Boolean,  //clodinary UrL
            default:true
        },
        owner:{
            type:Schema.Types.ObjectId,
            ref:"User"
        }
    },
    {
        timestamps:true
    }
)

videoSchema.plugin(mongooseAggregatePaginate)

export const Video=mongoose.model("Video",videoSchema)