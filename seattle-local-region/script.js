const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const toggle = document.querySelector("[data-nav-toggle]");
const focusField = document.querySelector("[data-focus-field]");

const updateHeader = () => {
  header.classList.toggle("is-scrolled", window.scrollY > 16);
};

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

toggle.addEventListener("click", () => {
  const isOpen = toggle.getAttribute("aria-expanded") === "true";
  toggle.setAttribute("aria-expanded", String(!isOpen));
  nav.classList.toggle("is-open", !isOpen);
  header.classList.toggle("is-open", !isOpen);
});

nav.addEventListener("click", (event) => {
  if (event.target.matches("a")) {
    toggle.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-open");
    header.classList.remove("is-open");
  }
});

document.querySelectorAll("[data-focus]").forEach((link) => {
  link.addEventListener("click", () => {
    if (!focusField) return;

    const requestedFocus = link.getAttribute("data-focus");
    const matchingOption = [...focusField.options].find((option) => option.value === requestedFocus);
    if (matchingOption) {
      focusField.value = requestedFocus;
    }
  });
});
