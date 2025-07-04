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
                                [name, email, hashed, new Date().toLocaleString(), "2", "2"], // 2 zip credits, 2 ref credits
                            ],
                        },
                    });

                    console.log("✅ New user added to sheet:", email);
                }

                return done(null, profile);
            } catch (err) {
                console.error("❌ Error saving user to sheet:", err);
                return done(err, null);
            }
        }
    )
);

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});