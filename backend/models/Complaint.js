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
            enum: [
                "Pothole",
                "Road Damage",
                "Streetlight",
                "Garbage & Waste",
                "Water Supply",
                "Public Toilet",
                "Traffic & Signals",
                "Park & Environment",
                "Public Infrastructure",
                "Electricity",
                "Other"
            ]
        },

        priority: {
            type: String,
            enum: ["Low", "Medium", "High"],
            default: "Medium"
        },

        status: {
            type: String,
            enum: ["Pending", "In Progress", "Resolved"],
            default: "Pending"
        },

        department: {
            type: String,
            enum: [
                "Municipal Corporation",
                "Roads Department",
                "Water Department",
                "Sanitation Department",
                "Electricity Department",
                "Traffic Department",
                "Parks Department",
                "Other"
            ],
            default: "Municipal Corporation"
        },

        location: {
            state: {
                type: String,
                required: true
            },

            city: {
                type: String,
                required: true
            },

            area: {
                type: String,
                required: true
            },

            pincode: {
                type: String,
                required: true
            }
        },

        image: {
            type: String,
            default: null
        },

        resolutionImage: {
            type: String,
            default: null
        },

        reportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        upvotes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],

        feedback: {
            rating: {
                type: Number,
                min: 1,
                max: 5,
                default: null
            },

            comment: {
                type: String,
                trim: true,
                default: ""
            }
        },

        resolvedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Complaint", complaintSchema);