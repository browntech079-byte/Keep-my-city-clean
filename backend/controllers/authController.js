const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ==========================================
// GENERATE TOKEN
// ==========================================

function generateToken(user) {
    return jwt.sign(
        {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            role: user.role
        },
        process.env.SESSION_SECRET,
        { expiresIn: "7d" }
    );
}

// ==========================================
// REGISTER USER
// ==========================================

const registerUser = async (req, res) => {
    try {
        const {
            fullName,
            email,
            password,
            city,
            state
        } = req.body;

        // Check required fields
        if (!fullName || !email || !password || !city || !state) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        // Check if email already exists
        const existingUser = await User.findOne({
            email: email.trim().toLowerCase()
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email already registered"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const user = await User.create({
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            password: hashedPassword,
            city: city.trim(),
            state: state.trim()
        });

        res.status(201).json({
            success: true,
            message: "Registration successful",
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Registration error:", error);

        res.status(500).json({
            success: false,
            message: "Server error during registration"
        });
    }
};


// ==========================================
// LOGIN USER
// ==========================================

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        // Find user
        const user = await User.findOne({
            email: email.trim().toLowerCase()
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Compare password
        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Issue a signed token containing the user's identity.
        // The frontend stores this and sends it back as
        // Authorization: Bearer <token> on every request.
        const token = generateToken(user);

        const safeUser = {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            role: user.role
        };

        res.json({
            success: true,
            message: "Login successful",
            token,
            user: safeUser
        });

    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            success: false,
            message: "Server error during login"
        });
    }
};


// ==========================================
// LOGOUT USER
// ==========================================
// With token-based auth there's no server-side session to clear —
// the token simply stops being sent once the frontend deletes it
// from its own storage. This endpoint exists so the frontend has
// something consistent to call, and to leave room for a token
// blocklist later if that's ever needed.

const logoutUser = (req, res) => {
    res.json({
        success: true,
        message: "Logout successful"
    });
};


// ==========================================
// GET CURRENT LOGGED-IN USER
// ==========================================

const getCurrentUser = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Not logged in"
            });
        }

        const user = await User.findById(
            req.user.id
        ).select("-password");

        if (!user) {
            // The account behind this token no longer exists
            return res.status(401).json({
                success: false,
                message: "Not logged in"
            });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                city: user.city,
                state: user.state,
                role: user.role,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error("Get current user error:", error);

        res.status(500).json({
            success: false,
            message: "Server error while fetching profile"
        });
    }
};


// ==========================================
// EXPORT CONTROLLERS
// ==========================================

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser
};