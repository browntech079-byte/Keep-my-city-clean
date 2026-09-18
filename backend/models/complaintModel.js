const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            required: true,
            trim: true
        },

        category: {
            type: String,
            required: true,
            trim: true
        },

        department: {
            type: String,
            enum: [
                "Roads & Infrastructure",
                "Water Supply",
                "Sanitation",
                "Electricity",
                "Public Health",
                "Parks & Environment",
                "Other"
            ],
            default: "Other"
        },

        location: {
            address: {
                type: String,
                trim: true
            },

            latitude: {
                type: Number,
                required: true
            },

            longitude: {
                type: Number,
                required: true
            }
        },

        image: {
            type: String,
            default: null
        },

        status: {
            type: String,
            enum: ["Pending", "In Progress", "Resolved", "Rejected"],
            default: "Pending"
        },

        submittedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    {
        timestamps: true
    }
);

const Complaint = mongoose.model("Complaint", complaintSchema);

module.exports = Complaint;