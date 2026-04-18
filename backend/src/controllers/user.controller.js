import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import bcrypt, { hash } from "bcrypt"

import crypto from "crypto"
import { Meeting } from "../models/meeting.model.js";
import { LoginActivity } from "../models/loginActivity.model.js";
const login = async (req, res) => {

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Please Provide" })
    }

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User Not Found" })
        }


        let isPasswordCorrect = await bcrypt.compare(password, user.password)

        if (isPasswordCorrect) {
            let token = crypto.randomBytes(20).toString("hex");
            const ipAddress = req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
                || req.socket?.remoteAddress
                || req.ip
                || "unknown";
            const userAgent = req.headers["user-agent"] || "unknown";

            user.token = token;
            user.lastLoginAt = new Date();
            user.lastLoginIp = ipAddress;
            user.loginCount = (user.loginCount || 0) + 1;
            await user.save();

            await LoginActivity.create({
                userId: user._id,
                username: user.username,
                ipAddress,
                userAgent,
                loggedInAt: new Date()
            });

            return res.status(httpStatus.OK).json({ token: token })
        } else {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid Username or password" })
        }

    } catch (e) {
        return res.status(500).json({ message: `Something went wrong ${e}` })
    }
}


const register = async (req, res) => {
    const { name, username, email, password } = req.body;


    try {
        if (!name || !username || !email || !password) {
            return res.status(httpStatus.BAD_REQUEST).json({ message: "Please provide name, username, email and password" });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(httpStatus.FOUND).json({ message: "User already exists" });
        }
        const existingEmail = await User.findOne({ email: email.toLowerCase() });
        if (existingEmail) {
            return res.status(httpStatus.FOUND).json({ message: "Email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name: name,
            username: username,
            email: email.toLowerCase(),
            password: hashedPassword
        });

        await newUser.save();

        res.status(httpStatus.CREATED).json({ message: "User Registered" })

    } catch (e) {
        res.json({ message: `Something went wrong ${e}` })
    }

}


const getUserHistory = async (req, res) => {
    const { token } = req.query;

    try {
        const user = await User.findOne({ token: token });
        const meetings = await Meeting.find({ user_id: user.username })
        res.json(meetings)
    } catch (e) {
        res.json({ message: `Something went wrong ${e}` })
    }
}

const addToHistory = async (req, res) => {
    const { token, meeting_code } = req.body;

    try {
        const user = await User.findOne({ token: token });

        const newMeeting = new Meeting({
            user_id: user.username,
            meetingCode: meeting_code
        })

        await newMeeting.save();

        res.status(httpStatus.CREATED).json({ message: "Added code to history" })
    } catch (e) {
        res.json({ message: `Something went wrong ${e}` })
    }
}


const debugUsers = async (req, res) => {
    try {
        const allUsers = await User.find({});
        const s2User = await User.findOne({ username: "s2" });
        const s2Email = await User.findOne({ email: "s2@gmail.com" });
        
        res.json({
            totalUsers: allUsers.length,
            allUsers: allUsers.map(u => ({ username: u.username, email: u.email, name: u.name })),
            s2User: s2User,
            s2Email: s2Email
        });
    } catch (e) {
        res.json({ error: e.message });
    }
}

export { login, register, getUserHistory, addToHistory, debugUsers }