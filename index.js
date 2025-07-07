// import express from 'express';
// import dotenv from 'dotenv';
// import cors from 'cors';
// import session from 'express-session';
// import passport from 'passport';
// import mlRoutes from './routes/ml.js';
// import authRoutes from './routes/auth.js';
// import './passport.js'; // Your Passport strategy
// import { ensureAuthenticated } from './middleware/authMiddleware.js';

// dotenv.config();

// const app = express();
// app.use((req, res, next) => {
//     res.set('Cache-Control', 'no-store');
//     next();
// });
// // ✅ CORS middleware should be FIRST (before session and routes)
// app.use(cors({
//     origin: 'http://localhost:5173', // Your frontend URL
//     credentials: true
// }));

// // ✅ Enable JSON parsing for incoming requests
// app.use(express.json());

// // ✅ Setup session middleware
// app.use(session({
//     secret: process.env.SESSION_SECRET || 'your-session-secret', // use env var
//     resave: false,
//     saveUninitialized: false,
//     cookie: {
//         sameSite: 'lax', // secure: true if using HTTPS
//     }
// }));

// ✅ Initialize Passport and session
// app.use(passport.initialize());
// app.use(passport.session());

// // ✅ Mount your auth routes
// app.use('/api/auth', authRoutes);

// // ✅ Example protected route
// app.get('/dashboard', ensureAuthenticated, (req, res) => {
//     res.send("You are viewing your dashboard, " + req.user.displayName);
// });

// // ✅ Test route
// app.get('/', (req, res) => {
//     res.send("Server working fine");
// });
// app.use('/api', mlRoutes);
// // ✅ Start the server
// app.listen(3333, () => {
//     console.log("✅ Server is running on port 3333");
// });
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';

import mlRoutes from './routes/ml.js';
import authRoutes from './routes/auth.js';
import './passport.js';
import { ensureAuthenticated } from './middleware/authMiddleware.js';
import driveRoutes from './routes/drive.js';


dotenv.config();
console.log("✅ Backend server starting...");

const app = express();

// ✅ Must be set BEFORE session for secure cookies to work behind proxy (e.g., Render)
app.set('trust proxy', 1);

// ✅ Remove Express fingerprint
app.disable('x-powered-by');

// ✅ Log requests
app.use(morgan('dev'));

// ✅ Prevent caching
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

// ✅ Parse large JSON and form-data bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ✅ CORS for Netlify
app.use(cors({
    origin: 'https://innovisionai.netlify.app',
    credentials: true,
}));
app.use('/api/drive', driveRoutes);
// ✅ Secure HTTP headers
app.use(helmet());

// ✅ Basic rate limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// ✅ Session config for production
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true, // ✅ ensure cookies are set securely behind proxy
    cookie: {
        httpOnly: true,
        secure: true, // ✅ needed for HTTPS (Render)
        sameSite: 'none', // ✅ needed for cross-origin cookies (Netlify)
        maxAge: 24 * 60 * 60 * 1000,
    }
}));

// ✅ Debug cookie/session in backend logs
app.use((req, res, next) => {
    console.log('🧠 Cookies received:', req.headers.cookie || 'No cookies');
    console.log('🔐 Session data:', req.session);
    next();
});

// ✅ Manually set credentials headers (for Render + Netlify edge fix)
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Origin", "https://innovisionai.netlify.app");
    next();
});

// ✅ Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// ✅ Routes
console.log("✅ Mounting /api/auth and /api routes...");
app.use('/api/auth', authRoutes);
app.use('/api', mlRoutes);

// ✅ Protected example route
app.get('/dashboard', ensureAuthenticated, (req, res) => {
    res.send(`You are viewing your dashboard, ${req.user.displayName}`);
});

// ✅ Health check route
app.get('/', (req, res) => {
    res.send("Server working fine");
});

// ✅ Start server
const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});