const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({

    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },

    otp: {
        type: String,
        required: true
    },

    // TTL index: MongoDB automatically deletes this document 600
    // seconds (10 minutes) after createdAt, so expired codes clean
    // themselves up — no manual cleanup job needed.
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 600
    }

});

module.exports = mongoose.model("Otp", otpSchema);