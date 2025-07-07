import express from 'express';
import passport from 'passport';
import { sendOtp, verifyOtpAndSignup, login, verifyOtpAndResetPassword, sendOtpForReset } from '../controllers/auth.js';
import { verifyToken } from '../middleware/verifyToken.js';

import jwt from 'jsonwebtoken';

const router = express.Router();


router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtpAndSignup);
router.post("/forgot-password/send-otp", sendOtpForReset);
router.post("/forgot-password/reset", verifyOtpAndResetPassword);
router.post("/login", login);


// 🟩 2. Start Google OAuth
router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

// 🟩 3. Google OAuth Callback (Improved)
router.get('/google/callback',
    passport.authenticate('google', {
        failureRedirect: 'https://innovisionai.netlify.app/justmypictures?login=fail',
        session: true
    }),
    (req, res, next) => {
        req.login(req.user, (err) => {
            if (err) return next(err);
            res.redirect('https://innovisionai.netlify.app/justmypictures?login=success');
        });
    }
);



router.get('/me', (req, res, next) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return res.status(200).json(req.user); // Google user (session)
    }

    // Try verifying JWT
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            return res.status(200).json(decoded); // Manual user (JWT)
        } catch (err) {
            return res.status(401).json({ message: "Invalid token" });
        }
    }

    return res.status(401).json({ message: "User not logged in" });
});

// 🟩 5. Logout Route
router.get("/logout", (req, res) => {
    req.logout(err => {
        if (err) {
            return res.status(500).send("Error during logout");
        }

        req.session.destroy(() => {
            res.clearCookie("connect.sid"); // Optional: remove session cookie
            res.send("Logged out successfully");
        });
    });
});

export default router;