document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // API CONFIGURATION
    // ==========================================

    const API_BASE_URL = "https://citycare-gov.onrender.com";


    // ==========================================
    // 1. INITIALIZE MAP
    // ==========================================

    const mapElement = document.getElementById("reportMap");

    if (!mapElement) {
        return;
    }

    // Default map center: India
    const defaultLatitude = 20.5937;
    const defaultLongitude = 78.9629;

    const map = L.map("reportMap").setView(
        [defaultLatitude, defaultLongitude],
        5
    );

    // OpenStreetMap tiles
    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution: "&copy; OpenStreetMap contributors",
            maxZoom: 19
        }
    ).addTo(map);


    // ==========================================
    // 2. MAP LOCATION SELECTION
    // ==========================================

    let marker = null;

    // Bumped on every location change (map click OR pincode search) so an
    // in-flight reverse-geocode response from an older selection can be
    // told apart from the most recent one — without this, a slow response
    // to an earlier selection can arrive after a faster response to a
    // later one and overwrite the correct address/marker with stale data.
    let locationRequestId = 0;

    const latitudeInput = document.getElementById("latitude");
    const longitudeInput = document.getElementById("longitude");
    const addressInput = document.getElementById("address");
    const locationText = document.getElementById("locationText");

    // ==========================================
    // SHARED LOCATION SELECTION
    // ==========================================
    // Places the marker, saves the coordinates and reverse-geocodes the
    // address. Used by both a direct map click and a PIN code search, so
    // the two stay in sync.

    async function selectLocation(latitude, longitude) {

        const requestId = ++locationRequestId;

        // Remove previous marker
        if (marker) {
            map.removeLayer(marker);
        }

        // Add new marker — kept as a local reference so the popup below
        // always binds to the marker THIS selection created, even if a
        // later selection has since reassigned the shared `marker` variable.
        const newMarker = L.marker([latitude, longitude]).addTo(map);
        marker = newMarker;

        // Save coordinates
        latitudeInput.value = latitude;
        longitudeInput.value = longitude;

        // Reset address while looking it up
        addressInput.value = "";

        locationText.textContent =
            `Location selected: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

        try {

            // ==========================================
            // REVERSE GEOCODING
            // ==========================================

            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
            );

            if (!response.ok) {
                throw new Error("Failed to get address");
            }

            const data = await response.json();

            // A newer selection has happened since this request started —
            // discard this result so it can't overwrite fresher data.
            if (requestId !== locationRequestId) {
                return;
            }

            const address = data.display_name || "";

            addressInput.value = address;

            locationText.textContent =
                address ||
                `Location selected: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

            // Safe popup content
            const popupContent = document.createElement("div");

            const popupTitle = document.createElement("strong");
            popupTitle.textContent = "Selected Location";

            const popupAddress = document.createElement("div");
            popupAddress.textContent =
                address || "Location selected";

            popupContent.appendChild(popupTitle);
            popupContent.appendChild(popupAddress);

            newMarker
                .bindPopup(popupContent)
                .openPopup();

        } catch (error) {

            // Also discard a stale failure — a newer selection already
            // replaced this one, so there's nothing left to update.
            if (requestId !== locationRequestId) {
                return;
            }

            console.error("Address lookup failed:", error);

            addressInput.value =
                `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

            locationText.textContent =
                `Location selected: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

            newMarker
                .bindPopup("Selected Location")
                .openPopup();
        }
    }

    map.on("click", (event) => {
        selectLocation(event.latlng.lat, event.latlng.lng);
    });


    // ==========================================
    // 2B. PIN CODE SEARCH (ALL-INDIA)
    // ==========================================
    // Looks the PIN code up via India Post's public API to get the
    // post office/district/state, then geocodes that place name via
    // Nominatim so the map can jump straight to it. Falls back to a
    // district-level match if the precise post office isn't found.

    const pincodeInput = document.getElementById("pincodeInput");
    const pincodeSearchBtn = document.getElementById("pincodeSearchBtn");
    const pincodeStatus = document.getElementById("pincodeStatus");

    function setPincodeStatus(message, type) {

        if (!pincodeStatus) {
            return;
        }

        pincodeStatus.textContent = message;
        pincodeStatus.classList.remove("error", "success");

        if (type) {
            pincodeStatus.classList.add(type);
        }
    }

    async function geocodePlace(query) {

        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(query)}`
        );

        if (!response.ok) {
            return null;
        }

        const results = await response.json();

        if (!Array.isArray(results) || results.length === 0) {
            return null;
        }

        return {
            latitude: parseFloat(results[0].lat),
            longitude: parseFloat(results[0].lon)
        };
    }

    async function handlePincodeSearch() {

        const pincode = pincodeInput.value.trim();

        if (!/^\d{6}$/.test(pincode)) {
            setPincodeStatus("Enter a valid 6-digit PIN code.", "error");
            return;
        }

        if (pincodeSearchBtn) {
            pincodeSearchBtn.disabled = true;
            pincodeSearchBtn.textContent = "Locating...";
        }

        setPincodeStatus("Looking up PIN code...", null);

        try {

            const postResponse = await fetch(
                `https://api.postalpincode.in/pincode/${pincode}`
            );

            if (!postResponse.ok) {
                throw new Error("PIN code lookup failed.");
            }

            const postData = await postResponse.json();

            const lookup =
                Array.isArray(postData) ? postData[0] : null;

            if (!lookup || lookup.Status !== "Success" || !Array.isArray(lookup.PostOffice) || lookup.PostOffice.length === 0) {
                setPincodeStatus("No location found for that PIN code.", "error");
                return;
            }

            const office = lookup.PostOffice[0];
            const district = office.District || "";
            const state = office.State || "";

            // Try the precise post office name first, then fall back to
            // a district-level match so every valid Indian PIN code
            // resolves to at least an approximate area.
            let place =
                await geocodePlace(`${office.Name}, ${district}, ${state}, India`);

            if (!place) {
                place = await geocodePlace(`${district}, ${state}, India`);
            }

            if (!place) {
                setPincodeStatus(
                    `Found ${office.Name}, ${district}, ${state}, but couldn't place it on the map. Please click the location manually.`,
                    "error"
                );
                return;
            }

            map.setView([place.latitude, place.longitude], 14);

            await selectLocation(place.latitude, place.longitude);

            setPincodeStatus(
                `Located ${office.Name}, ${district}, ${state}.`,
                "success"
            );

        } catch (error) {

            console.error("PIN code search failed:", error);
            setPincodeStatus(
                "Couldn't look up that PIN code. Please try again or click the map.",
                "error"
            );

        } finally {

            if (pincodeSearchBtn) {
                pincodeSearchBtn.disabled = false;
                pincodeSearchBtn.textContent = "Locate";
            }
        }
    }

    if (pincodeSearchBtn) {
        pincodeSearchBtn.addEventListener("click", handlePincodeSearch);
    }

    if (pincodeInput) {
        pincodeInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                handlePincodeSearch();
            }
        });
    }


    // ==========================================
    // 3. COMPLAINT FORM SUBMISSION
    // ==========================================

    const complaintForm =
        document.getElementById("complaintForm");

    if (!complaintForm) {
        return;
    }

    complaintForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        // ==========================================
        // GET FORM VALUES
        // ==========================================

        const title =
            document.getElementById("title").value.trim();

        const category =
            document.getElementById("category").value;

        const description =
            document.getElementById("description").value.trim();

        const latitude =
            document.getElementById("latitude").value;

        const longitude =
            document.getElementById("longitude").value;

        const address =
            document.getElementById("address").value.trim();

        const imageInput =
            document.getElementById("image");

        const imageFile =
            imageInput ? imageInput.files[0] : null;


        // ==========================================
        // VALIDATION
        // ==========================================

        if (!title) {
            alert("Please enter an issue title.");
            return;
        }

        if (!category) {
            alert("Please select an issue category.");
            return;
        }

        if (!description) {
            alert("Please describe the civic issue.");
            return;
        }

        if (!latitude || !longitude) {
            alert("Please select the issue location on the map.");
            return;
        }


        // ==========================================
        // IMAGE VALIDATION
        // ==========================================

        if (imageFile) {

            // Maximum 5 MB
            const maxFileSize = 5 * 1024 * 1024;

            if (imageFile.size > maxFileSize) {
                alert("Image size must be less than 5 MB.");
                return;
            }

            if (!imageFile.type.startsWith("image/")) {
                alert("Please select a valid image file.");
                return;
            }
        }


        // ==========================================
        // CREATE FORMDATA
        // ==========================================

        const formData = new FormData();

        formData.append("title", title);
        formData.append("category", category);
        formData.append("description", description);

        formData.append(
            "latitude",
            latitude
        );

        formData.append(
            "longitude",
            longitude
        );

        formData.append(
            "address",
            address
        );

        // Add image only if selected
        if (imageFile) {
            formData.append(
                "image",
                imageFile
            );
        }


        // ==========================================
        // SUBMIT BUTTON
        // ==========================================

        const submitButton =
            complaintForm.querySelector(
                'button[type="submit"]'
            );

        if (submitButton) {

            submitButton.disabled = true;

            submitButton.textContent =
                imageFile
                    ? "Uploading & Submitting..."
                    : "Submitting...";
        }


        // ==========================================
        // SEND TO BACKEND
        // ==========================================

        try {

            const response = await fetch(
                `${API_BASE_URL}/api/complaints`,
                {
                    method: "POST",

                    // IMPORTANT:
                    // Do NOT set Content-Type manually.
                    // Browser automatically sets the
                    // multipart/form-data boundary.
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("citycare_token") || ""}`
                    },

                    body: formData
                }
            );


            // ==========================================
            // READ RESPONSE
            // ==========================================

            let data = {};

            try {
                data = await response.json();
            } catch (jsonError) {
                data = {};
            }


            // ==========================================
            // ERROR HANDLING
            // ==========================================

            if (!response.ok) {

                if (response.status === 401) {
                    localStorage.removeItem("citycare_token");
                    localStorage.removeItem("citycare_user");

                    alert("Please log in before submitting a complaint.");
                    window.location.href = "login.html";
                    return;
                }

                throw new Error(
                    data.message ||
                    "Failed to submit complaint."
                );
            }


            // ==========================================
            // SUCCESS
            // ==========================================

            alert(
                "Complaint submitted successfully!"
            );

            // Reset form
            complaintForm.reset();


            // Remove marker
            if (marker) {

                map.removeLayer(marker);

                marker = null;
            }


            // Reset location information
            locationText.textContent =
                "Click on the map to select the issue location.";

            latitudeInput.value = "";
            longitudeInput.value = "";
            addressInput.value = "";


            // Return map to India
            map.setView(
                [defaultLatitude, defaultLongitude],
                5
            );


        } catch (error) {

            console.error(
                "Complaint submission error:",
                error
            );

            alert(
                error.message ||
                "Something went wrong while submitting the complaint."
            );


        } finally {

            // Re-enable button
            if (submitButton) {

                submitButton.disabled = false;

                submitButton.textContent =
                    "Submit Complaint →";
            }
        }
    });
});