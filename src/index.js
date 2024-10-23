// require('dotenv').config({path:'./env'})
import dotenv from "dotenv"
import connectDB from "./db/index.js";
import { app } from "./app.js";


// import mongoose from 'mongoose';
// import {DB_NAME} from "../src/constants"



dotenv.config({
    path: './env'
})

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`Server is running at port : ${process.env.PORT}`)
    })
})
.catch((error)=>{
    console.log("MONGO DB CONNECTION FAILED!! : ",error)
})













/*
import express from 'express'
const app =express();
// function connectDB(){}
// connectDB()

(async()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("ERROR",(error)=>{
            console.log("Not able to talk:",error);
            throw error
        })
        app.listen(process.env.PORT,()=>{
            console.log(`App is listening on port ${process.env.PORT}`)
        })
    } catch (error) {
        console.log("ERROR",error)
        throw error;
        
    }
})()
    */