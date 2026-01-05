import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import path from "path"
import cors from "cors"

import authRoutes from "./routes/auth.route.js"
import messageRoutes from "./routes/message.route.js"
import { connectDB } from "./lib/db.js";


import { isSpoofedBot } from "@arcjet/inspect";

dotenv.config()

const app = express()
const __dirname = path.resolve()

const PORT = process.env.PORT || 3000

app.use(express.json());
app.use(cookieParser());
app.use(cors({origin:"http://localhost:5173", credentials:true}));

if(process.env.NODE_ENV == "production"){
    app.use(express.static(path.join(__dirname, "../frontend/dist")))

    app.use((_,res)=>{
        res.sendFile(path.join(__dirname, "../frontend/dist/index.html"))
    })
}
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);


app.listen(PORT, ()=> {
    console.log(`Server running on port ${PORT}`)
    connectDB()
 });