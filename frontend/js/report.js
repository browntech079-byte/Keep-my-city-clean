document.addEventListener("DOMContentLoaded", () => {
  // Check authentication
  const token = localStorage.getItem("citycare_token");
  if (!token) {
    showToast("Please log in to report an issue.", "error");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1500);
    return;
  }

  // Element Selectors
  const reportForm = document.getElementById("reportForm") || document.querySelector("form");
  const issuePhotoInput = document.getElementById("issuePhoto") || document.getElementById("photo") || document.querySelector('input[type="file"]');
  const photoNameDisplay = document.getElementById("photoNameDisplay") || document.querySelector(".file-name-display");
  const pinInput = document.getElementById("pinCodeInput") || document.querySelector('input[placeholder*="PIN"]') || document.querySelector('input[name="pincode"]');
  const pinSearchBtn = document.getElementById("pinSearchBtn") || document.querySelector('button.pin-search-btn');
  const selectedLocationText = document.getElementById("selectedLocationText") || document.querySelector(".selected-location-box span") || document.querySelector(".location-text");
  const logoutBtn = document.getElementById("logoutBtn");

  // Lat / Lng hidden fields or state
  let currentCoords = {
    lat: 18.5204, // Default: Pune / Maharashtra area
    lng: 73.8567
  };

  // --------------------------------------------------------------------------
  // 1. Toast Notification Utility
  // --------------------------------------------------------------------------
  function showToast(message, type = "info") {
    let toast = document.querySelector(".toast-notification");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast-notification";
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = `toast-notification toast-${type} show`;

    clearTimeout(toast.timeoutId);
    toast.timeoutId = setTimeout(() => {
      toast.classList.remove("show");
    }, 3500);
  }
  window.showToast = showToast;

  // --------------------------------------------------------------------------
  // 2. Leaflet Map Initialization
  // --------------------------------------------------------------------------
  let map, marker;
  const mapElement = document.getElementById("reportMap") || document.getElementById("map");

  if (mapElement && typeof L !== "undefined") {
    map = L.map(mapElement).setView([currentCoords.lat, currentCoords.lng], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19
    }).addTo(map);

    // Custom Map Pin Marker
    const mapPinIcon = L.divIcon({
      className: "custom-leaflet-marker",
      html: `<div style="background-color: #254d36; color: #ffffff; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2.5px solid #fff;"><i class="fa-solid fa-location-dot" style="font-size: 16px;"></i></div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 34]
    });

    marker = L.marker([currentCoords.lat, currentCoords.lng], {
      draggable: true,
      icon: mapPinIcon
    }).addTo(map);

    // Reverse Geocode lookup
    async function updateLocationAddress(lat, lng) {
      currentCoords = { lat, lng };
      if (selectedLocationText) {
        selectedLocationText.textContent = "Fetching address...";
      }

      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        if (data && data.display_name) {
          const shortAddress = data.display_name.split(",").slice(0, 4).join(", ");
          if (selectedLocationText) {
            selectedLocationText.textContent = shortAddress;
          }
        } else {
          if (selectedLocationText) {
            selectedLocationText.textContent = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
          }
        }
      } catch (err) {
        if (selectedLocationText) {
          selectedLocationText.textContent = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
        }
      }
    }

    // Marker drag event
    marker.on("dragend", (e) => {
      const pos = e.target.getLatLng();
      updateLocationAddress(pos.lat, pos.lng);
    });

    // Map click event
    map.on("click", (e) => {
      marker.setLatLng(e.latlng);
      updateLocationAddress(e.latlng.lat, e.latlng.lng);
    });

    // Initial address fetch
    updateLocationAddress(currentCoords.lat, currentCoords.lng);

    // Try HTML5 Browser Geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userLat = pos.coords.latitude;
          const userLng = pos.coords.longitude;
          map.setView([userLat, userLng], 14);
          marker.setLatLng([userLat, userLng]);
          updateLocationAddress(userLat, userLng);
        },
        () => {
          // Keep default if location permission declined
        }
      );
    }
  }

  // --------------------------------------------------------------------------
  // 3. PIN Code Search
  // --------------------------------------------------------------------------
  if (pinSearchBtn && pinInput) {
    pinSearchBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const pin = pinInput.value.trim();
      if (!pin) {
        showToast("Please enter a PIN code.", "warning");
        return;
      }

      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(pin)}&country=India&format=json`);
        const results = await res.json();
        if (results && results.length > 0) {
          const first = results[0];
          const lat = parseFloat(first.lat);
          const lng = parseFloat(first.lon);
          map.setView([lat, lng], 14);
          marker.setLatLng([lat, lng]);
          if (selectedLocationText) {
            selectedLocationText.textContent = first.display_name.split(",").slice(0, 4).join(", ");
          }
          currentCoords = { lat, lng };
          showToast("Location updated from PIN code!", "success");
        } else {
          showToast("PIN code not found. Please click on the map directly.", "error");
        }
      } catch (err) {
        showToast("Failed to search PIN code.", "error");
      }
    });
  }

  // --------------------------------------------------------------------------
  // 4. Photo File Selection Preview
  // --------------------------------------------------------------------------
  if (issuePhotoInput) {
    issuePhotoInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        if (photoNameDisplay) {
          photoNameDisplay.textContent = file.name;
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // 5. Complaint Form Submission (Robust 200/201 Response Handling)
  // --------------------------------------------------------------------------
  if (reportForm) {
    reportForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const submitBtn = reportForm.querySelector('button[type="submit"]');
      const originalBtnContent = submitBtn ? submitBtn.innerHTML : "";

      const userToken = localStorage.getItem("citycare_token");
      if (!userToken) {
        showToast("Please log in before submitting a complaint.", "error");
        setTimeout(() => (window.location.href = "login.html"), 1500);
        return;
      }

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Submitting...`;
        }

        // Build FormData
        const formData = new FormData(reportForm);

        // Append Coordinates & Address if available
        if (currentCoords) {
          formData.set("latitude", currentCoords.lat);
          formData.set("longitude", currentCoords.lng);
        }
        if (selectedLocationText && selectedLocationText.textContent) {
          formData.set("address", selectedLocationText.textContent.trim());
        }

        // Determine base API endpoint
        const apiBase = (typeof CONFIG !== "undefined" && CONFIG.API_BASE_URL) ? CONFIG.API_BASE_URL : "/api";

        const response = await fetch(`${apiBase}/complaints`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${userToken}`
            // Do not manually set Content-Type; FormData sets multipart/form-data with boundaries
          },
          body: formData
        });

        // Safely extract text first to avoid parsing crashes
        const rawText = await response.text();
        let resData = {};
        try {
          resData = JSON.parse(rawText);
        } catch (_) {
          resData = { message: rawText };
        }

        if (!response.ok) {
          const errorMsg = resData.message || resData.error || `Server responded with status ${response.status}`;
          showToast(errorMsg, "error");
          return;
        }

        // Success condition (HTTP 200/201)
        showToast("Complaint submitted successfully!", "success");
        reportForm.reset();

        setTimeout(() => {
          window.location.href = "complaints.html";
        }, 1200);

      } catch (err) {
        console.error("Submission error details:", err);
        showToast(err.message || "Failed to process request.", "error");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnContent;
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // 6. Logout Handler
  // --------------------------------------------------------------------------
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("citycare_token");
      localStorage.removeItem("citycare_user");
      window.location.href = "login.html";
    });
  }
});