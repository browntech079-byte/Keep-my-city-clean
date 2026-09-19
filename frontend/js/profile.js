document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // API CONFIGURATION
    // ==========================================

    const API_BASE_URL = "https://citycare-gov.onrender.com";

    // ==========================================
    // DOM ELEMENTS
    // ==========================================

    const profileMessage = document.getElementById("profileMessage");
    const profileCard = document.getElementById("profileCard");
    const profileStats = document.getElementById("profileStats");

    const profileAvatar = document.getElementById("profileAvatar");
    const profileName = document.getElementById("profileName");
    const profileLocation = document.getElementById("profileLocation");
    const profileRoleBadge = document.getElementById("profileRoleBadge");
    const profileEmail = document.getElementById("profileEmail");
    const profileCity = document.getElementById("profileCity");
    const profileState = document.getElementById("profileState");
    const profileJoined = document.getElementById("profileJoined");

    const totalCount = document.getElementById("profileTotalCount");
    const pendingCount = document.getElementById("profilePendingCount");
    const progressCount = document.getElementById("profileProgressCount");
    const resolvedCount = document.getElementById("profileResolvedCount");

    const logoutButton = document.getElementById("logoutButton");
    const sidebarLogout = document.getElementById("sidebarLogout");

    if (!profileCard) return;

    // ==========================================
    // HELPERS
    // ==========================================

    function getInitials(fullName) {
        if (!fullName) return "?";

        const parts = fullName.trim().split(/\s+/).slice(0, 2);

        return parts
            .map((part) => part.charAt(0).toUpperCase())
            .join("");
    }

    function formatJoinDate(dateString) {
        if (!dateString) return "—";

        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return "—";

        return date.toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric"
        });
    }

    function goToLogin() {
        window.location.href = "login.html";
    }

    // ==========================================
    // LOAD PROFILE
    // ==========================================

    async function loadProfile() {

        profileMessage.hidden = false;
        profileMessage.textContent = "Loading your profile...";
        profileCard.hidden = true;
        profileStats.hidden = true;

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/auth/me`,
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

            if (response.status === 401) {
                // Not logged in — send them to the login page
                goToLogin();
                return;
            }

            if (!response.ok || !data.user) {
                throw new Error(
                    data.message || "Unable to load your profile"
                );
            }

            renderProfile(data.user);
            profileMessage.hidden = true;
            profileCard.hidden = false;
            profileStats.hidden = false;

            // Load complaint activity separately so a stats
            // failure doesn't block the profile details above
            loadStats();

        } catch (error) {
            console.error("Profile load error:", error);

            profileMessage.hidden = false;
            profileMessage.textContent =
                error.message ||
                "Could not connect to CityCare's backend. Please try again in a moment.";
        }
    }

    function renderProfile(user) {
        profileAvatar.textContent = getInitials(user.fullName);
        profileName.textContent = user.fullName || "Unnamed user";

        const locationParts = [user.city, user.state].filter(Boolean);
        profileLocation.textContent =
            locationParts.length ? locationParts.join(", ") : "—";

        profileRoleBadge.textContent =
            user.role === "admin" ? "Administrator" : "Citizen";

        profileRoleBadge.className =
            user.role === "admin"
                ? "profile-role-badge admin"
                : "profile-role-badge";

        profileEmail.textContent = user.email || "—";
        profileCity.textContent = user.city || "—";
        profileState.textContent = user.state || "—";
        profileJoined.textContent = formatJoinDate(user.createdAt);
    }

    // ==========================================
    // LOAD COMPLAINT ACTIVITY
    // ==========================================

    async function loadStats() {
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

            if (!response.ok) return;

            const complaints = Array.isArray(data.complaints)
                ? data.complaints
                : [];

            const normalize = (status) =>
                (status || "").toLowerCase().replace(/\s+/g, "-");

            totalCount.textContent = complaints.length;

            pendingCount.textContent = complaints.filter(
                (c) => normalize(c.status) === "pending"
            ).length;

            progressCount.textContent = complaints.filter(
                (c) => normalize(c.status) === "in-progress"
            ).length;

            resolvedCount.textContent = complaints.filter(
                (c) => normalize(c.status) === "resolved"
            ).length;

        } catch (error) {
            // Stats are a nice-to-have on this page — fail quietly
            console.error("Profile stats error:", error);
        }
    }

    // ==========================================
    // LOGOUT
    // ==========================================

    async function handleLogout(event) {
        if (event) event.preventDefault();

        try {
            await fetch(`${API_BASE_URL}/api/auth/logout`, {
                method: "POST",
                credentials: "include"
            });
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            goToLogin();
        }
    }

    if (logoutButton) {
        logoutButton.addEventListener("click", handleLogout);
    }

    if (sidebarLogout) {
        sidebarLogout.addEventListener("click", handleLogout);
    }

    // ==========================================
    // INITIAL LOAD
    // ==========================================

    loadProfile();

});
