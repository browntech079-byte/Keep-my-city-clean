
document.addEventListener("DOMContentLoaded", () => {

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

    const latitudeInput = document.getElementById("latitude");
    const longitudeInput = document.getElementById("longitude");
    const addressInput = document.getElementById("address");
    const locationText = document.getElementById("locationText");

    map.on("click", async (event) => {

        const latitude = event.latlng.lat;
        const longitude = event.latlng.lng;

        // Remove previous marker
        if (marker) {
            map.removeLayer(marker);
        }

        // Add marker at selected location
        marker = L.marker([latitude, longitude]).addTo(map);

        // Save coordinates in hidden fields
        latitudeInput.value = latitude;
        longitudeInput.value = longitude;

        // Reset address while looking it up
        addressInput.value = "";

        locationText.textContent =
            `Location selected: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

        try {

            // Reverse geocoding using OpenStreetMap Nominatim
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
            );

            if (!response.ok) {
                throw new Error("Failed to get address");
            }

            const data = await response.json();

            const address = data.display_name || "";

            addressInput.value = address;

            locationText.textContent =
                address ||
                `Location selected: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

            // Use a DOM element for safe popup content
            const popupContent = document.createElement("div");

            const popupTitle = document.createElement("strong");
            popupTitle.textContent = "Selected Location";

            const popupAddress = document.createElement("div");
            popupAddress.textContent = address || "Location selected";

            popupContent.appendChild(popupTitle);
            popupContent.appendChild(popupAddress);

            marker.bindPopup(popupContent).openPopup();

        } catch (error) {

            console.error("Address lookup failed:", error);

            addressInput.value =
                `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

            locationText.textContent =
                `Location selected: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

            marker.bindPopup("Selected Location").openPopup();
        }
    });


    // ==========================================
    // 3. COMPLAINT FORM SUBMISSION
    // ==========================================

    const complaintForm = document.getElementById("complaintForm");

    if (complaintForm) {

        complaintForm.addEventListener("submit", async (event) => {

            event.preventDefault();

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
                document.getElementById("address").value;

            // Validate location
            if (!latitude || !longitude) {
                alert("Please select the issue location on the map.");
                return;
            }

            // Prepare complaint data
            const complaintData = {
                title,
                category,
                description,
                location: {
                    latitude: Number(latitude),
                    longitude: Number(longitude),
                    address
                }
            };

            const submitButton =
                complaintForm.querySelector('button[type="submit"]');

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = "Submitting...";
            }

            try {

                const response = await fetch(
                    "http://127.0.0.1:5000/api/complaints",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        // Send login session cookie
                        credentials: "include",

                        body: JSON.stringify(complaintData)
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message || "Failed to submit complaint"
                    );
                }

                alert("Complaint submitted successfully!");

                complaintForm.reset();

                // Remove map marker after successful submission
                if (marker) {
                    map.removeLayer(marker);
                    marker = null;
                }

                // Reset location display
                locationText.textContent =
                    "Click on the map to select the issue location.";

                // Clear hidden location values
                latitudeInput.value = "";
                longitudeInput.value = "";
                addressInput.value = "";

            } catch (error) {

                console.error("Complaint submission error:", error);

                alert(error.message);

            } finally {

                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = "Submit Complaint";
                }
            }

        });
    }

});