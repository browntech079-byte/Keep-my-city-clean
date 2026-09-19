document.addEventListener("DOMContentLoaded", () => {

    const API_BASE_URL = "https://citycare-gov.onrender.com";
    const API_URL = `${API_BASE_URL}/api/complaints`;

    const searchInput = document.getElementById("adminSearch");
    const totalCount = document.getElementById("adminTotalCount");
    const pendingCount = document.getElementById("adminPendingCount");
    const progressCount = document.getElementById("adminProgressCount");
    const resolvedCount = document.getElementById("adminResolvedCount");
    const refreshButton = document.getElementById("refreshAdminComplaints");
    const message = document.getElementById("adminMessage");
    const complaintsList = document.getElementById("adminComplaintsList");

    let allComplaints = [];

    // ==========================================
    // HELPER FUNCTIONS
    // ==========================================

    function resolveImageUrl(image) {
        if (!image) return image;
        if (/^https?:\/\//i.test(image)) {
            return image;
        }
        return `${API_BASE_URL}${image.startsWith("/") ? "" : "/"}${image}`;
    }

    function getText(value) {
        if (value === null || value === undefined) return "";

        if (typeof value === "string") return value;

        if (typeof value === "number") return String(value);

        if (typeof value === "object") {
            return (
                value.address ||
                value.fullName ||
                value.name ||
                value.email ||
                ""
            );
        }

        return "";
    }

    function getCitizenName(complaint) {
        const citizen = complaint.submittedBy;

        if (!citizen) return "Unknown";

        if (typeof citizen === "string") return citizen;

        return (
            citizen.fullName ||
            citizen.name ||
            citizen.email ||
            "Unknown"
        );
    }

    function getLocation(complaint) {
        return getText(complaint.location) || "Not provided";
    }

    function formatDate(dateValue) {
        if (!dateValue) return "—";

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) return "—";

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    function showMessage(text, type = "") {
        if (!message) return;

        message.textContent = text;
        message.className = type
            ? `admin-message ${type}`
            : "admin-message";
    }

    // ==========================================
    // UPDATE STATISTICS
    // ==========================================

    function updateCounts(complaints) {

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
    }

    // ==========================================
    // CREATE TABLE CELL
    // ==========================================

    function createCell(text) {

        const cell = document.createElement("td");

        cell.textContent = text;

        return cell;
    }

    // ==========================================
    // CREATE PHOTO THUMBNAIL
    // ==========================================

    function createThumbnailCell(complaint) {

        const cell = document.createElement("td");

        if (!complaint.image) {
            cell.className = "admin-thumb-cell admin-thumb-empty";
            cell.textContent = "—";
            return cell;
        }

        cell.className = "admin-thumb-cell";

        const link = document.createElement("a");
        link.href = resolveImageUrl(complaint.image);
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        const thumb = document.createElement("img");
        thumb.className = "admin-thumb";
        thumb.src = resolveImageUrl(complaint.image);
        thumb.alt = complaint.title || "Complaint photo";
        thumb.loading = "lazy";

        thumb.onerror = () => {
            cell.innerHTML = "";
            cell.className = "admin-thumb-cell admin-thumb-empty";
            cell.textContent = "—";
        };

        link.appendChild(thumb);
        cell.appendChild(link);

        return cell;
    }

    // ==========================================
    // CREATE STATUS BADGE
    // ==========================================

    function createStatusBadge(status) {

        const badge = document.createElement("span");

        badge.textContent = status || "Pending";

        badge.className =
            "status-badge status-" +
            String(status || "Pending")
                .toLowerCase()
                .replace(/\s+/g, "-");

        return badge;
    }

    // ==========================================
    // CREATE DEPARTMENT DROPDOWN
    // ==========================================

    function createDepartmentSelect(complaint) {

        const select = document.createElement("select");

        select.className = "admin-department-select";

        const departments = [
            "Roads & Infrastructure",
            "Water Supply",
            "Sanitation",
            "Electricity",
            "Public Health",
            "Parks & Environment",
            "Other"
        ];

        departments.forEach(department => {

            const option = document.createElement("option");

            option.value = department;

            option.textContent = department;

            select.appendChild(option);
        });

        const currentDepartment =
            complaint.department || "Other";

        select.value = departments.includes(currentDepartment)
            ? currentDepartment
            : "Other";

        select.addEventListener("change", async () => {

            await updateComplaintDepartment(
                complaint._id,
                select.value,
                select
            );

        });

        return select;
    }

    // ==========================================
    // RENDER COMPLAINTS
    // ==========================================

    function renderComplaints(complaints) {

        if (!complaintsList) return;

        complaintsList.innerHTML = "";

        if (complaints.length === 0) {

            const row = document.createElement("tr");

            const cell = document.createElement("td");

            cell.colSpan = 9;

            cell.textContent = "No complaints found.";

            cell.className = "empty-state";

            row.appendChild(cell);

            complaintsList.appendChild(row);

            return;
        }

        complaints.forEach((complaint, index) => {

            const row = document.createElement("tr");

            // ==================================
            // COLUMN 1: ROW NUMBER
            // ==================================

            row.appendChild(
                createCell(String(index + 1))
            );

            // ==================================
            // COLUMN 2: PHOTO
            // ==================================

            row.appendChild(
                createThumbnailCell(complaint)
            );

            // ==================================
            // COLUMN 3: COMPLAINT
            // ==================================

            const complaintCell =
                document.createElement("td");

            const title =
                document.createElement("strong");

            title.textContent =
                complaint.title ||
                "Untitled complaint";

            const citizen =
                document.createElement("small");

            citizen.textContent =
                `By: ${getCitizenName(complaint)}`;

            complaintCell.appendChild(title);

            complaintCell.appendChild(
                document.createElement("br")
            );

            complaintCell.appendChild(citizen);

            row.appendChild(complaintCell);

            // ==================================
            // COLUMN 3: CATEGORY
            // ==================================

            row.appendChild(
                createCell(
                    complaint.category ||
                    "Uncategorized"
                )
            );

            // ==================================
            // COLUMN 4: DEPARTMENT
            // ==================================

            const departmentCell =
                document.createElement("td");

            departmentCell.appendChild(
                createDepartmentSelect(complaint)
            );

            row.appendChild(departmentCell);

            // ==================================
            // COLUMN 5: LOCATION
            // ==================================

            row.appendChild(
                createCell(getLocation(complaint))
            );

            // ==================================
            // COLUMN 6: SUBMITTED DATE
            // ==================================

            row.appendChild(
                createCell(
                    formatDate(complaint.createdAt)
                )
            );

            // ==================================
            // COLUMN 7: CURRENT STATUS
            // ==================================

            const statusCell =
                document.createElement("td");

            statusCell.appendChild(
                createStatusBadge(complaint.status)
            );

            row.appendChild(statusCell);

            // ==================================
            // COLUMN 8: UPDATE STATUS
            // ==================================

            const updateCell =
                document.createElement("td");

            const select =
                document.createElement("select");

            select.className =
                "admin-status-select";

            const statuses = [
                "Pending",
                "In Progress",
                "Resolved",
                "Rejected"
            ];

            statuses.forEach(status => {

                const option =
                    document.createElement("option");

                option.value = status;

                option.textContent = status;

                select.appendChild(option);
            });

            select.value =
                statuses.includes(complaint.status)
                    ? complaint.status
                    : "Pending";

            select.addEventListener(
                "change",
                async () => {

                    await updateComplaintStatus(
                        complaint._id,
                        select.value,
                        select
                    );

                }
            );

            updateCell.appendChild(select);

            row.appendChild(updateCell);

            complaintsList.appendChild(row);
        });
    }

    // ==========================================
    // SEARCH / FILTER
    // ==========================================

    function filterComplaints() {

        const searchTerm =
            (searchInput?.value || "")
                .trim()
                .toLowerCase();

        if (!searchTerm) {

            renderComplaints(allComplaints);

            return;
        }

        const filtered =
            allComplaints.filter(complaint => {

                const searchableText = [

                    complaint.title,

                    complaint.description,

                    complaint.category,

                    complaint.department,

                    getLocation(complaint),

                    getCitizenName(complaint),

                    complaint.status

                ]
                    .map(getText)
                    .join(" ")
                    .toLowerCase();

                return searchableText.includes(
                    searchTerm
                );
            });

        renderComplaints(filtered);
    }

    // ==========================================
    // LOAD ALL COMPLAINTS
    // ==========================================

    async function loadComplaints() {

        showMessage("Loading complaints...");

        if (refreshButton) {
            refreshButton.disabled = true;
        }

        try {

            const response = await fetch(API_URL, {
                method: "GET",
                credentials: "include"
            });

            const data = await response.json();

            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Unable to load complaints."
                );
            }

            allComplaints =
                Array.isArray(data.complaints)
                    ? data.complaints
                    : [];

            updateCounts(allComplaints);

            filterComplaints();

            showMessage(
                `Loaded ${allComplaints.length} complaint(s).`,
                "success"
            );

        } catch (error) {

            console.error(
                "Load complaints error:",
                error
            );

            showMessage(
                error.message ||
                "Something went wrong while loading complaints.",
                "error"
            );

        } finally {

            if (refreshButton) {
                refreshButton.disabled = false;
            }
        }
    }

    // ==========================================
    // UPDATE COMPLAINT STATUS
    // ==========================================

    async function updateComplaintStatus(
        id,
        newStatus,
        select
    ) {

        if (!id) {

            showMessage(
                "Complaint ID is missing.",
                "error"
            );

            return;
        }

        select.disabled = true;

        showMessage(
            "Updating complaint status..."
        );

        try {

            const response = await fetch(
                `${API_URL}/${encodeURIComponent(id)}/status`,
                {
                    method: "PATCH",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        status: newStatus
                    })
                }
            );

            const data =
                await response.json();

            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Unable to update complaint status."
                );
            }

            showMessage(
                "Complaint status updated successfully.",
                "success"
            );

            await loadComplaints();

        } catch (error) {

            console.error(
                "Update status error:",
                error
            );

            showMessage(
                error.message ||
                "Status update failed.",
                "error"
            );

            await loadComplaints();

        } finally {

            select.disabled = false;
        }
    }

    // ==========================================
    // UPDATE COMPLAINT DEPARTMENT
    // ==========================================

    async function updateComplaintDepartment(
        id,
        newDepartment,
        select
    ) {

        if (!id) {

            showMessage(
                "Complaint ID is missing.",
                "error"
            );

            return;
        }

        select.disabled = true;

        showMessage(
            "Assigning complaint department..."
        );

        try {

            const response = await fetch(
                `${API_URL}/${encodeURIComponent(id)}/department`,
                {
                    method: "PATCH",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        department: newDepartment
                    })
                }
            );

            const data =
                await response.json();

            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Unable to assign department."
                );
            }

            // Update local complaint data
            const complaint =
                allComplaints.find(
                    item => item._id === id
                );

            if (complaint) {
                complaint.department =
                    newDepartment;
            }

            showMessage(
                "Department assigned successfully.",
                "success"
            );

        } catch (error) {

            console.error(
                "Department assignment error:",
                error
            );

            showMessage(
                error.message ||
                "Department assignment failed.",
                "error"
            );

            await loadComplaints();

        } finally {

            select.disabled = false;
        }
    }

    // ==========================================
    // LIVE SEARCH
    // ==========================================

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            filterComplaints
        );
    }

    // ==========================================
    // REFRESH BUTTON
    // ==========================================

    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            loadComplaints
        );
    }

    // ==========================================
    // INITIAL LOAD
    // ==========================================

    loadComplaints();

});
