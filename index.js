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
import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import session from 'express-session'
import passport from 'passport'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import morgan from 'morgan'

import mlRoutes from './routes/ml.js'
import authRoutes from './routes/auth.js'
import './passport.js'
import { ensureAuthenticated } from './middleware/authMiddleware.js'

dotenv.config()

const app = express()

// ✅ Trust proxy if behind Netlify or Render
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1)
}

// ✅ Disable fingerprinting
app.disable('x-powered-by')

// ✅ Prevent caching
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
})

// ✅ Logging HTTP requests
app.use(morgan('dev'))

// ✅ CORS setup for Netlify frontend
app.use(cors({
    origin: 'https://innovisionai.netlify.app',
    credentials: true,
}))

// ✅ Secure HTTP headers
app.use(helmet())

// ✅ Rate limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 mins
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
})
app.use(limiter)

// ✅ Parse JSON
app.use(express.json())

// ✅ Force HTTPS redirect in production (optional)
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.headers['x-forwarded-proto'] !== 'https') {
            return res.redirect(`https://${req.headers.host}${req.url}`)
        }
        next()
    })
}

// ✅ Session setup
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1); // ✅ correct placement
}

app.use(session({
    secret: process.env.SESSION_SECRET || 'default-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: true, // ✅ must be true for HTTPS
        sameSite: 'none', // ✅ required for cross-origin cookies
        maxAge: 24 * 60 * 60 * 1000, // 1 day
    }
}));

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Origin", "https://innovisionai.netlify.app");
    next();
});
// ✅ Initialize passport
app.use(passport.initialize())
app.use(passport.session())

// ✅ Routes
app.use('/api/auth', authRoutes)
app.use('/api', mlRoutes)

// ✅ Protected route example
app.get('/dashboard', ensureAuthenticated, (req, res) => {
    res.send(`You are viewing your dashboard, ${req.user.displayName}`)
})

// ✅ Health check
app.get('/', (req, res) => {
    res.send("Server working fine")
})

// ✅ Start server
const PORT = process.env.PORT || 3333
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`)
})