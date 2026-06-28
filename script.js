const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const toggle = document.querySelector("[data-nav-toggle]");
const statusText = document.querySelector("[data-map-status]");
const mapElement = document.querySelector("#fih-world-map");

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

const cities = [
  { name: "Doha", label: "Coming soon", status: "Coming soon", coords: [25.2854, 51.5310] },
  { name: "London", label: "Coming soon", status: "Coming soon", coords: [51.5072, -0.1276] },
  { name: "Hong Kong", label: "Coming soon", status: "Coming soon", coords: [22.3193, 114.1694] },
  { name: "Bangkok", label: "Coming soon", status: "Coming soon", coords: [13.7563, 100.5018] },
  { name: "Shanghai", label: "Coming soon", status: "Coming soon", coords: [31.2304, 121.4737] },
  { name: "Suzhou", label: "Coming soon", status: "Coming soon", coords: [31.2989, 120.5853] },
  {
    name: "Seattle",
    label: "Open regional site",
    status: "Active local region",
    coords: [47.6062, -122.3321],
    url: "seattle-local-region/index.html",
    active: true,
  },
];

const createMarkerIcon = (active) =>
  L.divIcon({
    className: `fih-marker${active ? " is-live" : ""}`,
    html: "<span></span>",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });

if (mapElement && window.L) {
  const map = L.map(mapElement, {
    center: [24, 20],
    zoom: 2,
    minZoom: 1,
    maxZoom: 6,
    scrollWheelZoom: false,
    worldCopyJump: true,
  });

  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
    attribution: "Tiles &copy; Esri",
    maxZoom: 16,
  }).addTo(map);

  const cityBounds = L.latLngBounds(cities.map((city) => city.coords));
  const fitCityBounds = () => {
    map.fitBounds(cityBounds, {
      paddingTopLeft: [44, 92],
      paddingBottomRight: [44, 44],
      maxZoom: mapElement.offsetWidth < 760 ? 2 : 3,
    });
  };

  cities.forEach((city) => {
    const marker = L.marker(city.coords, { icon: createMarkerIcon(city.active) }).addTo(map);
    const action = city.url ? `<a href="${city.url}">${city.label}</a>` : `<strong>${city.label}</strong>`;
    marker.bindPopup(`
      <div class="fih-popup">
        <span>${city.status}</span>
        <h3>${city.name}</h3>
        ${action}
      </div>
    `);

    marker.on("click", () => {
      statusText.textContent = `${city.name} hub: ${city.status}.`;
    });
  });

  window.setTimeout(() => {
    map.invalidateSize();
    fitCityBounds();
  }, 100);

  window.addEventListener("resize", () => {
    map.invalidateSize();
    fitCityBounds();
  });
}
