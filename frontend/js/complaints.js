document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // API CONFIGURATION
    // ==========================================

    const API_BASE_URL = "https://citycare-gov.onrender.com";

    // ==========================================
    // DOM ELEMENTS
    // ==========================================

    const complaintsList = document.getElementById("complaintsList");
    const complaintsMessage = document.getElementById("complaintsMessage");
    const refreshButton = document.getElementById("refreshComplaints");
    const totalCount = document.getElementById("totalCount");
    const pendingCount = document.getElementById("pendingCount");
    const progressCount = document.getElementById("progressCount");
    const resolvedCount = document.getElementById("resolvedCount");

    if (!complaintsList) return;

    let isLoading = false;
    let lastAutoRefreshAt = 0;

    function resolveImageUrl(image) {
        if (!image) return image;
        if (/^https?:\/\//i.test(image)) {
            return image;
        }
        return `${API_BASE_URL}${image.startsWith("/") ? "" : "/"}${image}`;
    }

    async function loadComplaints() {
        if (isLoading) return;
        isLoading = true;

        if (complaintsMessage) {
            complaintsMessage.textContent = "Loading your complaints...";
        }

        complaintsList.innerHTML = "";

        if (refreshButton) {
            refreshButton.disabled = true;
            refreshButton.textContent = "Loading...";
        }

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/complaints/my`,
                {
                    method: "GET",
                    credentials: "include"
                }
            );

            let data = {};

            try {
                data = await response.json();
            } catch (jsonError) {
                data = {};
            }

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("Authentication required");
                }

                throw new Error(
                    data.message || "Unable to load complaints"
                );
            }

            const complaints = Array.isArray(data.complaints)
                ? data.complaints
                : [];

            if (totalCount) {
                totalCount.textContent = complaints.length;
            }

            if (pendingCount) {
                pendingCount.textContent = complaints.filter(
                    complaint => complaint.status === "Pending"
                ).length;
            }

            if (progressCount) {
                progressCount.textContent = complaints.filter(
                    complaint => complaint.status === "In Progress"
                ).length;
            }

            if (resolvedCount) {
                resolvedCount.textContent = complaints.filter(
                    complaint => complaint.status === "Resolved"
                ).length;
            }

            if (complaints.length === 0) {
                if (complaintsMessage) {
                    complaintsMessage.textContent = "";
                }

                const emptyMessage = document.createElement("div");
                emptyMessage.className = "complaint-empty";

                emptyMessage.innerHTML = `
                    <h3>No complaints yet</h3>
                    <p>
                        You haven't submitted any civic complaints yet.
                    </p>
                    <a href="report.html" class="btn btn-primary">
                        + Report an issue
                    </a>
                `;

                complaintsList.appendChild(emptyMessage);
                return;
            }

            if (complaintsMessage) {
                complaintsMessage.textContent =
                    `${complaints.length} complaint(s) found.`;
            }

            complaints.forEach(complaint => {
                complaintsList.appendChild(
                    createComplaintCard(complaint)
                );
            });

        } catch (error) {
            console.error(
                "Loading complaints error:",
                error
            );

            if (complaintsMessage) {
                complaintsMessage.textContent = "";

                if (
                    error.message === "Authentication required"
                ) {
                    complaintsMessage.textContent =
                        "Please log in to view your complaints.";

                    const loginLink =
                        document.createElement("a");

                    loginLink.href = "login.html";
                    loginLink.textContent = " Go to Login";
                    loginLink.className =
                        "complaints-login-link";

                    complaintsMessage.appendChild(loginLink);

                } else {
                    complaintsMessage.textContent =
                        error.message ||
                        "Unable to load complaints.";
                }
            }

        } finally {
            isLoading = false;

            if (refreshButton) {
                refreshButton.disabled = false;
                refreshButton.textContent = "Refresh";
            }
        }
    }

    function createComplaintCard(complaint) {

        const card = document.createElement("article");
        card.className = "complaint-card";

        if (complaint.image) {
            const imageWrapper =
                document.createElement("div");

            imageWrapper.className =
                "complaint-image-wrapper";

            const image = document.createElement("img");
            image.className = "complaint-image";
            image.src = resolveImageUrl(complaint.image);

            image.alt =
                complaint.title || "Complaint image";

            image.loading = "lazy";

            image.onerror = () => {
                imageWrapper.remove();
            };

            imageWrapper.appendChild(image);
            card.appendChild(imageWrapper);
        }

        const details = document.createElement("div");
        details.className = "complaint-details";

        const title = document.createElement("h3");

        title.textContent =
            complaint.title || "Untitled complaint";

        const description = document.createElement("p");
        description.className = "complaint-description";

        description.textContent =
            complaint.description ||
            "No description provided.";

        const category = document.createElement("p");
        category.className = "complaint-category";

        category.textContent =
            `Category: ${complaint.category || "Uncategorized"}`;

        const department = document.createElement("p");
        department.className = "complaint-department";

        department.textContent =
            `Department: ${complaint.department || "Not assigned"}`;

        const location = document.createElement("p");
        location.className = "complaint-location";

        const address = complaint.location?.address;

        if (address) {
            location.textContent = `Location: ${address}`;

        } else if (
            complaint.location?.latitude != null &&
            complaint.location?.longitude != null
        ) {
            location.textContent =
                `Coordinates: ${complaint.location.latitude}, ` +
                `${complaint.location.longitude}`;

        } else {
            location.textContent = "Location not available";
        }

        const meta = document.createElement("div");
        meta.className = "complaint-meta";

        const date = document.createElement("span");

        if (complaint.createdAt) {
            date.textContent =
                `Submitted: ${new Date(
                    complaint.createdAt
                ).toLocaleDateString()}`;

        } else {
            date.textContent =
                "Submission date unavailable";
        }

        const complaintId = document.createElement("span");

        if (complaint._id) {
            complaintId.textContent =
                `ID: ${complaint._id.slice(-6).toUpperCase()}`;
        }

        meta.appendChild(date);

        if (complaint._id) {
            meta.appendChild(complaintId);
        }

        details.appendChild(title);
        details.appendChild(description);
        details.appendChild(category);
        details.appendChild(department);
        details.appendChild(location);
        details.appendChild(meta);

        const status = document.createElement("span");
        status.className = "complaint-status";

        const statusText = complaint.status || "Pending";

        status.textContent = statusText;

        const statusClass = {
            "Pending": "pending",
            "In Progress": "in-progress",
            "Resolved": "resolved",
            "Rejected": "rejected"
        };

        status.classList.add(
            statusClass[statusText] || "pending"
        );

        card.appendChild(details);
        card.appendChild(status);

        return card;
    }

    if (refreshButton) {
        refreshButton.addEventListener(
            "click",
            loadComplaints
        );
    }

    function refreshWhenCustomerReturns() {

        if (document.visibilityState !== "visible") {
            return;
        }

        const now = Date.now();

        if (now - lastAutoRefreshAt < 1500) {
            return;
        }

        lastAutoRefreshAt = now;
        loadComplaints();
    }

    document.addEventListener(
        "visibilitychange",
        refreshWhenCustomerReturns
    );

    window.addEventListener(
        "focus",
        refreshWhenCustomerReturns
    );

    loadComplaints();

});