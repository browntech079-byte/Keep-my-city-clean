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
    const profileGender = document.getElementById("profileGender");
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

    // Same avatar artwork used on the Home page topbar, so a
    // citizen's picture looks consistent everywhere on the site
    const AVATAR_SVG = {
        male: `
            <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32" cy="32" r="32" fill="#607D51"/>
                <circle cx="32" cy="26" r="12" fill="#F2EFE6"/>
                <path d="M32 12c-7 0-11 5-11 11 0 2 .5 4 1.2 5.6
                         C24 24 27 21 32 21s8 3 9.8 7.6
                         C42.5 27 43 25 43 23c0-6-4-11-11-11z"
                      fill="#3A2A20"/>
                <path d="M10 62c1.5-11 10-18 22-18s20.5 7 22 18
                         a32 32 0 0 1-44 0z"
                      fill="#F2EFE6"/>
            </svg>
        `,
        female: `
            <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32" cy="32" r="32" fill="#847A56"/>
                <path d="M18 20c0-8 6-14 14-14s14 6 14 14
                         c0 5-1 12-3 17-2 4-6 9-11 9s-9-5-11-9
                         c-2-5-3-12-3-17z"
                      fill="#3A2A20"/>
                <circle cx="32" cy="27" r="11" fill="#F2EFE6"/>
                <path d="M14 20c0-10 8-17 18-17s18 7 18 17
                         c0 3-.4 6-1 9-1-4-3-7-6-8
                         c-2 3-6 5-11 5s-9-2-11-5
                         c-3 1-5 4-6 8-.6-3-1-6-1-9z"
                      fill="#3A2A20"/>
                <path d="M9 62c1.5-11 10.5-18 23-18s21.5 7 23 18
                         a32 32 0 0 1-46 0z"
                      fill="#F2EFE6"/>
            </svg>
        `
    };

    function renderAvatar(gender) {
        profileAvatar.innerHTML =
            AVATAR_SVG[gender === "female" ? "female" : "male"];
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

    function getAuthToken() {
        return localStorage.getItem("citycare_token");
    }

    function clearAuth() {
        localStorage.removeItem("citycare_token");
        localStorage.removeItem("citycare_user");
    }

    // ==========================================
    // LOAD PROFILE
    // ==========================================

    async function loadProfile() {

        const token = getAuthToken();

        if (!token) {
            goToLogin();
            return;
        }

        profileMessage.hidden = false;
        profileMessage.textContent = "Loading your profile...";
        profileCard.hidden = true;
        profileStats.hidden = true;

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/auth/me`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            let data = {};

            try {
                data = await response.json();
            } catch (jsonError) {
                data = {};
            }

            if (response.status === 401) {
                // Not logged in (or the token expired) — send them
                // to the login page
                clearAuth();
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
        renderAvatar(user.gender);
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

        profileGender.textContent =
            user.gender === "female" ? "Female" : "Male";

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
                    headers: {
                        Authorization: `Bearer ${getAuthToken()}`
                    }
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
                headers: {
                    Authorization: `Bearer ${getAuthToken()}`
                }
            });
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            clearAuth();
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