const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const session = require("express-session");
const path = require("path");

// ==========================================
// LOAD ENVIRONMENT VARIABLES
// ==========================================

// Load .env from the CityCare project root
dotenv.config({
    path: path.resolve(__dirname, "../.env")
});

// ==========================================
// IMPORT ROUTES
// ==========================================

// Import routes after loading environment variables
const authRoutes = require("./routes/authRoutes");
const testRoutes = require("./routes/testRoutes");
const complaintRoutes = require("./routes/complaintRoutes");
const authMiddleware = require("./middleware/authMiddleware");

const app = express();

// ==========================================
// TRUST PROXY (REQUIRED ON RENDER)
// ==========================================

// Render terminates HTTPS at its edge and forwards
// requests to this app over HTTP internally.
app.set("trust proxy", 1);

// ==========================================
// CORS CONFIGURATION
// ==========================================

const allowedOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:5500",
    "https://citycare-frontend-5i4h.onrender.com",
    "https://clean-my-city-vvmu.onrender.com"
];

app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests without an Origin header,
            // such as server-to-server or Postman requests.
            if (!origin) {
                return callback(null, true);
            }

            // Normalize the origin before comparison.
            const normalizedOrigin = origin
                .trim()
                .replace(/\/$/, "");

            if (allowedOrigins.includes(normalizedOrigin)) {
                console.log("CORS allowed:", normalizedOrigin);
                return callback(null, true);
            }

            console.error("CORS blocked origin:", origin);

            return callback(
                new Error("Not allowed by CORS")
            );
        },

        credentials: true,

        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS"
        ],

        allowedHeaders: [
            "Content-Type",
            "Authorization"
        ],

        optionsSuccessStatus: 204
    })
);

// ==========================================
// BODY PARSING MIDDLEWARE
// ==========================================

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);

// ==========================================
// SESSION CONFIGURATION
// ==========================================

if (!process.env.SESSION_SECRET) {
    console.error("SESSION_SECRET is missing from .env");
    process.exit(1);
}

const isProduction = process.env.NODE_ENV === "production";

app.use(
    session({
        secret: process.env.SESSION_SECRET,

        resave: false,

        saveUninitialized: false,

        cookie: {
            httpOnly: true,

            // HTTPS cookie in production
            secure: isProduction,

            // Required for frontend and backend
            // running on different Render domains
            sameSite: isProduction ? "none" : "lax",

            // 24 hours
            maxAge: 1000 * 60 * 60 * 24
        }
    })
);

// ==========================================
// API ROUTES
// ==========================================

app.use("/api/auth", authRoutes);

app.use("/api/test", testRoutes);

app.use("/api/complaints", complaintRoutes);

// ==========================================
// TEMPORARY PROTECTED ROUTE
// ==========================================

app.get(
    "/api/test-direct/protected",
    authMiddleware,
    (req, res) => {
        res.json({
            success: true,
            message: "You are authenticated!",
            user: req.user
        });
    }
);

// ==========================================
// ROOT ROUTE
// ==========================================

app.get("/", (req, res) => {
    res.json({
        message: "CityCare API is running successfully",
        project: "Smart Civic Issue Management Platform",
        country: "India"
    });
});

// ==========================================
// 404 HANDLER
// ==========================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
});

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================

app.use((err, req, res, next) => {
    console.error(
        "Unhandled error:",
        err.stack || err.message
    );

    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal server error"
    });
});

// ==========================================
// SERVER + MONGODB CONNECTION
// ==========================================

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error(
                "MONGO_URI is missing. Check your .env file."
            );
        }

        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB Atlas connected successfully");

        app.listen(PORT, () => {
            console.log(
                `CityCare server running on port ${PORT}`
            );
        });

    } catch (error) {
        console.error(
            "CityCare startup failed:",
            error.message
        );

        process.exit(1);
    }
}

startServer();