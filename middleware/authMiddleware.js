// middleware/authMiddleware.js
export const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).send("Unauthorized");
};