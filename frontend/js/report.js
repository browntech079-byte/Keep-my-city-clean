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

    // Bumped on every click so an in-flight reverse-geocode response from
    // an older click can be told apart from the most recent one — without
    // this, a slow response to an earlier click can arrive after a faster
    // response to a later click and overwrite the correct address/marker
    // with stale data.
    let locationRequestId = 0;

    const latitudeInput = document.getElementById("latitude");
    const longitudeInput = document.getElementById("longitude");
    const addressInput = document.getElementById("address");
    const locationText = document.getElementById("locationText");

    map.on("click", async (event) => {

        const latitude = event.latlng.lat;
        const longitude = event.latlng.lng;

        const requestId = ++locationRequestId;

        // Remove previous marker
        if (marker) {
            map.removeLayer(marker);
        }

        // Add new marker — kept as a local reference so the popup below
        // always binds to the marker THIS click created, even if a later
        // click has since reassigned the shared `marker` variable.
        const clickMarker = L.marker([latitude, longitude]).addTo(map);
        marker = clickMarker;

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

            // A newer click has happened since this request started —
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

            clickMarker
                .bindPopup(popupContent)
                .openPopup();

        } catch (error) {

            // Also discard a stale failure — a newer click already
            // replaced this one, so there's nothing left to update.
            if (requestId !== locationRequestId) {
                return;
            }

            console.error("Address lookup failed:", error);

            addressInput.value =
                `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

            locationText.textContent =
                `Location selected: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

            clickMarker
                .bindPopup("Selected Location")
                .openPopup();
        }
    });


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
                    credentials: "include",

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
                    throw new Error(
                        "Please log in before submitting a complaint."
                    );
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