document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("citycare_token");
  const user = JSON.parse(localStorage.getItem("citycare_user") || "{}");

  // Elements
  const logoutBtn = document.getElementById("logoutBtn");
  const refreshBtn = document.getElementById("refreshBtn");
  const complaintsList = document.getElementById("complaintsList");
  const complaintFoundText = document.getElementById("complaintFoundText");
  const totalCountEl = document.getElementById("totalCount");
  const pendingCountEl = document.getElementById("pendingCount");
  const inProgressCountEl = document.getElementById("inProgressCount");
  const resolvedCountEl = document.getElementById("resolvedCount");
  const metricCards = document.querySelectorAll(".metric-card");

  let allComplaints = [];
  let currentFilter = "all";

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("citycare_token");
      localStorage.removeItem("citycare_user");
      window.location.href = "login.html";
    });
  }

  // Toast Helper
  function showToast(message, isError = false) {
    const toast = document.getElementById("toastNotification");
    if (!toast) return;
    toast.textContent = message;
    toast.style.backgroundColor = isError ? "#c53030" : "#254d36";
    toast.style.display = "block";
    setTimeout(() => {
      toast.style.display = "none";
    }, 3200);
  }

  // Determine Department by Category
  function getDepartment(category) {
    const map = {
      "Roads & Footpaths": "Public Works",
      "Garbage & Cleanliness": "Sanitation Department",
      "Water Supply": "Water Supply",
      "Streetlights & Electricity": "Electricity Board",
      "Drainage & Sewage": "Drainage & Sewage",
      "Public Parks": "Parks & Recreation",
      "Other": "Civic Administration"
    };
    return map[category] || "Public Works";
  }

  // Format Status Badge
  function getStatusBadge(status) {
    const normalized = (status || "Pending").toLowerCase();
    if (normalized.includes("resolve")) {
      return `<span class="status-badge status-resolved"><i class="fa-solid fa-circle-check"></i> Resolved</span>`;
    }
    if (normalized.includes("progress")) {
      return `<span class="status-badge status-in-progress"><i class="fa-solid fa-circle-notch"></i> In Progress</span>`;
    }
    return `<span class="status-badge status-pending"><i class="fa-regular fa-clock"></i> Pending</span>`;
  }

  // Render Complaints
  function renderComplaints() {
    let filtered = allComplaints;
    if (currentFilter !== "all") {
      filtered = allComplaints.filter(c => {
        const s = (c.status || "Pending").toLowerCase();
        return s === currentFilter.toLowerCase();
      });
    }

    if (complaintFoundText) {
      complaintFoundText.textContent = `${filtered.length} complaint(s) found.`;
    }

    if (!complaintsList) return;

    if (filtered.length === 0) {
      complaintsList.innerHTML = `
        <div class="empty-complaints" style="text-align: center; padding: 40px; color: #6b7280;">
          <i class="fa-regular fa-folder-open" style="font-size: 2.5rem; margin-bottom: 12px; display: block;"></i>
          <p>No complaints found under "${currentFilter}".</p>
        </div>
      `;
      return;
    }

    complaintsList.innerHTML = filtered.map(c => {
      const idStr = c._id ? `#CC${c._id.substring(c._id.length - 4).toUpperCase()}` : "#CC001";
      const dateStr = c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' }) : "Recent";
      const categoryStr = c.category || "General Issue";
      const departmentStr = c.department || getDepartment(categoryStr);
      
      // Handles both nested location.address and flat address
      const addressStr = (c.location && c.location.address) || c.address || "Location unavailable";
      
      // Check both 'image' (Cloudinary model field) and 'imageUrl'
      const photoSrc = c.image || c.imageUrl;
      const imageTag = photoSrc
        ? `<img src="${photoSrc}" alt="${c.title || 'Complaint'}" class="complaint-thumb-img" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">`
        : `<span class="no-photo-placeholder" style="font-size: 0.75rem; color: #9ca3af;">No photo</span>`;

      return `
        <div class="complaint-card">
          <div class="complaint-thumb-box">
            ${imageTag}
          </div>
          <div class="complaint-body">
            <h3 class="complaint-title">${c.title || "Civic Issue"}</h3>
            <div class="chips-row">
              <span class="chip-category">${categoryStr}</span>
              <span class="chip-department">Department: ${departmentStr}</span>
            </div>
            <div class="meta-row">
              <i class="fa-solid fa-location-dot"></i>
              <span>${addressStr}</span>
            </div>
            <div class="meta-row">
              <i class="fa-regular fa-calendar"></i>
              <span>Submitted: ${dateStr} &nbsp;•&nbsp; ID: ${idStr}</span>
            </div>
          </div>
          <div class="complaint-right-col">
            ${getStatusBadge(c.status)}
            <i class="fa-solid fa-arrow-right card-chevron"></i>
          </div>
        </div>
      `;
    }).join("");
  }

  // Calculate and display metric counters
  function updateMetrics() {
    let total = allComplaints.length;
    let pending = 0;
    let inProgress = 0;
    let resolved = 0;

    allComplaints.forEach(c => {
      const s = (c.status || "Pending").toLowerCase();
      if (s.includes("resolve")) resolved++;
      else if (s.includes("progress")) inProgress++;
      else pending++;
    });

    if (totalCountEl) totalCountEl.textContent = total;
    if (pendingCountEl) pendingCountEl.textContent = pending;
    if (inProgressCountEl) inProgressCountEl.textContent = inProgress;
    if (resolvedCountEl) resolvedCountEl.textContent = resolved;
  }

  // Fetch from backend
  async function loadComplaints() {
    try {
      // Determine exact URL to prevent resolving to /my
     const API_URL = "/api/complaints/my";

      const headers = {
        "Content-Type": "application/json"
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(API_URL, { headers });
      if (res.ok) {
        const data = await res.json();
        console.log("Complaints received:", data);
        allComplaints = Array.isArray(data) ? data : (data.complaints || []);
      } else {
        console.error("Server responded with error status:", res.status);
        allComplaints = [];
      }
    } catch (err) {
      console.error("Network or fetch error:", err);
      allComplaints = [];
    } finally {
      updateMetrics();
      renderComplaints();
    }
  }

  // Metric Filter Click
  metricCards.forEach(card => {
    card.addEventListener("click", () => {
      const filter = card.getAttribute("data-filter");
      metricCards.forEach(c => c.classList.remove("active-filter"));
      card.classList.add("active-filter");
      currentFilter = filter || "all";
      renderComplaints();
    });
  });

  // Refresh button
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      showToast("Refreshing complaints list...");
      loadComplaints();
    });
  }

  // Initial Load
  loadComplaints();
});