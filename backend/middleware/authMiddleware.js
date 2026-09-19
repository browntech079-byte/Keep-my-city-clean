const jwt = require("jsonwebtoken");

// ==========================================
// AUTH MIDDLEWARE (TOKEN-BASED)
// ==========================================
// Reads the Authorization: Bearer <token> header instead of a
// session cookie. This works identically in every browser —
// unlike cross-site cookies, it isn't blocked by Brave/Safari/
// Chrome's third-party cookie protections, and it doesn't rely
// on server memory that gets wiped when Render restarts the app.

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization || "";

    const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : null;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Authentication required"
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.SESSION_SECRET);

        req.user = {
            id: decoded.id,
            fullName: decoded.fullName,
            email: decoded.email,
            role: decoded.role
        };

        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Session expired. Please log in again."
        });
    }
};

module.exports = authMiddleware;