import express from "express";
import { createServer } from "node:http";

import { Server } from "socket.io";

import mongoose from "mongoose";
import { connectToSocket } from "./controllers/socketManager.js";

import cors from "cors";
import userRoutes from "./routes/users.routes.js";
import healthRoutes from "./routes/health.routes.js";

const app = express();
const server = createServer(app);
const io = connectToSocket(server);


app.set("port", (process.env.PORT || 8000))

app.use(cors({
    origin: process.env.FRONTEND_URL || "*", // We will set this in Render dashboard
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

app.use("/api/v1/users", userRoutes);
app.use("/api/health", healthRoutes);

// const start = async () => {
//     app.set("mongo_user")
//     const connectionDb = await mongoose.connect("mongodb+srv://imdigitalashish:imdigitalashish@cluster0.cujabk4.mongodb.net/")

//     console.log(`MONGO Connected DB HOst: ${connectionDb.connection.host}`)
//     server.listen(app.get("port"), () => {
//         console.log("LISTENIN ON PORT 8000")
//     });



// }
const start = async () => {
    try {
        // 3. Using Environment Variable for MongoDB
        const mongoUri = process.env.MONGO_URI || "mongodb+srv://imdigitalashish:imdigitalashish@cluster0.cujabk4.mongodb.net/";
        const connectionDb = await mongoose.connect(mongoUri);

        console.log(`MONGO Connected DB Host: ${connectionDb.connection.host}`);
        
        // 4. Use the dynamic port from app.set
        server.listen(app.get("port"), "0.0.0.0", () => {
            console.log(`LISTENING ON PORT ${app.get("port")}`);
        });
    } catch (error) {
        console.error("ERROR CONNECTING TO DATABASE:", error);
        process.exit(1);
    }
}



start();