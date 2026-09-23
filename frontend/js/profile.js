document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("citycare_token");
  let user = JSON.parse(localStorage.getItem("citycare_user") || "{}");

  // Elements
  const logoutBtn = document.getElementById("logoutBtn");
  const profileHeroName = document.getElementById("profileHeroName");
  const profileHeroLocation = document.getElementById("profileHeroLocation");
  const infoEmail = document.getElementById("infoEmail");
  const infoCity = document.getElementById("infoCity");
  const infoPhone = document.getElementById("infoPhone");
  const infoGender = document.getElementById("infoGender");
  const infoMemberSince = document.getElementById("infoMemberSince");
  const avatarImageWrap = document.getElementById("avatarImageWrap");
  const uploadAvatarBtn = document.getElementById("uploadAvatarBtn");
  const avatarFileInput = document.getElementById("avatarFileInput");

  // Activity counters
  const activityTotal = document.getElementById("activityTotal");
  const activityPending = document.getElementById("activityPending");
  const activityInProgress = document.getElementById("activityInProgress");
  const activityResolved = document.getElementById("activityResolved");

  // Modal elements
  const editProfileBtn = document.getElementById("editProfileBtn");
  const editProfileModal = document.getElementById("editProfileModal");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const cancelModalBtn = document.getElementById("cancelModalBtn");
  const editProfileForm = document.getElementById("editProfileForm");
  const editName = document.getElementById("editName");
  const editCity = document.getElementById("editCity");
  const editState = document.getElementById("editState");
  const editPhone = document.getElementById("editPhone");
  const editGender = document.getElementById("editGender");

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

  // Logout Handler
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("citycare_token");
      localStorage.removeItem("citycare_user");
      window.location.href = "login.html";
    });
  }

  // Populate User Info
  function renderUserInfo() {
    const name = user.name || "Risabh";
    const city = user.city || "Muzaffarpur";
    const state = user.state || "Bihar";
    const email = user.email || "sneon2123@gmail.com";
    const phone = user.phone || "+91 98765 43210";
    const gender = user.gender || "Male";
    const memberDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "September 2026";

    profileHeroName.textContent = `${name}!`;
    profileHeroLocation.textContent = `${city}, ${state}`;
    infoEmail.textContent = email;
    infoCity.textContent = city;
    infoPhone.textContent = phone;
    infoGender.textContent = gender;
    infoMemberSince.textContent = memberDate;

    if (user.avatarUrl) {
      avatarImageWrap.innerHTML = `<img src="${user.avatarUrl}" alt="${name}">`;
    }
  }

  // Load Activity Statistics
  async function loadUserActivity() {
    try {
      const API_URL = (typeof window.API_BASE_URL !== "undefined")
        ? `${window.API_BASE_URL}/complaints`
        : "/api/complaints";

      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(API_URL, { headers });
      if (res.ok) {
        const data = await res.json();
        const complaints = Array.isArray(data) ? data : (data.complaints || []);
        
        let total = complaints.length;
        let pending = 0;
        let inProgress = 0;
        let resolved = 0;

        complaints.forEach(c => {
          const s = (c.status || "Pending").toLowerCase();
          if (s.includes("resolve")) resolved++;
          else if (s.includes("progress")) inProgress++;
          else pending++;
        });

        activityTotal.textContent = total;
        activityPending.textContent = pending;
        activityInProgress.textContent = inProgress;
        activityResolved.textContent = resolved;
      }
    } catch {
      // Keep clean defaults (0) as in Image 2
      activityTotal.textContent = "0";
      activityPending.textContent = "0";
      activityInProgress.textContent = "0";
      activityResolved.textContent = "0";
    }
  }

  // Avatar upload button
  if (uploadAvatarBtn && avatarFileInput) {
    uploadAvatarBtn.addEventListener("click", () => {
      avatarFileInput.click();
    });

    avatarFileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = (event) => {
          avatarImageWrap.innerHTML = `<img src="${event.target.result}" alt="Avatar">`;
          user.avatarUrl = event.target.result;
          localStorage.setItem("citycare_user", JSON.stringify(user));
          showToast("Profile picture updated!");
        };
        reader.readAsDataURL(e.target.files[0]);
      }
    });
  }

  // Open Edit Modal
  if (editProfileBtn && editProfileModal) {
    editProfileBtn.addEventListener("click", () => {
      editName.value = user.name || "Risabh";
      editCity.value = user.city || "Muzaffarpur";
      editState.value = user.state || "Bihar";
      editPhone.value = user.phone || "+91 98765 43210";
      editGender.value = user.gender || "Male";
      editProfileModal.classList.add("open");
    });

    const closeModal = () => editProfileModal.classList.remove("open");
    closeModalBtn.addEventListener("click", closeModal);
    cancelModalBtn.addEventListener("click", closeModal);

    editProfileForm.addEventListener("submit", (e) => {
      e.preventDefault();
      user.name = editName.value.trim();
      user.city = editCity.value.trim();
      user.state = editState.value.trim();
      user.phone = editPhone.value.trim();
      user.gender = editGender.value;
      localStorage.setItem("citycare_user", JSON.stringify(user));
      renderUserInfo();
      closeModal();
      showToast("Profile details updated successfully!");
    });
  }

  renderUserInfo();
  loadUserActivity();
});