import mongoose, { Schema } from "mongoose";

const userScheme = new Schema(
    {
        name: { type: String, required: true },
        username: { type: String, required: true, unique: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true },
        token: { type: String },
        lastLoginAt: { type: Date },
        lastLoginIp: { type: String },
        loginCount: { type: Number, default: 0 }
    }
)

const User = mongoose.model("User", userScheme);

export { User };