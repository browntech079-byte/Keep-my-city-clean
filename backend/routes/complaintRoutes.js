const express = require("express");
const multer = require("multer");
const streamifier = require("streamifier");
const Complaint = require("../models/complaintModel");
const authMiddleware = require("../middleware/authMiddleware");
const cloudinary = require("../config/cloudinary");

const router = express.Router();

// ==========================================
// MULTER CONFIGURATION
// ==========================================

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed"));
        }
    }
});

// ==========================================
// IMAGE UPLOAD ERROR HANDLING
// ==========================================
// upload.single("image") reports file-too-large / wrong-file-type errors
// via next(err), which would otherwise skip this route entirely and fall
// through to the global error handler as an opaque 500. This wrapper
// catches those errors here and responds with a clean 400 instead.

function handleImageUpload(req, res, next) {
    upload.single("image")(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === "LIMIT_FILE_SIZE") {
                    return res.status(400).json({
                        success: false,
                        message: "Image must be smaller than 5 MB"
                    });
                }

                return res.status(400).json({
                    success: false,
                    message: err.message || "Image upload failed"
                });
            }

            // fileFilter errors (e.g. "Only image files are allowed")
            return res.status(400).json({
                success: false,
                message: err.message || "Image upload failed"
            });
        }

        next();
    });
}

// ==========================================
// ADMIN ACCESS CHECK
// ==========================================

function adminOnly(req, res, next) {
    if (req.user.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Admin access required"
        });
    }

    next();
}

// ==========================================
// ALLOWED DEPARTMENTS
// ==========================================

const allowedDepartments = [
    "Roads & Infrastructure",
    "Water Supply",
    "Sanitation",
    "Electricity",
    "Public Health",
    "Parks & Environment",
    "Other"
];

// ==========================================
// CLOUDINARY IMAGE UPLOAD
// ==========================================

function uploadToCloudinary(fileBuffer) {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: "citycare/complaints",
                resource_type: "image"
            },
            (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );

        streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
}

// ==========================================
// CREATE COMPLAINT
// ==========================================

router.post(
    "/",
    authMiddleware,
    handleImageUpload,
    async (req, res) => {
        try {
            const {
                title,
                description,
                category,
                latitude,
                longitude,
                address
            } = req.body;

            // ------------------------------------------
            // VALIDATION
            // ------------------------------------------

            if (!title || !description || !category) {
                return res.status(400).json({
                    success: false,
                    message: "Title, description and category are required"
                });
            }

            if (
                latitude === undefined ||
                longitude === undefined ||
                latitude === "" ||
                longitude === ""
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Complaint location is required"
                });
            }

            const parsedLatitude = Number(latitude);
            const parsedLongitude = Number(longitude);

            if (
                !Number.isFinite(parsedLatitude) ||
                !Number.isFinite(parsedLongitude)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Latitude and longitude must be valid numbers"
                });
            }

            // ------------------------------------------
            // CREATE LOCATION OBJECT
            // ------------------------------------------

            const location = {
                address: address || "",
                latitude: parsedLatitude,
                longitude: parsedLongitude
            };

            // ------------------------------------------
            // CLOUDINARY IMAGE UPLOAD
            // ------------------------------------------

            let imageUrl = null;

            if (req.file) {
                const uploadResult = await uploadToCloudinary(
                    req.file.buffer
                );

                imageUrl = uploadResult.secure_url;
            }

            // ------------------------------------------
            // CREATE COMPLAINT
            // ------------------------------------------

            const complaint = new Complaint({
                title: title.trim(),
                description: description.trim(),
                category: category.trim(),
                location,
                image: imageUrl,
                submittedBy: req.user.id
            });

            await complaint.save();

            // ------------------------------------------
            // RESPONSE
            // ------------------------------------------

            res.status(201).json({
                success: true,
                message: "Complaint submitted successfully",
                complaint
            });

        } catch (error) {
            console.error("Complaint creation error:", error);

            res.status(500).json({
                success: false,
                message: error.message || "Failed to submit complaint"
            });
        }
    }
);

// ==========================================
// GET MY COMPLAINTS
// ==========================================

router.get("/my", authMiddleware, async (req, res) => {
    try {
        const complaints = await Complaint.find({
            submittedBy: req.user.id
        }).sort({
            createdAt: -1
        });

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

// ==========================================
// ADMIN — GET ALL COMPLAINTS
// ==========================================

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

// ==========================================
// ADMIN — UPDATE STATUS
// ==========================================

router.patch("/:id/status", authMiddleware, adminOnly, async (req, res) => {
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
            {
                new: true,
                runValidators: true
            }
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
});

// ==========================================
// ADMIN — ASSIGN DEPARTMENT
// ==========================================

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
                {
                    new: true,
                    runValidators: true
                }
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