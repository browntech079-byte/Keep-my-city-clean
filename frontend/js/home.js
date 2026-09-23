document.addEventListener("DOMContentLoaded", () => {
  // Retrieve the authenticated user data stored upon login/registration
  const rawUser = localStorage.getItem("citycare_user") || localStorage.getItem("user") || localStorage.getItem("currentUser") || "{}";
  let user = {};

  try {
    user = JSON.parse(rawUser);
  } catch (e) {
    user = {};
  }

  const userGreeting = document.getElementById("userGreeting");
  const logoutBtn = document.getElementById("logoutBtn");
  const inCardLogoutBtn = document.getElementById("inCardLogoutBtn");
  const headerSearch = document.getElementById("headerSearch");

  // Helper: Extract ONLY the first name from the user's registered full name
  function extractFirstName(userData) {
    // 1. Check user's fullName or name property
    const fullName = userData.name || userData.fullName || userData.userName || "";

    if (fullName && fullName.trim() !== "") {
      // Clean off any accidental symbols/punctuation
      const cleaned = fullName.trim().replace(/[!.]+$/, "");
      // Split by whitespace and grab the first token (e.g. "Sundar Das" -> "Sundar")
      const firstWord = cleaned.split(/\s+/)[0];
      return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
    }

    // 2. Fallback if name field is absent
    return "Citizen";
  }

  // Set the personalized greeting dynamically
  if (userGreeting) {
    const firstName = extractFirstName(user);

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
    localStorage.removeItem("user");
    window.location.href = "login.html";
  };

  if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
  if (inCardLogoutBtn) inCardLogoutBtn.addEventListener("click", handleLogout);
});