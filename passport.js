import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import { getSheet } from "./utils/googleSheet.js";

dotenv.config();

passport.use(
    new GoogleStrategy({
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "https://innovisionai-backend-1.onrender.com/api/auth/google/callback",
        },
        async(accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails[0].value;
                const name = profile.displayName;

                const sheet = await getSheet();
                const response = await sheet.get({
                    spreadsheetId: process.env.GOOGLE_SHEET_ID,
                    range: "Sheet1",
                });

                const rows = response.data.values || [];
                const userExists = rows.find((row) => row[1] === email);

                if (!userExists) {
                    const hashed = "google";

                    await sheet.append({
                        spreadsheetId: process.env.GOOGLE_SHEET_ID,
                        range: "Sheet1",
                        valueInputOption: "RAW",
                        requestBody: {
                            values: [
                                [name, email, hashed, new Date().toLocaleString(), "2", "2"]
                            ],
                        },
                    });

                    console.log("✅ New user added to sheet:", email);
                }

                // ✅ Only pass essential data forward
                return done(null, email); // just email to session
            } catch (err) {
                console.error("❌ Error saving user to sheet:", err);
                return done(err, null);
            }
        }
    )
);

// ✅ Store only email in session
passport.serializeUser((email, done) => {
    done(null, email);
});

// ✅ Retrieve user from Google Sheet using email
passport.deserializeUser(async(email, done) => {
    try {
        const sheet = await getSheet();
        const response = await sheet.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: "Sheet1",
        });

        const rows = response.data.values || [];
        const userRow = rows.find((row) => row[1] === email); // row[1] = email

        if (!userRow) return done(null, false);

        const user = {
            name: userRow[0],
            email: userRow[1],
            zipCredits: userRow[4],
            refCredits: userRow[5],
        };

        done(null, user);
    } catch (err) {
        console.error("❌ Error in deserializeUser:", err);
        done(err, null);
    }
});