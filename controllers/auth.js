import bcrypt from "bcryptjs";
import { getSheet } from "../utils/googleSheet.js";
import jwt from "jsonwebtoken";
import { sendOtpEmail } from "../utils/sendOtp.js";

const otpStore = {};


export const sendOtp = async(req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) return res.status(400).send("All fields required");

    try {
        const sheet = await getSheet();
        const response = await sheet.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: "Sheet1",
        });

        const rows = response.data.values || [];
        const existingUser = rows.find(row => row[1] === email);

        if (existingUser) return res.status(409).send("User already exists");

        // Generate OTP and send it
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[email] = { username, otp, password, expiresAt: Date.now() + 5 * 60 * 1000 }; // expires in 5 min

        await sendOtpEmail(email, otp);
        res.status(200).send("OTP sent to your email");
    } catch (err) {
        console.error("OTP send error:", err.message);
        res.status(500).send("Failed to send OTP");
    }
};

// STEP 2 - Verify OTP and Register
export const verifyOtpAndSignup = async(req, res) => {
    const { email, otp } = req.body;

    const entry = otpStore[email];
    if (!entry) return res.status(400).send("No OTP requested for this email");

    if (entry.otp !== otp) return res.status(401).send("Invalid OTP");

    if (Date.now() > entry.expiresAt) {
        delete otpStore[email];
        return res.status(410).send("OTP expired");
    }

    try {
        const hashedPassword = await bcrypt.hash(entry.password, 10);
        const newRow = [
            entry.username || "", // Name
            email,
            hashedPassword,
            new Date().toLocaleString(),
            "2", // ZipCredits
            "2", // RefCredits
        ];

        const sheet = await getSheet();
        await sheet.append({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: "Sheet1",
            valueInputOption: "RAW",
            resource: {
                values: [newRow],
            },
        });

        delete otpStore[email];
        return res.status(201).send("User registered successfully");
    } catch (err) {
        console.error("Signup error:", err.message);
        return res.status(500).send("Signup failed");
    }
};
// inside authController.js

export const sendOtpForReset = async(req, res) => {
    const { email } = req.body;

    try {
        const sheet = await getSheet();
        const response = await sheet.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: "Sheet1",
        });

        const rows = response.data.values || [];
        const existingUser = rows.find(row => row[1] === email);
        if (!existingUser) return res.status(404).send("User not found");

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[email] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 };

        await sendOtpEmail(email, otp);
        res.send("OTP sent to your email");
    } catch (err) {
        console.error("Error sending reset OTP:", err.message);
        res.status(500).send("Failed to send OTP");
    }
};

export const verifyOtpAndResetPassword = async(req, res) => {
    const { email, otp, newPassword } = req.body;
    const entry = otpStore[email];

    if (!entry) return res.status(400).send("No OTP requested for this email");
    if (entry.otp !== otp) return res.status(401).send("Invalid OTP");
    if (Date.now() > entry.expiresAt) {
        delete otpStore[email];
        return res.status(410).send("OTP expired");
    }

    try {
        const hashed = await bcrypt.hash(newPassword, 10);
        const sheet = await getSheet();
        const response = await sheet.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: "Sheet1",
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex((row) => row[1] === email);
        if (rowIndex === -1) return res.status(404).send("User not found");

        const rowNumber = rowIndex + 1;
        await sheet.update({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: `Sheet1!C${rowNumber }`,
            valueInputOption: "RAW",
            resource: {
                values: [
                    [hashed]
                ],
            },
        });

        delete otpStore[email];
        res.send("Password updated successfully");
    } catch (err) {
        console.error("Reset error:", err.message);
        res.status(500).send("Failed to reset password");
    }
};


export const login = async(req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(401).send("Email and password are mandatory");

        const sheet = await getSheet();
        const response = await sheet.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: "Sheet1",
        });

        const rows = response.data.values || [];
        const existingUser = rows.find((row) => row[1] === email);

        if (!existingUser) return res.status(401).send("User does not exist");

        const isMatch = await bcrypt.compare(password, existingUser[2]);
        if (!isMatch) return res.status(401).send("Invalid password");

        const username = existingUser[0]; // name stored in sheet
        const payload = { username, email };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "2h" });

        // ✅ Return all needed fields
        return res.status(200).send({
            message: "User logged in successfully",
            token,
            username,
            email
        });
    } catch (err) {
        console.error("Login error:", err.message);
        return res.status(500).send("Something went wrong");
    }
};