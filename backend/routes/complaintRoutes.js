const express = require("express");
const Complaint = require("../models/complaintModel");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// ADMIN ACCESS CHECK
function adminOnly(req, res, next) {
    if (req.user.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Admin access required"
        });
    }

    next();
}

// ALLOWED DEPARTMENTS
const allowedDepartments = [
    "Roads & Infrastructure",
    "Water Supply",
    "Sanitation",
    "Electricity",
    "Public Health",
    "Parks & Environment",
    "Other"
];

// CREATE A NEW COMPLAINT
router.post("/", authMiddleware, async (req, res) => {
    try {
        const {
            title,
            description,
            category,
            location,
            image
        } = req.body;

        const complaint = new Complaint({
            title,
            description,
            category,
            location,
            image,
            submittedBy: req.user.id
        });

        await complaint.save();

        res.status(201).json({
            success: true,
            message: "Complaint submitted successfully",
            complaint
        });
    } catch (error) {
        console.error("Complaint creation error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to submit complaint"
        });
    }
});

// GET LOGGED-IN USER'S COMPLAINTS
router.get("/my", authMiddleware, async (req, res) => {
    try {
        const complaints = await Complaint.find({
            submittedBy: req.user.id
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            complaints
        });
    } catch (error) {
        console.error("Fetching my complaints error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch complaints"
        });
    }
});

// ADMIN: GET ALL COMPLAINTS
router.get("/", authMiddleware, adminOnly, async (req, res) => {
    try {
        const complaints = await Complaint.find()
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            complaints
        });
    } catch (error) {
        console.error("Fetching all complaints error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch all complaints"
        });
    }
});

// ADMIN: UPDATE COMPLAINT STATUS
router.patch(
    "/:id/status",
    authMiddleware,
    adminOnly,
    async (req, res) => {
        try {
            const allowedStatuses = [
                "Pending",
                "In Progress",
                "Resolved",
                "Rejected"
            ];

            const { status } = req.body;

            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid complaint status"
                });
            }

            const complaint = await Complaint.findByIdAndUpdate(
                req.params.id,
                { status },
                { new: true, runValidators: true }
            );

            if (!complaint) {
                return res.status(404).json({
                    success: false,
                    message: "Complaint not found"
                });
            }

            res.json({
                success: true,
                message: "Complaint status updated successfully",
                complaint
            });
        } catch (error) {
            console.error("Updating complaint status error:", error);

            res.status(500).json({
                success: false,
                message: "Failed to update complaint status"
            });
        }
    }
);

// ADMIN: ASSIGN DEPARTMENT
router.patch(
    "/:id/department",
    authMiddleware,
    adminOnly,
    async (req, res) => {
        try {
            const { department } = req.body;

            if (!allowedDepartments.includes(department)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid department"
                });
            }

            const complaint = await Complaint.findByIdAndUpdate(
                req.params.id,
                { department },
                { new: true, runValidators: true }
            );

            if (!complaint) {
                return res.status(404).json({
                    success: false,
                    message: "Complaint not found"
                });
            }

            res.json({
                success: true,
                message: "Department assigned successfully",
                complaint
            });
        } catch (error) {
            console.error("Assigning department error:", error);

            res.status(500).json({
                success: false,
                message: "Failed to assign department"
            });
        }
    }
);

module.exports = router;