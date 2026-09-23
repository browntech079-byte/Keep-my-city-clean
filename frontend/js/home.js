document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("citycare_token");
  const user = JSON.parse(localStorage.getItem("citycare_user") || "{}");

  const userGreeting = document.getElementById("userGreeting");
  const logoutBtn = document.getElementById("logoutBtn");
  const inCardLogoutBtn = document.getElementById("inCardLogoutBtn");
  const headerSearch = document.getElementById("headerSearch");

  // Helper: Strictly retrieves the profile name without parsing or falling back to email
  function getProfileFirstName(userData) {
    if (userData && userData.name && userData.name.trim() !== "") {
      // Strip trailing punctuation like '!' or '.' if present in the stored profile
      const cleanName = userData.name.trim().replace(/[!.]+$/, "");
      const firstName = cleanName.split(/\s+/)[0];
      return firstName.charAt(0).toUpperCase() + firstName.slice(1);
    }
    // Default fallback to "Risabh" matching the profile section
    return "Risabh";
  }

  // Render "Hello, Risabh!" with animated cursive script styling
  if (userGreeting) {
    const firstName = getProfileFirstName(user);

    userGreeting.innerHTML = `
      <span class="greeting-prefix">Hello,</span>
      <span class="greeting-name">${firstName}!</span>
    `;
    userGreeting.classList.add("greeting-animated");
  }

  // Quick search redirection
  if (headerSearch) {
    headerSearch.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const query = headerSearch.value.trim();
        if (query) {
          window.location.href = `complaints.html?search=${encodeURIComponent(query)}`;
        }
      }
    });
  }

  // Logout Handlers
  const handleLogout = () => {
    localStorage.removeItem("citycare_token");
    localStorage.removeItem("citycare_user");
    window.location.href = "login.html";
  };

  if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
  if (inCardLogoutBtn) inCardLogoutBtn.addEventListener("click", handleLogout);
});