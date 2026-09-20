const express = require("express");

const {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Register
router.post("/register", registerUser);

// Login
router.post("/login", loginUser);

// Logout
router.post("/logout", logoutUser);

// Current logged-in user (used by profile.html and any page
// that needs to know if someone is signed in)
router.get("/me", authMiddleware, getCurrentUser);

module.exports = router;