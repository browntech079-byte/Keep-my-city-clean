document.addEventListener("DOMContentLoaded", () => {
    const complaintsList = document.getElementById("complaintsList");
    const complaintsMessage = document.getElementById("complaintsMessage");
    const refreshButton = document.getElementById("refreshComplaints");
    const totalCount = document.getElementById("totalCount");
    const pendingCount = document.getElementById("pendingCount");
    const progressCount = document.getElementById("progressCount");
    const resolvedCount = document.getElementById("resolvedCount");

    if (!complaintsList) return;

    async function loadComplaints() {
        complaintsMessage.textContent = "Loading your complaints...";
        complaintsList.innerHTML = "";

        if (refreshButton) {
            refreshButton.disabled = true;
            refreshButton.textContent = "Loading...";
        }

        try {
            const response = await fetch(
                "http://127.0.0.1:5000/api/complaints/my",
                {
                    method: "GET",
                    credentials: "include"
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to load complaints");
            }

            const complaints = data.complaints || [];

            if (totalCount) totalCount.textContent = complaints.length;
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
                complaintsMessage.textContent = "";

                const emptyMessage = document.createElement("div");
                emptyMessage.className = "complaint-empty";
                emptyMessage.textContent =
                    "You haven't submitted any complaints yet.";

                complaintsList.appendChild(emptyMessage);
                return;
            }

            complaintsMessage.textContent =
                `${complaints.length} complaint(s) found.`;

            complaints.forEach(complaint => {
                complaintsList.appendChild(createComplaintCard(complaint));
            });

        } catch (error) {
            console.error("Loading complaints error:", error);
            complaintsMessage.textContent = error.message;

            if (error.message === "Authentication required") {
                complaintsMessage.textContent =
                    "Please log in to view your complaints.";

                const loginLink = document.createElement("a");
                loginLink.href = "login.html";
                loginLink.textContent = " Go to Login";

                complaintsMessage.appendChild(loginLink);
            }
        } finally {
            if (refreshButton) {
                refreshButton.disabled = false;
                refreshButton.textContent = "Refresh";
            }
        }
    }

    function createComplaintCard(complaint) {
        const card = document.createElement("article");
        card.className = "complaint-card";

        const details = document.createElement("div");

        const title = document.createElement("h3");
        title.textContent = complaint.title || "Untitled complaint";

        const description = document.createElement("p");
        description.textContent =
            complaint.description || "No description provided.";

        const category = document.createElement("p");
        category.textContent =
            `Category: ${complaint.category || "Uncategorized"}`;

        const location = document.createElement("p");
        const address = complaint.location?.address;

        if (address) {
            location.textContent = `Location: ${address}`;
        } else if (
            complaint.location?.latitude != null &&
            complaint.location?.longitude != null
        ) {
            location.textContent =
                `Coordinates: ${complaint.location.latitude}, ${complaint.location.longitude}`;
        } else {
            location.textContent = "Location not available";
        }

        const meta = document.createElement("div");
        meta.className = "complaint-meta";

        const date = document.createElement("span");
        date.textContent = complaint.createdAt
            ? `Submitted: ${new Date(
                complaint.createdAt
              ).toLocaleDateString()}`
            : "Submission date unavailable";

        meta.appendChild(date);

        details.appendChild(title);
        details.appendChild(description);
        details.appendChild(category);
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

        status.classList.add(statusClass[statusText] || "pending");

        card.appendChild(details);
        card.appendChild(status);

        return card;
    }

    if (refreshButton) {
        refreshButton.addEventListener("click", loadComplaints);
    }

    loadComplaints();
});