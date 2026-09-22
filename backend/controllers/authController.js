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
            role: user.role,
            gender: user.gender
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
            state,
            gender
        } = req.body;

        // Check required fields
        if (!fullName || !email || !password || !city || !state) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        // Gender is optional at the API level (defaults to "male" on
        // the model) but only "male"/"female" are valid if provided
        if (gender && !["male", "female"].includes(gender)) {
            return res.status(400).json({
                success: false,
                message: "Gender must be male or female"
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
            state: state.trim(),
            gender: gender || "male"
        });

        res.status(201).json({
            success: true,
            message: "Registration successful",
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                gender: user.gender
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
            role: user.role,
            gender: user.gender
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
                gender: user.gender,
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
    getCurrentUserconst User = require("../models/User");
const Otp = require("../models/Otp");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendOtpEmail } = require("../config/mailer");

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

function generateOtp() {
    // 6-digit numeric code, e.g. "042917"
    return String(Math.floor(100000 + Math.random() * 900000));
}


// ==========================================
// SEND REGISTRATION OTP
// ==========================================
// Emails a 6-digit code to the address the person is trying to
// register with. Called BEFORE registerUser, as a separate step.

const sendRegistrationOtp = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const cleanedEmail = email.trim().toLowerCase();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address"
            });
        }

        const existingUser = await User.findOne({ email: cleanedEmail });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email already registered"
            });
        }

        const otp = generateOtp();

        // Clear any earlier code for this email before storing the new one
        await Otp.deleteMany({ email: cleanedEmail });
        await Otp.create({ email: cleanedEmail, otp });

        await sendOtpEmail(cleanedEmail, otp);

        res.json({
            success: true,
            message: "OTP sent to your email"
        });

    } catch (error) {
        console.error("Send OTP error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to send OTP. Please try again."
        });
    }
};


// ==========================================
// REGISTER USER
// ==========================================

const registerUser = async (req, res) => {
    try {
        const {
            fullName,
            email,
            mobile,
            otp,
            password,
            city,
            state
        } = req.body;

        // Check required fields
        if (!fullName || !email || !mobile || !otp || !password || !city || !state) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        // Basic Indian mobile number format check: 10 digits, starting 6-9
        const cleanedMobile = mobile.trim();

        if (!/^[6-9]\d{9}$/.test(cleanedMobile)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid 10-digit mobile number"
            });
        }

        const cleanedEmail = email.trim().toLowerCase();

        // Verify the OTP that was emailed for this address
        const otpRecord = await Otp.findOne({
            email: cleanedEmail,
            otp: otp.trim()
        });

        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired verification code"
            });
        }

        // Check if email already exists
        const existingUser = await User.findOne({
            email: cleanedEmail
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
            email: cleanedEmail,
            mobile: cleanedMobile,
            password: hashedPassword,
            city: city.trim(),
            state: state.trim()
        });

        // OTP is single-use — remove it now that it's been consumed
        await Otp.deleteMany({ email: cleanedEmail });

        res.status(201).json({
            success: true,
            message: "Registration successful",
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                mobile: user.mobile,
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
    sendRegistrationOtp,
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser
};
};