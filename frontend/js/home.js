document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // API CONFIGURATION
    // ==========================================

    const API_BASE_URL = "https://citycare-gov.onrender.com";

    // ==========================================
    // DOM ELEMENTS
    // ==========================================

    const topbar = document.getElementById("homeTopbar");
    const greeting = document.getElementById("homeGreeting");

    const searchInput = document.getElementById("homeSearchInput");
    const searchIcon = document.querySelector(".home-search-icon");
    const searchResults = document.getElementById("homeSearchResults");

    const notifBtn = document.getElementById("homeNotifBtn");
    const notifDot = document.getElementById("homeNotifDot");
    const notifDropdown = document.getElementById("homeNotifDropdown");
    const notifList = document.getElementById("homeNotifList");

    const avatarEl = document.getElementById("homeAvatar");

    // This page works fine for a signed-out visitor too — the
    // topbar just never appears, and the rest of the homepage
    // (hero, bento cards) stays exactly as it was.
    if (!topbar) return;

    // ==========================================
    // AUTH HELPERS
    // ==========================================

    function getAuthToken() {
        return localStorage.getItem("citycare_token");
    }

    const token = getAuthToken();

    if (!token) {
        return;
    }

    function authHeaders() {
        return { Authorization: `Bearer ${token}` };
    }

    // ==========================================
    // AVATAR ICONS (male / female)
    // ==========================================

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
        if (!avatarEl) return;
        avatarEl.innerHTML =
            AVATAR_SVG[gender === "female" ? "female" : "male"];
    }

    // ==========================================
    // GREETING
    // ==========================================

    function getFirstName(fullName) {
        if (!fullName) return "there";
        return fullName.trim().split(/\s+/)[0];
    }

    function showGreeting(fullName) {
        if (!greeting) return;

        greeting.textContent = `Hello, ${getFirstName(fullName)}!`;

        // Restart the animation even if this ever runs twice
        greeting.classList.remove("home-greeting-in");
        // Force reflow so the class removal actually takes effect
        void greeting.offsetWidth;
        greeting.classList.add("home-greeting-in");
    }

    // ==========================================
    // LOAD CURRENT USER
    // ==========================================

    async function loadUser() {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/auth/me`,
                { headers: authHeaders() }
            );

            if (!response.ok) {
                // Not logged in (or token expired) — quietly leave
                // the topbar hidden rather than forcing a redirect
                // away from the public Home page
                return null;
            }

            const data = await response.json();
            if (!data.user) return null;

            topbar.hidden = false;
            showGreeting(data.user.fullName);
            renderAvatar(data.user.gender);

            return data.user;

        } catch (error) {
            console.error("Home: failed to load user", error);
            return null;
        }
    }

    // ==========================================
    // COMPLAINTS (shared by search + notifications,
    // fetched once per page load)
    // ==========================================

    let myComplaints = [];

    async function loadMyComplaints() {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/complaints/my`,
                { headers: authHeaders() }
            );

            if (!response.ok) return [];

            const data = await response.json();
            myComplaints = Array.isArray(data.complaints)
                ? data.complaints
                : [];

            return myComplaints;

        } catch (error) {
            console.error("Home: failed to load complaints", error);
            return [];
        }
    }

    // ==========================================
    // SEARCH
    // ==========================================

    function matchesQuery(complaint, query) {
        const haystack = [
            complaint.title,
            complaint.category,
            complaint.location,
            complaint.address
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        return haystack.includes(query);
    }

    function renderSearchPreview(query) {
        if (!searchResults) return;

        if (!query) {
            searchResults.hidden = true;
            searchResults.innerHTML = "";
            return;
        }

        const matches = myComplaints
            .filter((c) => matchesQuery(c, query))
            .slice(0, 5);

        searchResults.innerHTML = "";

        if (matches.length === 0) {
            const empty = document.createElement("p");
            empty.className = "home-search-empty";
            empty.textContent = "No matching complaints";
            searchResults.appendChild(empty);
            searchResults.hidden = false;
            return;
        }

        matches.forEach((complaint) => {
            const link = document.createElement("a");
            link.className = "home-search-result";
            link.href = `complaints.html?search=${encodeURIComponent(query)}`;

            const title = document.createElement("strong");
            title.textContent = complaint.title || "Untitled complaint";

            const meta = document.createElement("span");
            meta.textContent =
                [complaint.category, complaint.status]
                    .filter(Boolean)
                    .join(" · ");

            link.appendChild(title);
            link.appendChild(meta);
            searchResults.appendChild(link);
        });

        searchResults.hidden = false;
    }

    function goToSearchPage() {
        const query = (searchInput.value || "").trim();
        if (!query) return;
        window.location.href =
            `complaints.html?search=${encodeURIComponent(query)}`;
    }

    if (searchInput) {
        let debounceTimer = null;

        searchInput.addEventListener("input", () => {
            clearTimeout(debounceTimer);
            const query = searchInput.value.trim().toLowerCase();

            debounceTimer = setTimeout(() => {
                renderSearchPreview(query);
            }, 200);
        });

        searchInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                goToSearchPage();
            }
        });
    }

    if (searchIcon) {
        searchIcon.addEventListener("click", goToSearchPage);
    }

    document.addEventListener("click", (event) => {
        if (
            searchResults &&
            !searchResults.hidden &&
            searchInput &&
            !searchInput.contains(event.target) &&
            !searchResults.contains(event.target)
        ) {
            searchResults.hidden = true;
        }
    });

    // ==========================================
    // NOTIFICATIONS
    // (detects status changes since the citizen's
    // last visit, using a per-user snapshot in
    // localStorage — no backend changes needed)
    // ==========================================

    function normalizeStatus(status) {
        return (status || "").toLowerCase().trim();
    }

    function checkForStatusChanges(userId) {
        if (!userId || !notifList) return;

        const snapshotKey = `citycare_status_snapshot_${userId}`;

        let previousSnapshot = {};
        try {
            previousSnapshot =
                JSON.parse(localStorage.getItem(snapshotKey) || "{}");
        } catch (error) {
            previousSnapshot = {};
        }

        const currentSnapshot = {};
        const changes = [];

        myComplaints.forEach((complaint) => {
            const id = complaint._id || complaint.id;
            if (!id) return;

            const status = normalizeStatus(complaint.status);
            currentSnapshot[id] = status;

            const previousStatus = previousSnapshot[id];

            // Only counts as a "change" if we've genuinely seen this
            // complaint before with a DIFFERENT status — a brand-new
            // complaint (no previous entry) isn't a change to report
            if (previousStatus && previousStatus !== status) {
                changes.push({
                    title: complaint.title || "Untitled complaint",
                    status: complaint.status
                });
            }
        });

        localStorage.setItem(
            snapshotKey,
            JSON.stringify(currentSnapshot)
        );

        renderNotifications(changes);
    }

    function renderNotifications(changes) {
        if (!notifList || !notifDot) return;

        notifList.innerHTML = "";

        if (changes.length === 0) {
            notifDot.hidden = true;

            const empty = document.createElement("p");
            empty.className = "home-notif-empty";
            empty.textContent = "No new notifications";
            notifList.appendChild(empty);
            return;
        }

        notifDot.hidden = false;

        changes.forEach((change) => {
            const item = document.createElement("div");
            item.className = "home-notif-item";

            const title = document.createElement("strong");
            title.textContent = change.title;

            const statusLine = document.createElement("span");
            statusLine.textContent =
                `Status changed to ${change.status}`;

            item.appendChild(title);
            item.appendChild(statusLine);
            notifList.appendChild(item);
        });
    }

    if (notifBtn && notifDropdown) {
        notifBtn.addEventListener("click", (event) => {
            event.stopPropagation();

            const wasHidden = notifDropdown.hidden;
            notifDropdown.hidden = !wasHidden;

            // Opening the dropdown counts as "read"
            if (wasHidden) {
                notifDot.hidden = true;
            }
        });

        document.addEventListener("click", (event) => {
            if (
                !notifDropdown.hidden &&
                !notifBtn.contains(event.target) &&
                !notifDropdown.contains(event.target)
            ) {
                notifDropdown.hidden = true;
            }
        });
    }

    // ==========================================
    // INITIAL LOAD
    // ==========================================

    loadUser().then((user) => {
        if (!user) return;

        loadMyComplaints().then(() => {
            checkForStatusChanges(user.id);
        });
    });

});