import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import mlRoutes from './routes/ml.js';


import authRoutes from './routes/auth.js';
import './passport.js'; // Your Passport strategy
import { ensureAuthenticated } from './middleware/authMiddleware.js';

dotenv.config();

const app = express();
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});
// ✅ CORS middleware should be FIRST (before session and routes)
app.use(cors({
    origin: 'http://localhost:5173', // Your frontend URL
    credentials: true
}));

// ✅ Enable JSON parsing for incoming requests
app.use(express.json());

// ✅ Setup session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret', // use env var
    resave: false,
    saveUninitialized: false,
    cookie: {
        sameSite: 'lax', // secure: true if using HTTPS
    }
}));

// ✅ Initialize Passport and session
app.use(passport.initialize());
app.use(passport.session());

// ✅ Mount your auth routes
app.use('/api/auth', authRoutes);

// ✅ Example protected route
app.get('/dashboard', ensureAuthenticated, (req, res) => {
    res.send("You are viewing your dashboard, " + req.user.displayName);
});

// ✅ Test route
app.get('/', (req, res) => {
    res.send("Server working fine");
});
app.use('/api', mlRoutes);
// ✅ Start the server
app.listen(3333, () => {
    console.log("✅ Server is running on port 3333");
});