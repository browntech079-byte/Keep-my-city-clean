// ==========================================
// CityCare — Dark / Light Mode Toggle
// Shared across all citizen-facing pages
// ==========================================

(function () {

    const STORAGE_KEY = "citycare_theme";

    function getSavedTheme() {
        return localStorage.getItem(STORAGE_KEY) === "dark"
            ? "dark"
            : "light";
    }

    function applyTheme(theme) {
        if (theme === "dark") {
            document.documentElement.setAttribute("data-theme", "dark");
        } else {
            document.documentElement.removeAttribute("data-theme");
        }
    }

    // Apply immediately, before the rest of the page renders,
    // so there's no light-mode flash on a dark-mode reload.
    applyTheme(getSavedTheme());

    function updateToggleLabels(theme) {
        document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
            const icon = btn.querySelector(".theme-toggle-icon");
            const current = btn.querySelector(".theme-toggle-current");

            if (icon) {
                icon.textContent = theme === "dark" ? "☀" : "☾";
            }
            if (current) {
                current.textContent = theme === "dark" ? "Dark" : "Light";
            }
        });
    }

    document.addEventListener("DOMContentLoaded", () => {

        updateToggleLabels(getSavedTheme());

        document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const next = getSavedTheme() === "dark" ? "light" : "dark";
                localStorage.setItem(STORAGE_KEY, next);
                applyTheme(next);
                updateToggleLabels(next);
            });
        });

    });

})();