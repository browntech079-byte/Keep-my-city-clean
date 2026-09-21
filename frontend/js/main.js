document.addEventListener('DOMContentLoaded', () => {
  setupUserGreetingAndAvatar();
  setupNotificationSystem();
  setupSearchFilter();
});

/* ==========================================================
   1. Animated Greeting & Gender-Specific Avatar
   ========================================================== */
function setupUserGreetingAndAvatar() {
  const user = JSON.parse(localStorage.getItem('user')) || {};
  let firstName = 'Citizen';

  // 1. Check user.name or email
  if (user.name && user.name.trim() !== '') {
    // E.g., "Rancho Das" -> "Rancho"
    firstName = user.name.trim().split(' ')[0];
  } else if (user.email) {
    // Fallback: "ranchodas412@gmail.com" -> "Rancho"
    const prefix = user.email.split('@')[0];
    const cleanPrefix = prefix.replace(/[0-9._]/g, '');
    const chosenName = cleanPrefix.length > 0 ? cleanPrefix : prefix;
    firstName = chosenName.charAt(0).toUpperCase() + chosenName.slice(1);
  }

  const nameDisplayEl = document.getElementById('userNameDisplay');
  if (nameDisplayEl) {
    nameDisplayEl.textContent = firstName;
  }

  // 2. Select Male vs Female Avatar
  const avatarEl = document.getElementById('userAvatarImg');
  if (avatarEl) {
    const gender = (user.gender || 'male').toLowerCase();
    if (gender === 'female' || gender === 'f') {
      avatarEl.src = 'https://avatar.iran.liara.run/public/girl';
    } else {
      avatarEl.src = 'https://avatar.iran.liara.run/public/boy';
    }
  }

  // 3. Update sidebar login button to Logout if user is logged in
  const sidebarLoginBtn = document.querySelector('.home-sidebar-login');
  if (sidebarLoginBtn && (user.email || localStorage.getItem('token'))) {
    sidebarLoginBtn.innerHTML = '<span aria-hidden="true">↩</span><span>Logout</span>';
    sidebarLoginBtn.href = '#';
    sidebarLoginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('citycare_complaint_statuses');
      localStorage.removeItem('citycare_notifications');
      window.location.href = 'login.html';
    });
  }
}

/* ==========================================================
   2. Real-Time Notification for Admin Status Changes
   ========================================================== */
function setupNotificationSystem() {
  const notifBtn = document.getElementById('notifBtn');
  const notifDropdown = document.getElementById('notifDropdown');
  const clearBtn = document.getElementById('clearNotifsBtn');

  // Load existing notifications
  const existingNotifs = JSON.parse(localStorage.getItem('citycare_notifications')) || [];
  renderNotifications(existingNotifs);

  // Toggle Dropdown
  if (notifBtn && notifDropdown) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
      if (!notifDropdown.contains(e.target) && !notifBtn.contains(e.target)) {
        notifDropdown.classList.remove('active');
      }
    });
  }

  // Clear notifications button
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      localStorage.removeItem('citycare_notifications');
      renderNotifications([]);
    });
  }

  // Check immediately and poll every 12 seconds
  checkComplaintStatusUpdates();
  setInterval(checkComplaintStatusUpdates, 12000);
}

async function checkComplaintStatusUpdates() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  if (!token && !user) return;

  const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'https://citycare-gov.onrender.com';

  try {
    const response = await fetch(`${baseUrl}/api/complaints`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });

    if (!response.ok) return;

    const data = await response.json();
    const complaints = Array.isArray(data) ? data : data.complaints || [];

    const savedStatuses = JSON.parse(localStorage.getItem('citycare_complaint_statuses')) || {};
    let notifications = JSON.parse(localStorage.getItem('citycare_notifications')) || [];
    let updated = false;

    complaints.forEach((c) => {
      const id = c._id || c.id;
      const title = c.title || c.category || 'Complaint';
      const currentStatus = c.status || 'Pending';

      // Compare previous status vs updated status from admin
      if (savedStatuses[id] && savedStatuses[id] !== currentStatus) {
        notifications.unshift({
          title,
          oldStatus: savedStatuses[id],
          newStatus: currentStatus,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        updated = true;
      }
      savedStatuses[id] = currentStatus;
    });

    localStorage.setItem('citycare_complaint_statuses', JSON.stringify(savedStatuses));

    if (updated) {
      localStorage.setItem('citycare_notifications', JSON.stringify(notifications));
    }

    renderNotifications(notifications);
  } catch (err) {
    console.error('Error checking notifications:', err);
  }
}

function renderNotifications(notifs) {
  const notifBadge = document.getElementById('notifBadge');
  const notifList = document.getElementById('notifList');

  if (!notifBadge || !notifList) return;

  if (notifs.length > 0) {
    notifBadge.style.display = 'inline-block';
    notifBadge.textContent = notifs.length;

    notifList.innerHTML = notifs.map((n) => `
      <div class="notif-item">
        <strong>${n.title}</strong> status changed to <span style="color: #607D51; font-weight: 700;">${n.newStatus}</span>.
        <div style="font-size: 0.72rem; color: #6B7864; margin-top: 3px;">${n.timestamp}</div>
      </div>
    `).join('');
  } else {
    notifBadge.style.display = 'none';
    notifList.innerHTML = '<div class="notif-empty">No status updates yet.</div>';
  }
}

/* ==========================================================
   3. Search Bar Filter for Bento Grid Cards
   ========================================================== */
function setupSearchFilter() {
  const searchInput = document.getElementById('topbarSearchInput');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const cards = document.querySelectorAll('.bento-card');

    cards.forEach((card) => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(query) ? '' : 'none';
    });
  });
}