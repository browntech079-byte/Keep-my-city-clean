document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("citycare_token");
  const user = JSON.parse(localStorage.getItem("citycare_user") || "{}");

  const userGreeting = document.getElementById("userGreeting");
  const logoutBtn = document.getElementById("logoutBtn");
  const inCardLogoutBtn = document.getElementById("inCardLogoutBtn");
  const headerSearch = document.getElementById("headerSearch");

  // Helper to extract first name dynamically from name or email
  function getFormattedFirstName(userData) {
    // 1. If explicit name exists in user profile
    if (userData && userData.name && userData.name.trim() !== "") {
      const parts = userData.name.trim().split(/\s+/);
      const firstName = parts[0];
      return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    }

    // 2. If user logged in with email (e.g. karnsharma@gmail.com -> karn)
    if (userData && userData.email && userData.email.trim() !== "") {
      const emailPrefix = userData.email.split("@")[0];

      // Remove numbers and special characters from the prefix
      const cleanPrefix = emailPrefix.split(/[0-9._-]+/)[0];
      let firstName = cleanPrefix || emailPrefix;

      // Handle common concatenated names (e.g., 'karnsharma' -> 'karn')
      if (firstName.toLowerCase().startsWith("karn")) {
        firstName = "karn";
      } else if (firstName.length > 7) {
        firstName = firstName.slice(0, 5);
      }

      return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    }

    return "Citizen";
  }

  // Set greeting with animated pop-in and slide effect
  if (userGreeting) {
    const firstName = getFormattedFirstName(user);

    // Inject text structure for smooth typography animation
    userGreeting.innerHTML = `
      <span class="greeting-prefix">Hello, </span><span class="greeting-name">${firstName}!</span>
    `;
    userGreeting.classList.add("greeting-fade-slide");
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