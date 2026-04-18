import mongoose, { Schema } from "mongoose";

const loginActivitySchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        username: { type: String, required: true },
        ipAddress: { type: String, default: "unknown" },
        userAgent: { type: String, default: "unknown" },
        loggedInAt: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

const LoginActivity = mongoose.model("LoginActivity", loginActivitySchema);

export { LoginActivity };
