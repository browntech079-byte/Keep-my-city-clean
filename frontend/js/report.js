document.addEventListener("DOMContentLoaded", () => {
  // Check auth
  const token = localStorage.getItem("citycare_token");
  const user = JSON.parse(localStorage.getItem("citycare_user") || "{}");

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("citycare_token");
      localStorage.removeItem("citycare_user");
      window.location.href = "login.html";
    });
  }

  // File Upload Indicator
  const imageUpload = document.getElementById("imageUpload");
  const fileName = document.getElementById("fileName");
  if (imageUpload && fileName) {
    imageUpload.addEventListener("change", (e) => {
      if (e.target.files && e.target.files.length > 0) {
        fileName.textContent = e.target.files[0].name;
      } else {
        fileName.textContent = "No file chosen";
      }
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
    }, 3500);
  }

  // Initialize Leaflet Map (Centered on Pune as per reference image)
  const defaultLat = 18.5204;
  const defaultLng = 73.8567;
  const map = L.map("map", {
    zoomControl: false
  }).setView([defaultLat, defaultLng], 12);

  // Reposition zoom controls to match top-left style
  L.control.zoom({ position: "topleft" }).addTo(map);

  // CartoDB / OSM clean tile layer
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // Custom Pine/Forest Pin Marker
  const customPinIcon = L.divIcon({
    className: "custom-map-marker",
    html: `
      <div style="
        background-color: #254d36;
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #ffffff;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      ">
        <div style="
          width: 10px;
          height: 10px;
          background-color: #ffffff;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32]
  });

  let marker = L.marker([defaultLat, defaultLng], { icon: customPinIcon }).addTo(map);

  const selectedLocText = document.getElementById("selectedLocationText");
  const latInput = document.getElementById("latitude");
  const lngInput = document.getElementById("longitude");
  const addressInput = document.getElementById("address");

  function setCoordinates(lat, lng, label = null) {
    latInput.value = lat;
    lngInput.value = lng;
    marker.setLatLng([lat, lng]);

    if (label) {
      selectedLocText.textContent = label;
      addressInput.value = label;
    } else {
      selectedLocText.textContent = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
      addressInput.value = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
      // Reverse Geocoding with OpenStreetMap Nominatim
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.display_name) {
            const shortAddress = data.display_name.split(",").slice(0, 3).join(",");
            selectedLocText.textContent = shortAddress;
            addressInput.value = data.display_name;
          }
        })
        .catch(() => {});
    }
  }

  // Set default
  setCoordinates(defaultLat, defaultLng, "Pune, Maharashtra, India");

  // Map Click Listener
  map.on("click", (e) => {
    setCoordinates(e.latlng.lat, e.latlng.lng);
  });

  // PIN Code Search Handler
  const pinInput = document.getElementById("pinInput");
  const searchPinBtn = document.getElementById("searchPinBtn");

  if (searchPinBtn && pinInput) {
    searchPinBtn.addEventListener("click", () => {
      const pin = pinInput.value.trim();
      if (!pin || pin.length < 5) {
        showToast("Please enter a valid PIN code", true);
        return;
      }
      fetch(`https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(pin)}&country=India&format=json`)
        .then(res => res.json())
        .then(results => {
          if (results && results.length > 0) {
            const lat = parseFloat(results[0].lat);
            const lon = parseFloat(results[0].lon);
            map.setView([lat, lon], 13);
            setCoordinates(lat, lon, results[0].display_name);
            showToast(`Location set to PIN: ${pin}`);
          } else {
            showToast("PIN code location not found", true);
          }
        })
        .catch(() => {
          showToast("Failed to lookup PIN code", true);
        });
    });
  }

  // Form Submission
  const form = document.getElementById("reportIssueForm");
  const submitBtn = document.getElementById("submitBtn");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const title = document.getElementById("title").value.trim();
      const category = document.getElementById("category").value;
      const description = document.getElementById("description").value.trim();
      const latitude = latInput.value;
      const longitude = lngInput.value;
      const address = addressInput.value;
      const file = imageUpload.files[0];

      if (!title || !category || !description) {
        showToast("Please fill in all required fields", true);
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Submitting...</span>`;

      try {
        const formData = new FormData();
        formData.append("title", title);
        formData.append("category", category);
        formData.append("description", description);
        formData.append("latitude", latitude);
        formData.append("longitude", longitude);
        formData.append("address", address);
        if (file) {
          formData.append("image", file);
        }

        const API_URL = (typeof window.API_BASE_URL !== "undefined") 
          ? `${window.API_BASE_URL}/complaints`
          : "/api/complaints";

        const headers = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(API_URL, {
          method: "POST",
          headers: headers,
          body: formData
        });

        const data = await res.json();

        if (res.ok) {
          showToast("Complaint submitted successfully!");
          form.reset();
          fileName.textContent = "No file chosen";
          setTimeout(() => {
            window.location.href = "complaints.html";
          }, 1200);
        } else {
          showToast(data.message || "Failed to submit complaint", true);
        }
      } catch (err) {
        showToast("Network error. Could not reach server.", true);
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <i class="fa-regular fa-paper-plane"></i>
          <span>Submit Complaint</span>
          <i class="fa-solid fa-arrow-right-long arrow-right"></i>
        `;
      }
    });
  }
});