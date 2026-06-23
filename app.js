// ============================================
// Mock data: demo deals only, no real venues onboarded yet.
// Lat/lng offsets are generated relative to the user's location at runtime
// so the demo always looks "nearby" no matter where it's opened.
// ============================================

const WALK_SPEED_KMH = 4.8; // average walking speed
const MAX_WALK_MINUTES = 15;

const DEAL_TEMPLATES = [
  { venue: "Corner Slice", category: "lunch", tag: "Lunch special", deal: "Slice + soda, $6 until 3pm", offsetKm: 0.4, bearing: 30 },
  { venue: "The Tin Cup", category: "happy-hour", tag: "Happy hour", deal: "$5 drafts, 4-6pm daily", offsetKm: 0.9, bearing: 110 },
  { venue: "Riverside Green", category: "free-event", tag: "Free event", deal: "Outdoor yoga, 6pm, free", offsetKm: 1.1, bearing: 200 },
  { venue: "Banh Mi House", category: "food-deal", tag: "Food deal", deal: "Buy one banh mi, get one half off", offsetKm: 0.6, bearing: 260 },
  { venue: "The Lower Deck", category: "live-music", tag: "Live music", deal: "Acoustic duo, 7-9pm, no cover", offsetKm: 1.3, bearing: 320 },
  { venue: "Maple & Co.", category: "promo", tag: "Local promo", deal: "20% off first visit this week", offsetKm: 0.3, bearing: 80 },
  { venue: "Noodle Bar 8", category: "lunch", tag: "Lunch special", deal: "Combo bowl, $9, 11am-2pm", offsetKm: 0.7, bearing: 150 },
  { venue: "Greenpoint Taproom", category: "happy-hour", tag: "Happy hour", deal: "Half-price appetizers, 3-5pm", offsetKm: 1.0, bearing: 40 },
  { venue: "Public Library Plaza", category: "free-event", tag: "Free event", deal: "Pop-up book swap, 12-4pm", offsetKm: 0.5, bearing: 290 },
  { venue: "Pat's Tacos", category: "food-deal", tag: "Food deal", deal: "Taco Tuesday, $1.50 each", offsetKm: 0.8, bearing: 10 },
  { venue: "The Quiet Room", category: "live-music", tag: "Live music", deal: "Open mic night, 8pm, free entry", offsetKm: 1.4, bearing: 230 },
  { venue: "Sunny Side Cafe", category: "promo", tag: "Local promo", deal: "Free pastry with any coffee", offsetKm: 0.2, bearing: 170 },
];

let userLocation = null;
let activeFilter = "all";

const statusPill = document.getElementById("statusPill");
const locateMsg = document.getElementById("locateMsg");
const locateBtn = document.getElementById("locateBtn");
const manualBtn = document.getElementById("manualBtn");
const manualInput = document.getElementById("manualInput");
const manualAddress = document.getElementById("manualAddress");
const manualSubmit = document.getElementById("manualSubmit");
const filtersSection = document.getElementById("filtersSection");
const resultsSection = document.getElementById("resultsSection");
const resultsCount = document.getElementById("resultsCount");
const cardList = document.getElementById("cardList");
const emptyState = document.getElementById("emptyState");

locateBtn.addEventListener("click", useMyLocation);
manualBtn.addEventListener("click", () => {
  manualInput.hidden = false;
  manualAddress.focus();
});
manualSubmit.addEventListener("click", useManualLocation);
manualAddress.addEventListener("keydown", (e) => {
  if (e.key === "Enter") useManualLocation();
});

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach((c) => c.classList.remove("is-active"));
    chip.classList.add("is-active");
    activeFilter = chip.dataset.filter;
    renderResults();
  });
});

function useMyLocation() {
  if (!navigator.geolocation) {
    locateMsg.textContent = "Geolocation isn't available in this browser. Try entering a location instead.";
    return;
  }
  statusPill.textContent = "locating…";
  locateMsg.textContent = "Requesting location permission…";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      onLocationReady();
    },
    (err) => {
      statusPill.textContent = "location unavailable";
      locateMsg.textContent = "Couldn't get your location (" + err.message + "). Try entering one instead.";
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function useManualLocation() {
  const value = manualAddress.value.trim();
  if (!value) return;
  // Demo mode: no geocoding API wired up, so we center on a fixed reference point
  // and just label the status with what was typed.
  userLocation = { lat: 40.7128, lng: -74.006 };
  statusPill.textContent = value;
  onLocationReady();
}

function onLocationReady() {
  statusPill.classList.add("is-live");
  if (statusPill.textContent === "locating…") statusPill.textContent = "live location";
  locateMsg.textContent = "";
  filtersSection.hidden = false;
  resultsSection.hidden = false;
  renderResults();
}

function kmFromOffset(offsetKm, bearingDeg) {
  // Convert a distance + bearing from the user's point into a lat/lng delta.
  const bearing = (bearingDeg * Math.PI) / 180;
  const dLat = (offsetKm / 111) * Math.cos(bearing);
  const dLng = (offsetKm / (111 * Math.cos((userLocation.lat * Math.PI) / 180))) * Math.sin(bearing);
  return { lat: userLocation.lat + dLat, lng: userLocation.lng + dLng };
}

function walkMinutes(km) {
  return (km / WALK_SPEED_KMH) * 60;
}

function buildDeals() {
  return DEAL_TEMPLATES.map((t) => {
    const coords = kmFromOffset(t.offsetKm, t.bearing);
    const minutes = walkMinutes(t.offsetKm);
    return { ...t, coords, walkMin: Math.round(minutes) };
  })
    .filter((d) => d.walkMin <= MAX_WALK_MINUTES)
    .sort((a, b) => a.walkMin - b.walkMin);
}

function renderResults() {
  const deals = buildDeals().filter((d) => activeFilter === "all" || d.category === activeFilter);

  if (deals.length === 0) {
    cardList.innerHTML = "";
    resultsCount.textContent = "";
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;
  resultsCount.textContent = deals.length + " spot" + (deals.length === 1 ? "" : "s") + " within 15 minutes on foot";

  cardList.innerHTML = deals
    .map(
      (d) => `
    <div class="card">
      <div class="card__top">
        <span class="card__tag">${d.tag}</span>
        <span class="card__walk mono">${d.walkMin} min walk</span>
      </div>
      <p class="card__venue">${d.venue}</p>
      <p class="card__deal">${d.deal}</p>
    </div>
  `
    )
    .join("");
}
