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
  {
    name: "Seattle",
    label: "Open Seattle command site",
    status: "Global HQ / Command Center",
    coords: [47.6062, -122.3321],
    url: "seattle-local-region/index.html",
    active: true,
    headquarters: true,
  },
  { name: "Bangkok", label: "November WFIF stage", status: "WFIF 2026 convening city", coords: [13.7563, 100.5018] },
  { name: "Taipei", label: "Coming soon", status: "Future Intelligence Hub city", coords: [25.0330, 121.5654] },
  { name: "Shanghai", label: "Coming soon", status: "Future Intelligence Hub city", coords: [31.2304, 121.4737] },
  { name: "Dubai", label: "Coming soon", status: "Future Intelligence Hub city", coords: [25.2048, 55.2708] },
];

const createMarkerIcon = (city) =>
  L.divIcon({
    className: `fih-marker${city.active ? " is-live" : ""}${city.headquarters ? " is-hq" : ""}`,
    html: city.headquarters ? "<span></span><strong>HQ</strong>" : "<span></span>",
    iconSize: city.headquarters ? [72, 50] : [34, 34],
    iconAnchor: city.headquarters ? [36, 25] : [17, 17],
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

  const seattle = cities.find((city) => city.headquarters);

  if (seattle) {
    cities
      .filter((city) => city.name !== seattle.name)
      .forEach((city) => {
        L.polyline([seattle.coords, city.coords], {
          color: "#ffb21a",
          weight: 1.4,
          opacity: 0.48,
          dashArray: "7 10",
          interactive: false,
        }).addTo(map);
      });
  }

  const cityBounds = L.latLngBounds(cities.map((city) => city.coords));
  const fitCityBounds = () => {
    map.fitBounds(cityBounds, {
      paddingTopLeft: [44, 92],
      paddingBottomRight: [44, 44],
      maxZoom: mapElement.offsetWidth < 760 ? 2 : 3,
    });
  };

  cities.forEach((city) => {
    const marker = L.marker(city.coords, { icon: createMarkerIcon(city) }).addTo(map);
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
