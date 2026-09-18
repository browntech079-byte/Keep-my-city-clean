
document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // 1. REGISTER USER
    // ==========================================

    const registerForm = document.getElementById("registerForm");

    if (registerForm) {
        registerForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const fullName = document.getElementById("fullName").value.trim();
            const email = document.getElementById("email").value.trim();
            const mobile = document.getElementById("mobile").value.trim();
            const password = document.getElementById("password").value;
            const city = document.getElementById("city").value.trim();
            const state = document.getElementById("state").value.trim();
            const message = document.getElementById("registerMessage");

            message.textContent = "Creating your account...";

            try {
                const response = await fetch(
                    "http://127.0.0.1:5000/api/auth/register",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            fullName,
                            email,
                            mobile,
                            password,
                            city,
                            state
                        })
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message || "Registration failed"
                    );
                }

                message.textContent =
                    "Account created successfully! Redirecting to login...";

                registerForm.reset();

                // Reset the city dropdown after registration
                if (citySelect) {
                    citySelect.innerHTML =
                        '<option value="">Select state first</option>';
                    citySelect.disabled = true;
                }

                setTimeout(() => {
                    window.location.href = "login.html";
                }, 1500);

            } catch (error) {
                console.error("Registration error:", error);
                message.textContent = error.message;
            }
        });
    }


    // ==========================================
    // 2. LOGIN USER
    // ==========================================

    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;
            const message = document.getElementById("loginMessage");

            message.textContent = "Signing you in...";

            try {
                const response = await fetch(
                    "http://127.0.0.1:5000/api/auth/login",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        credentials: "include",
                        body: JSON.stringify({
                            email,
                            password
                        })
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message || "Login failed"
                    );
                }

                message.textContent =
                    "Login successful! Redirecting...";

                setTimeout(() => {
                    window.location.href = "report.html";
                }, 1000);

            } catch (error) {
                console.error("Login error:", error);
                message.textContent = error.message;
            }
        });
    }


    // ==========================================
    // 3. STATE AND CITY DROPDOWN
    // ==========================================

    const stateSelect = document.getElementById("state");
    const citySelect = document.getElementById("city");

    const citiesByState = {

        "Andhra Pradesh": [
            "Anantapur", "Bapatla", "Chittoor", "Eluru",
            "Guntur", "Kakinada", "Kadapa", "Kurnool",
            "Nandyal", "Nellore", "Ongole", "Rajahmundry",
            "Srikakulam", "Tirupati", "Vijayawada",
            "Visakhapatnam", "Vizianagaram"
        ],

        "Arunachal Pradesh": [
            "Itanagar", "Naharlagun", "Pasighat", "Tawang", "Ziro"
        ],

        "Assam": [
            "Guwahati", "Dibrugarh", "Jorhat",
            "Silchar", "Tezpur", "Tinsukia"
        ],

        "Bihar": [
            "Patna", "Gaya", "Bhagalpur", "Muzaffarpur",
            "Purnia", "Darbhanga", "Ara", "Begusarai",
            "Katihar", "Munger", "Chhapra", "Bihar Sharif"
        ],

        "Chhattisgarh": [
            "Raipur", "Bhilai", "Bilaspur",
            "Korba", "Durg", "Rajnandgaon"
        ],

        "Goa": [
            "Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda"
        ],

        "Gujarat": [
            "Ahmedabad", "Surat", "Vadodara", "Rajkot",
            "Bhavnagar", "Jamnagar", "Gandhinagar", "Anand"
        ],

        "Haryana": [
            "Gurugram", "Faridabad", "Panipat",
            "Ambala", "Hisar", "Karnal", "Rohtak"
        ],

        "Himachal Pradesh": [
            "Shimla", "Dharamshala", "Solan",
            "Mandi", "Kullu", "Manali"
        ],

        "Jharkhand": [
            "Ranchi", "Jamshedpur", "Dhanbad",
            "Bokaro", "Deoghar", "Hazaribagh"
        ],

        "Karnataka": [
            "Bengaluru", "Mysuru", "Mangaluru", "Hubballi",
            "Belagavi", "Davanagere", "Shivamogga", "Tumakuru"
        ],

        "Kerala": [
            "Thiruvananthapuram", "Kochi", "Kozhikode",
            "Kollam", "Thrissur", "Kannur", "Alappuzha"
        ],

        "Madhya Pradesh": [
            "Bhopal", "Indore", "Jabalpur",
            "Gwalior", "Ujjain", "Sagar", "Rewa"
        ],

        "Maharashtra": [
            "Mumbai", "Pune", "Nagpur", "Nashik",
            "Aurangabad", "Thane", "Kolhapur", "Solapur"
        ],

        "Manipur": [
            "Imphal", "Thoubal", "Bishnupur", "Churachandpur"
        ],

        "Meghalaya": [
            "Shillong", "Tura", "Jowai", "Nongpoh"
        ],

        "Mizoram": [
            "Aizawl", "Lunglei", "Champhai", "Kolasib"
        ],

        "Nagaland": [
            "Kohima", "Dimapur", "Mokokchung", "Tuensang"
        ],

        "Odisha": [
            "Bhubaneswar", "Cuttack", "Rourkela",
            "Berhampur", "Sambalpur", "Puri", "Balasore"
        ],

        "Punjab": [
            "Amritsar", "Ludhiana", "Jalandhar",
            "Patiala", "Bathinda", "Mohali"
        ],

        "Rajasthan": [
            "Jaipur", "Jodhpur", "Udaipur", "Kota",
            "Ajmer", "Bikaner", "Alwar"
        ],

        "Sikkim": [
            "Gangtok", "Namchi", "Gyalshing", "Mangan"
        ],

        "Tamil Nadu": [
            "Chennai", "Coimbatore", "Madurai",
            "Tiruchirappalli", "Salem", "Tirunelveli",
            "Erode", "Vellore"
        ],

        "Telangana": [
            "Hyderabad", "Warangal", "Nizamabad",
            "Karimnagar", "Khammam", "Nalgonda"
        ],

        "Tripura": [
            "Agartala", "Dharmanagar", "Udaipur", "Kailashahar"
        ],

        "Uttar Pradesh": [
            "Lucknow", "Kanpur", "Agra", "Varanasi",
            "Prayagraj", "Meerut", "Noida", "Ghaziabad",
            "Bareilly", "Gorakhpur"
        ],

        "Uttarakhand": [
            "Dehradun", "Haridwar", "Rishikesh",
            "Haldwani", "Nainital", "Roorkee"
        ],

        "West Bengal": [
            "Kolkata", "Howrah", "Durgapur",
            "Asansol", "Siliguri", "Darjeeling"
        ],

        "Delhi": [
            "New Delhi", "Delhi"
        ],

        "Jammu and Kashmir": [
            "Srinagar", "Jammu", "Anantnag",
            "Baramulla", "Kathua"
        ],

        "Ladakh": [
            "Leh", "Kargil"
        ]
    };


    // Populate cities when a state is selected
    if (stateSelect && citySelect) {

        stateSelect.addEventListener("change", () => {

            const selectedState = stateSelect.value;

            citySelect.innerHTML = "";

            if (!selectedState) {
                citySelect.disabled = true;

                const option = document.createElement("option");
                option.value = "";
                option.textContent = "Select state first";

                citySelect.appendChild(option);
                return;
            }

            const cities = citiesByState[selectedState] || [];

            const defaultOption = document.createElement("option");
            defaultOption.value = "";
            defaultOption.textContent = "Select your city";

            citySelect.appendChild(defaultOption);

            cities.forEach((city) => {
                const option = document.createElement("option");

                option.value = city;
                option.textContent = city;

                citySelect.appendChild(option);
            });

            citySelect.disabled = cities.length === 0;
        });
    }

});