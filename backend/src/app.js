import express from "express";
import { createServer } from "node:http";

import { Server } from "socket.io";

import mongoose from "mongoose";
import { connectToSocket } from "./controllers/socketManager";

import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/users.routes.js";

dotenv.config();

const app = express();
const server = createServer(app);
const io = connectToSocket(server);


app.set("port", (process.env.PORT || 8000))
app.use(cors());
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

app.use("/api/v1/users", userRoutes);

const start = async () => {
    app.set("mongo_user")
    const mongoUri = process.env.MONGO_URI
    const connectionDb = await mongoose.connect(mongoUri)

    console.log(`MONGO Connected DB HOst: ${connectionDb.connection.host}`)
    server.listen(process.env.PORT || 8000, () => {
        console.log(`LISTENIN ON PORT ${process.env.PORT || 8000}`)
    });



}



start();