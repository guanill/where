import {
  COUNTRIES,
  TOTAL_COUNTRIES,
  getCountryByCode,
  getFlagUrl,
  searchCountries,
} from "./countries.js";
import { initMap } from "./map.js";
import {
  openPassport,
  closePassport,
  downloadPassport,
  copyStats,
} from "./Passport.js";
import {
  getFlights,
  addFlight,
  updateFlight,
  removeFlight,
  getFlightStats,
  lookupFlight,
  exportFlightsJSON,
  exportFlightsCSV,
  importFlightsJSON,
  importFlightsCSV,
  fetchFlightRoute,
} from "./flights.js";
import { searchAirports, registerAirport, getAirport } from "./airports.js";
import { getLandmarksForCountry, getLandmarkIconUrl } from "./landmarks.js";
import { getCachedImageUrl, fetchLandmarkImage } from "./landmark-images.js";
import { addPhotosFromFiles, getPhotos, clearPhotos, onThumbsRestored, hasPhotoNamed, addPhotoFromFile, addVideoFromFile } from "./photos.js";
import {
  signIn as gpSignIn,
  fetchGeotaggedPhotos,
  getStoredClientId,
  setClientId as gpSetClientId,
} from "./google-photos.js";
import {
  fetchFlightInfo,
  fetchFlightTrack,
  getApiConfig,
  setApiConfig,
  isApiConfigured,
  testApiConnection,
  getProviders,
} from "./flight-api.js";
import { getAirlineFromFlightNumber } from "./airlines.js";

// ─── State ────────────────────────────────────────────────────────────
const STORAGE_KEY = "been_visited";
const LANDMARKS_STORAGE_KEY = "been_visited_landmarks";

function loadVisited() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveVisited(codes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
}

function loadVisitedLandmarks() {
  try {
    const raw = localStorage.getItem(LANDMARKS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveVisitedLandmarks(keys) {
  localStorage.setItem(LANDMARKS_STORAGE_KEY, JSON.stringify(keys));
}

let visitedCodes = loadVisited();
let visitedLandmarkKeys = loadVisitedLandmarks();

// ─── DOM refs ─────────────────────────────────────────────────────────
const statCount = document.getElementById("stat-count");
const statPercent = document.getElementById("stat-percent");
const statContinents = document.getElementById("stat-continents");
const statFlights = document.getElementById("stat-flights");
const statDistance = document.getElementById("stat-distance");
const visitedGrid = document.getElementById("visited-grid");
const visitedBadge = document.getElementById("visited-badge");
const emptyState = document.getElementById("empty-state");
const searchInput = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");

// Flights DOM
const flightFrom = document.getElementById("flight-from");
const flightTo = document.getElementById("flight-to");
const flightFromIata = document.getElementById("flight-from-iata");
const flightToIata = document.getElementById("flight-to-iata");
const flightFromResults = document.getElementById("flight-from-results");
const flightToResults = document.getElementById("flight-to-results");
const flightDate = document.getElementById("flight-date");
const flightTime = document.getElementById("flight-time");
const flightArrivalTime = document.getElementById("flight-arrival-time");
const flightNumber = document.getElementById("flight-number");
const flightBooking = document.getElementById("flight-booking");
const btnAddFlight = document.getElementById("btn-add-flight");
const flightsList = document.getElementById("flights-list");
const flightsBadge = document.getElementById("flights-badge");
const flightsEmpty = document.getElementById("flights-empty");
const fsTotal = document.getElementById("fs-total");
const fsDistance = document.getElementById("fs-distance");
const fsRoutes = document.getElementById("fs-routes");
const fsAirports = document.getElementById("fs-airports");
const fsEarth = document.getElementById("fs-earth");

// Flights toolbar DOM
const flightsYearFilter = document.getElementById("flights-year-filter");
const mapYearFilter = document.getElementById("map-year-filter");
const flightsSearch = document.getElementById("flights-search");

// Edit flight modal DOM
const editFlightModal = document.getElementById("edit-flight-modal");
const editFlightClose = document.getElementById("edit-flight-close");
const editFlightId = document.getElementById("edit-flight-id");
const editFlightFrom = document.getElementById("edit-flight-from");
const editFlightFromIata = document.getElementById("edit-flight-from-iata");
const editFlightFromResults = document.getElementById("edit-flight-from-results");
const editFlightTo = document.getElementById("edit-flight-to");
const editFlightToIata = document.getElementById("edit-flight-to-iata");
const editFlightToResults = document.getElementById("edit-flight-to-results");
const editFlightDate = document.getElementById("edit-flight-date");
const editFlightTime = document.getElementById("edit-flight-time");
const editFlightArrival = document.getElementById("edit-flight-arrival");
const editFlightNumber = document.getElementById("edit-flight-number");
const editFlightBooking = document.getElementById("edit-flight-booking");
const editFlightSave = document.getElementById("edit-flight-save");
const editFlightCancel = document.getElementById("edit-flight-cancel");

// Advanced stats DOM
const advancedStatsPanel = document.getElementById("flights-advanced-stats");
const advTopAirportsBody = document.getElementById("adv-top-airports-body");
const advAirlinesBody = document.getElementById("adv-airlines-body");
const advMonthlyBody = document.getElementById("adv-monthly-body");
const advLongestBody = document.getElementById("adv-longest-body");

// ─── Calendar Date Picker ─────────────────────────────────────────────
const calPopup = document.getElementById("cal-popup");
const calDays = document.getElementById("cal-days");
const calMonthYear = document.getElementById("cal-month-year");
const calTrigger = document.getElementById("date-picker-trigger");
const calLabel = document.getElementById("date-picker-label");

let calViewDate = new Date(); // month currently shown
let calSelectedDate = null;   // chosen date or null

const MONTH_NAMES = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];
const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function renderCalendar() {
  const year = calViewDate.getFullYear();
  const month = calViewDate.getMonth();
  calMonthYear.textContent = `${MONTH_NAMES[month]} ${year}`;

  // First day of month (0=Sun), shift to Mon=0
  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = (firstDay + 6) % 7; // Mon-based
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  const selStr = calSelectedDate || "";

  let html = "";

  // Prev month trailing days
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = daysInPrev - i;
    const m = month === 0 ? 12 : month;
    const y = month === 0 ? year - 1 : year;
    const ds = `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    html += `<button class="cal-day other-month" data-date="${ds}" type="button">${d}</button>`;
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const cls = [
      "cal-day",
      ds === todayStr ? "today" : "",
      ds === selStr ? "selected" : "",
    ].filter(Boolean).join(" ");
    html += `<button class="${cls}" data-date="${ds}" type="button">${d}</button>`;
  }

  // Next month leading days (fill to 42 cells = 6 rows)
  const totalCells = startOffset + daysInMonth;
  const remaining = totalCells <= 35 ? 35 - totalCells : 42 - totalCells;
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 1 : month + 2;
    const y = month === 11 ? year + 1 : year;
    const ds = `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    html += `<button class="cal-day other-month" data-date="${ds}" type="button">${d}</button>`;
  }

  calDays.innerHTML = html;
}

function setCalDate(dateStr) {
  calSelectedDate = dateStr || "";
  flightDate.value = dateStr || "";
  if (dateStr) {
    const [y, m, d] = dateStr.split("-");
    calLabel.textContent = `${SHORT_MONTHS[parseInt(m,10)-1]} ${parseInt(d,10)}, ${y}`;
    calLabel.className = "date-has-value";
  } else {
    calLabel.textContent = "Pick a date";
    calLabel.className = "date-placeholder";
  }
}

function openCalendar() {
  if (calSelectedDate) {
    const [y, m] = calSelectedDate.split("-");
    calViewDate = new Date(parseInt(y), parseInt(m,10) - 1, 1);
  } else {
    calViewDate = new Date();
  }
  renderCalendar();
  calPopup.classList.add("active");
}

function closeCalendar() {
  calPopup.classList.remove("active");
}

calTrigger.addEventListener("click", (e) => {
  e.stopPropagation();
  if (calPopup.classList.contains("active")) {
    closeCalendar();
  } else {
    openCalendar();
  }
});

document.getElementById("cal-prev").addEventListener("click", (e) => {
  e.stopPropagation();
  calViewDate.setMonth(calViewDate.getMonth() - 1);
  renderCalendar();
});

document.getElementById("cal-next").addEventListener("click", (e) => {
  e.stopPropagation();
  calViewDate.setMonth(calViewDate.getMonth() + 1);
  renderCalendar();
});

calDays.addEventListener("click", (e) => {
  const btn = e.target.closest(".cal-day");
  if (!btn) return;
  e.stopPropagation();
  const date = btn.dataset.date;
  setCalDate(date);
  // If clicked an other-month day, navigate to that month
  if (btn.classList.contains("other-month")) {
    const [y, m] = date.split("-");
    calViewDate = new Date(parseInt(y), parseInt(m,10) - 1, 1);
  }
  renderCalendar();
  closeCalendar();
});

document.getElementById("cal-today").addEventListener("click", (e) => {
  e.stopPropagation();
  const now = new Date();
  const ds = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  setCalDate(ds);
  calViewDate = new Date(now.getFullYear(), now.getMonth(), 1);
  renderCalendar();
  closeCalendar();
});

document.getElementById("cal-clear").addEventListener("click", (e) => {
  e.stopPropagation();
  setCalDate("");
  renderCalendar();
  closeCalendar();
});

// Close calendar when clicking outside
document.addEventListener("click", (e) => {
  if (!calPopup.contains(e.target) && e.target !== calTrigger && !calTrigger.contains(e.target)) {
    closeCalendar();
  }
});

// Popup DOM refs
const popupEl = document.getElementById("country-popup");
const popupFlag = document.getElementById("popup-flag");
const popupName = document.getElementById("popup-name");
const popupContinent = document.getElementById("popup-continent");
const popupToggle = document.getElementById("popup-toggle");
const popupLandmarks = document.getElementById("popup-landmarks");
const popupCloseBtn = document.getElementById("popup-close");
let popupCountry = null;

// ─── Map ──────────────────────────────────────────────────────────────
const mapApi = initMap({
  container: document.getElementById("map-container"),
  svgEl: document.getElementById("world-map"),
  tooltip: document.getElementById("tooltip"),
  onCountryClick: showCountryPopup,
});

// ─── Map layer toggles ───────────────────────────────────────────────
const toggleLandmarksBtn = document.getElementById("toggle-landmarks");
const toggleFlightsBtn = document.getElementById("toggle-flights");
const togglePhotosBtn = document.getElementById("toggle-photos");

toggleLandmarksBtn.addEventListener("click", () => {
  toggleLandmarksBtn.classList.toggle("active");
  mapApi.setLandmarksVisible(toggleLandmarksBtn.classList.contains("active"));
});

toggleFlightsBtn.addEventListener("click", () => {
  toggleFlightsBtn.classList.toggle("active");
  mapApi.setFlightsVisible(toggleFlightsBtn.classList.contains("active"));
});

togglePhotosBtn.addEventListener("click", () => {
  togglePhotosBtn.classList.toggle("active");
  mapApi.setPhotosVisible(togglePhotosBtn.classList.contains("active"));
});

// ─── Photo upload & drag-and-drop ────────────────────────────────
const mapContainer = document.getElementById("map-container");
const dropZone = document.getElementById("photo-drop-zone");
const uploadBtn = document.getElementById("btn-upload-photos");
const fileInput = document.getElementById("photo-file-input");
let dragCounter = 0;

// Wire delete callback from story viewer → update badge
mapApi.onPhotoDeleted(() => updatePhotoBadge());

// ── Duplicate-name dialog ────────────────────────────────────────
const dupeDialog    = document.getElementById("photo-dupe-dialog");
const dupeMsg       = document.getElementById("photo-dupe-msg");
const dupeInput     = document.getElementById("photo-dupe-input");
const dupeAllCheck  = document.getElementById("photo-dupe-all");
const dupeRenameBtn = document.getElementById("photo-dupe-rename");
const dupeSkipBtn   = document.getElementById("photo-dupe-skip");
const dupeAddBtn    = document.getElementById("photo-dupe-add-anyway");
const dupeBackdrop  = document.getElementById("photo-dupe-backdrop");

/**
 * Show duplicate dialog; returns a Promise that resolves to:
 *   { action: "rename"|"skip"|"add", newName?: string, applyAll: boolean }
 */
function askDuplicate(name) {
  return new Promise((resolve) => {
    dupeMsg.textContent = `A photo named "${name}" already exists.`;
    dupeInput.value = name + " (2)";
    dupeAllCheck.checked = false;
    dupeDialog.classList.remove("hidden");
    dupeInput.focus();
    dupeInput.select();

    function cleanup() {
      dupeDialog.classList.add("hidden");
      dupeRenameBtn.removeEventListener("click", onRename);
      dupeSkipBtn.removeEventListener("click", onSkip);
      dupeAddBtn.removeEventListener("click", onAdd);
      dupeBackdrop.removeEventListener("click", onSkip);
    }
    function onRename() { cleanup(); resolve({ action: "rename", newName: dupeInput.value.trim() || name, applyAll: dupeAllCheck.checked }); }
    function onSkip()   { cleanup(); resolve({ action: "skip", applyAll: dupeAllCheck.checked }); }
    function onAdd()    { cleanup(); resolve({ action: "add", applyAll: dupeAllCheck.checked }); }

    dupeRenameBtn.addEventListener("click", onRename);
    dupeSkipBtn.addEventListener("click", onSkip);
    dupeAddBtn.addEventListener("click", onAdd);
    dupeBackdrop.addEventListener("click", onSkip);
  });
}

/** Generate a unique name by appending (2), (3), … */
function makeUniqueName(base) {
  let n = 2;
  let candidate = `${base} (${n})`;
  while (hasPhotoNamed(candidate)) { n++; candidate = `${base} (${n})`; }
  return candidate;
}

/**
 * Add photos from files with duplicate-name detection.
 * Shows a dialog per duplicate unless user chooses "apply to all".
 */
async function addPhotosWithDupeCheck(files) {
  const mediaFiles = [...files].filter(f => f.type.startsWith("image/") || f.type.startsWith("video/"));
  if (!mediaFiles.length) return [];
  const results = [];
  let batchAction = null; // null | "skip" | "add" | "rename"

  for (const file of mediaFiles) {
    const isVideo = file.type.startsWith("video/");
    const baseName = file.name.replace(/\.[^.]+$/, "");
    const isDupe = hasPhotoNamed(baseName);

    if (isDupe) {
      let action, newName;
      if (batchAction === "skip") {
        continue;
      } else if (batchAction === "add") {
        action = "add";
      } else if (batchAction === "rename") {
        action = "rename";
        newName = makeUniqueName(baseName);
      } else {
        const res = await askDuplicate(baseName);
        action = res.action;
        newName = res.newName;
        if (res.applyAll) batchAction = action;
        if (action === "skip") continue;
        if (action === "rename" && batchAction === "rename") {
          newName = makeUniqueName(baseName);
        }
      }

      if (action === "rename") {
        const ext = file.name.match(/\.[^.]+$/)?.[0] || "";
        const renamedFile = new File([file], (newName || makeUniqueName(baseName)) + ext, { type: file.type, lastModified: file.lastModified });
        const photo = isVideo ? await addVideoFromFile(renamedFile) : await addPhotoFromFile(renamedFile);
        if (photo) results.push(photo);
      } else {
        const photo = isVideo ? await addVideoFromFile(file) : await addPhotoFromFile(file);
        if (photo) results.push(photo);
      }
    } else {
      const photo = isVideo ? await addVideoFromFile(file) : await addPhotoFromFile(file);
      if (photo) results.push(photo);
    }
  }
  return results;
}

// Drag-and-drop handlers
mapContainer.addEventListener("dragenter", (e) => {
  e.preventDefault();
  dragCounter++;
  dropZone.classList.remove("hidden");
});
mapContainer.addEventListener("dragover", (e) => e.preventDefault());
mapContainer.addEventListener("dragleave", (e) => {
  e.preventDefault();
  dragCounter--;
  if (dragCounter <= 0) {
    dragCounter = 0;
    dropZone.classList.add("hidden");
  }
});
mapContainer.addEventListener("drop", async (e) => {
  e.preventDefault();
  dragCounter = 0;
  dropZone.classList.add("hidden");
  const files = [...e.dataTransfer.files];
  if (!files.length) return;
  const added = await addPhotosWithDupeCheck(files);
  mapApi.updatePhotos();
  if (added.length) {
    updatePhotoBadge();
  } else {
    alert("No GPS data found in the dropped files.");
  }
});

// Re-render photos on map once thumbnails are restored from IndexedDB
onThumbsRestored(() => mapApi.updatePhotos());

uploadBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async () => {
  const files = [...fileInput.files];
  if (!files.length) return;
  const added = await addPhotosWithDupeCheck(files);
  mapApi.updatePhotos();
  if (added.length) {
    updatePhotoBadge();
  } else {
    alert("No GPS data found in the selected files.");
  }
  fileInput.value = "";
});

function updatePhotoBadge() {
  const count = getPhotos().length;
  togglePhotosBtn.textContent = `📷 Photos${count ? ` (${count})` : ""}`;
}

// ─── Clear all photos (double confirmation) ──────────────────────────
{
  const clearBtn      = document.getElementById("btn-clear-all-photos");
  const clearDialog   = document.getElementById("clear-photos-dialog");
  const clearBackdrop = document.getElementById("clear-photos-backdrop");
  const clearTitle    = document.getElementById("clear-photos-title");
  const clearMsg      = document.getElementById("clear-photos-msg");
  const clearCancel   = document.getElementById("clear-photos-cancel");
  const clearConfirm  = document.getElementById("clear-photos-confirm");

  let confirmStep = 0;            // 0 = hidden, 1 = first ask, 2 = second ask

  function openClearDialog() {
    const count = getPhotos().length;
    if (!count) return;            // nothing to delete

    confirmStep = 1;
    clearTitle.textContent = "Delete All Photos?";
    clearMsg.textContent =
      `This will permanently remove all ${count} photo${count > 1 ? "s" : ""} from the map. This cannot be undone.`;
    clearConfirm.textContent = "Yes, delete all";
    clearConfirm.disabled = false;
    clearDialog.classList.remove("hidden");
  }

  function closeClearDialog() {
    confirmStep = 0;
    clearDialog.classList.add("hidden");
  }

  clearBtn.addEventListener("click", openClearDialog);
  clearCancel.addEventListener("click", closeClearDialog);
  clearBackdrop.addEventListener("click", closeClearDialog);

  clearConfirm.addEventListener("click", () => {
    if (confirmStep === 1) {
      // Advance to second confirmation
      confirmStep = 2;
      clearTitle.textContent = "Are you absolutely sure?";
      clearMsg.textContent =
        "All photos and their thumbnails will be permanently deleted. There is no undo.";
      clearConfirm.textContent = "Delete everything";
      clearConfirm.disabled = true;
      // Force a short delay so the user can't double-click through
      setTimeout(() => { clearConfirm.disabled = false; }, 1200);
    } else if (confirmStep === 2) {
      // Actually clear
      clearPhotos();
      mapApi.updatePhotos();
      updatePhotoBadge();
      closeClearDialog();
    }
  });
}

// ─── Country popup ────────────────────────────────────────────────────
function showCountryPopup(country, _event) {
  popupCountry = country;
  const isVisited = visitedCodes.includes(country.code);

  popupFlag.src = getFlagUrl(country.code, 96);
  popupName.textContent = country.name;
  popupContinent.textContent = country.continent + (country.territory ? " · Territory" : "");

  // Toggle button
  popupToggle.textContent = isVisited ? "Remove from visited" : "Add to visited";
  popupToggle.className = "btn country-popup-btn " + (isVisited ? "remove" : "add");

  // Landmarks list with checkmarks
  const lms = getLandmarksForCountry(country.code);
  if (lms.length) {
    popupLandmarks.innerHTML =
      `<h4>Landmarks</h4><ul class="popup-lm-list">` +
      lms
        .map(
          (l) => {
            const key = l.code + ":" + l.name;
            const checked = visitedLandmarkKeys.includes(key) ? "checked" : "";
            const imgSrc = getCachedImageUrl(l.name) || getLandmarkIconUrl(l.icon, l.name);
            const isPhoto = !!getCachedImageUrl(l.name);
            return `<li class="popup-lm-item">
              <label class="lm-check-label">
                <input type="checkbox" class="lm-checkbox" data-key="${key}" ${checked} />
                <span class="lm-checkmark"></span>
              </label>
              <img class="lm-popup-img ${isPhoto ? 'lm-photo' : ''}" src="${imgSrc}" data-lm-name="${l.name}" data-lm-icon="${l.icon}" alt="" />
              <span>${l.name}</span>
            </li>`;
          }
        )
        .join("") +
      `</ul>`;

    // Attach checkbox listeners
    popupLandmarks.querySelectorAll(".lm-checkbox").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const key = e.target.dataset.key;
        if (e.target.checked) {
          if (!visitedLandmarkKeys.includes(key)) {
            visitedLandmarkKeys.push(key);
          }
        } else {
          visitedLandmarkKeys = visitedLandmarkKeys.filter((k) => k !== key);
        }
        saveVisitedLandmarks(visitedLandmarkKeys);
        mapApi.updateVisitedLandmarks(visitedLandmarkKeys);
      });
    });

    // Async-load Wikipedia photos for landmarks that aren't cached yet
    popupLandmarks.querySelectorAll(".lm-popup-img:not(.lm-photo)").forEach((img) => {
      const name = img.dataset.lmName;
      fetchLandmarkImage(name).then((url) => {
        if (url) {
          img.src = url;
          img.classList.add("lm-photo");
        }
      });
    });
  } else {
    popupLandmarks.innerHTML = "";
  }

  popupEl.classList.remove("hidden");
}

function closePopup() {
  popupEl.classList.add("hidden");
  popupCountry = null;
}

popupCloseBtn.addEventListener("click", closePopup);

popupToggle.addEventListener("click", () => {
  if (!popupCountry) return;
  toggleCountry(popupCountry);
  // Refresh popup state
  showCountryPopup(popupCountry);
});

// Close popup on outside click
document.getElementById("map-container").addEventListener("mousedown", (e) => {
  if (!popupEl.classList.contains("hidden") && !popupEl.contains(e.target)) {
    closePopup();
  }
});

// Close popup on Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePopup();
});

// ─── Core logic ───────────────────────────────────────────────────────
function toggleCountry(country) {
  const idx = visitedCodes.indexOf(country.code);
  if (idx >= 0) {
    visitedCodes.splice(idx, 1);
  } else {
    visitedCodes.push(country.code);
  }
  saveVisited(visitedCodes);
  refresh();
}

function refresh() {
  // Update map
  mapApi.updateVisited(visitedCodes);
  mapApi.updateVisitedLandmarks(visitedLandmarkKeys);

  // Stats
  const count = visitedCodes.length;
  const percent = ((count / TOTAL_COUNTRIES) * 100).toFixed(1);
  const continents = [
    ...new Set(
      visitedCodes
        .map((c) => getCountryByCode(c))
        .filter(Boolean)
        .map((c) => c.continent)
    ),
  ];

  statCount.textContent = count;
  statPercent.textContent = percent + "%";
  statContinents.textContent = continents.length;
  visitedBadge.textContent = count;

  // Flight stats in header
  const fStats = getFlightStats();
  statFlights.textContent = fStats.totalFlights;
  statDistance.textContent = fStats.totalDistance.toLocaleString();

  // Visited cards
  if (count === 0) {
    emptyState.classList.remove("hidden");
    visitedGrid.innerHTML = "";
    return;
  }

  emptyState.classList.add("hidden");

  const sorted = visitedCodes
    .map((c) => getCountryByCode(c))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

  visitedGrid.innerHTML = sorted
    .map(
      (c) =>
        `<div class="visited-card" data-code="${c.code}">
          <img class="visited-card-flag" src="${getFlagUrl(c.code, 72)}" alt="${c.name}" loading="lazy" />
          <div class="visited-card-info">
            <div class="visited-card-name">${c.name}</div>
            <div class="visited-card-continent">${c.continent}${c.territory ? " · Territory" : ""}</div>
          </div>
          <button class="visited-card-remove" title="Remove ${c.name}" data-remove="${c.code}">&times;</button>
        </div>`
    )
    .join("");

  // Remove buttons
  visitedGrid.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const code = btn.dataset.remove;
      const country = getCountryByCode(code);
      if (country) toggleCountry(country);
    });
  });
}

// ─── Search ───────────────────────────────────────────────────────────
searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim();
  if (!query) {
    searchResults.classList.remove("active");
    searchResults.innerHTML = "";
    return;
  }

  const results = searchCountries(query);
  if (results.length === 0) {
    searchResults.classList.remove("active");
    return;
  }

  searchResults.innerHTML = results
    .map((c) => {
      const isVisited = visitedCodes.includes(c.code);
      return `<div class="search-result-item${isVisited ? " visited" : ""}" data-code="${c.code}">
        <img class="search-result-flag" src="${getFlagUrl(c.code, 56)}" alt="" loading="lazy" />
        <span class="search-result-name">${c.name}</span>
        ${isVisited ? '<span class="search-result-check">✓</span>' : ""}
      </div>`;
    })
    .join("");

  searchResults.classList.add("active");

  searchResults.querySelectorAll(".search-result-item").forEach((item) => {
    item.addEventListener("click", () => {
      const code = item.dataset.code;
      const country = getCountryByCode(code);
      if (country) toggleCountry(country);
      searchInput.value = "";
      searchResults.classList.remove("active");
    });
  });
});

// Close search on click outside
document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-box")) {
    searchResults.classList.remove("active");
  }
  if (!e.target.closest(".flight-field")) {
    flightFromResults.classList.remove("active");
    flightToResults.classList.remove("active");
  }
});

// Close search on Escape
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    searchInput.value = "";
    searchResults.classList.remove("active");
    searchInput.blur();
  }
});

// ─── Flights UI ───────────────────────────────────────────────────────
function setupAirportSearch(input, hiddenInput, dropdown) {
  input.addEventListener("input", () => {
    // When the user types new text, clear the previously selected IATA
    // so they must re-select from the dropdown
    hiddenInput.value = "";

    const query = input.value.trim();
    if (!query) {
      dropdown.classList.remove("active");
      dropdown.innerHTML = "";
      return;
    }

    const results = searchAirports(query);
    if (results.length === 0) {
      dropdown.classList.remove("active");
      return;
    }

    dropdown.innerHTML = results
      .map(
        (a) =>
          `<div class="flight-dropdown-item" data-iata="${a.iata}" data-name="${a.city} (${a.iata})">
            <span class="airport-iata">${a.iata}</span>
            <span class="airport-info">${a.city} — ${a.name}</span>
          </div>`
      )
      .join("");

    dropdown.classList.add("active");

    // Use mousedown + preventDefault to avoid the input blur race condition
    // that can prevent clicks from registering on dropdown items
    dropdown.querySelectorAll(".flight-dropdown-item").forEach((item) => {
      item.addEventListener("mousedown", (e) => {
        e.preventDefault(); // keep focus on input, prevent blur-related issues
        e.stopPropagation(); // prevent document click handler interference
        input.value = item.dataset.name;
        hiddenInput.value = item.dataset.iata;
        dropdown.classList.remove("active");
      });
    });
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      dropdown.classList.remove("active");
      input.blur();
    }
  });
}

setupAirportSearch(flightFrom, flightFromIata, flightFromResults);
setupAirportSearch(flightTo, flightToIata, flightToResults);

btnAddFlight.addEventListener("click", () => {
  const fromIATA = flightFromIata.value;
  const toIATA = flightToIata.value;

  if (!fromIATA || !toIATA || fromIATA === toIATA) {
    // Highlight the missing/invalid fields so the user knows what to fix
    if (!fromIATA) flightFrom.classList.add("field-error");
    if (!toIATA) flightTo.classList.add("field-error");
    if (fromIATA && toIATA && fromIATA === toIATA) {
      flightFrom.classList.add("field-error");
      flightTo.classList.add("field-error");
    }
    // Shake the button
    btnAddFlight.classList.add("btn-shake");
    setTimeout(() => {
      btnAddFlight.classList.remove("btn-shake");
      flightFrom.classList.remove("field-error");
      flightTo.classList.remove("field-error");
    }, 600);
    return;
  }

  const flight = addFlight({
    fromIATA,
    toIATA,
    date: flightDate.value || "",
    time: flightTime.value || "",
    arrivalTime: flightArrivalTime.value || "",
    flightNumber: flightNumber.value.trim(),
    bookingCode: flightBooking.value.trim(),
  });
  if (!flight) return;

  // If the Fetch button found GPS track data, attach it as waypoints
  if (btnFetchFlight._fetchedTrack && btnFetchFlight._fetchedTrack.length >= 2) {
    updateFlight(flight.id, { waypoints: btnFetchFlight._fetchedTrack });
    btnFetchFlight._fetchedTrack = null;
  }

  // Clear inputs
  flightFrom.value = "";
  flightTo.value = "";
  flightFromIata.value = "";
  flightToIata.value = "";
  setCalDate("");
  flightTime.value = "";
  flightArrivalTime.value = "";
  flightNumber.value = "";
  flightBooking.value = "";

  refreshFlights();
  mapApi.updateFlights();

  // Update header stats
  const fStats = getFlightStats();
  statFlights.textContent = fStats.totalFlights;
  statDistance.textContent = fStats.totalDistance.toLocaleString();
});

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function refreshFlights() {
  const allFlights = getFlights();
  const stats = getFlightStats();

  flightsBadge.textContent = allFlights.length;
  fsTotal.textContent = stats.totalFlights;
  fsDistance.textContent = stats.totalDistance.toLocaleString();
  fsRoutes.textContent = stats.uniqueRoutes;
  fsAirports.textContent = stats.airports;
  fsEarth.textContent = stats.timesAroundEarth;

  // ── Populate year filter ──
  const years = [...new Set(
    allFlights.map((f) => f.date ? f.date.slice(0, 4) : null).filter(Boolean)
  )].sort((a, b) => b - a);

  const currentYearVal = flightsYearFilter.value;
  const yearOptions = `<option value="all">All Years</option>` +
    years.map((y) => `<option value="${y}"${y === currentYearVal ? " selected" : ""}>${y}</option>`).join("");
  flightsYearFilter.innerHTML = yearOptions;
  mapYearFilter.innerHTML = yearOptions;
  // Restore selection if still valid
  if (currentYearVal !== "all" && years.includes(currentYearVal)) {
    flightsYearFilter.value = currentYearVal;
    mapYearFilter.value = currentYearVal;
  }

  // ── Apply filters ──
  let flights = allFlights;

  const yearVal = flightsYearFilter.value;
  if (yearVal !== "all") {
    flights = flights.filter((f) => f.date && f.date.startsWith(yearVal));
  }

  const searchVal = flightsSearch.value.trim().toLowerCase();
  if (searchVal) {
    flights = flights.filter((f) => {
      const haystack = [
        f.fromIATA, f.toIATA, f.fromCity, f.toCity,
        f.fromAirportName, f.toAirportName,
        f.flightNumber, f.bookingCode, f.airline, f.date,
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(searchVal);
    });
  }

  if (flights.length === 0) {
    flightsEmpty.classList.remove("hidden");
    flightsEmpty.textContent = allFlights.length === 0
      ? "Add your first flight to start tracking your routes!"
      : "No flights match your filters.";
    flightsList.innerHTML = "";
  } else {
    flightsEmpty.classList.add("hidden");

    flightsList.innerHTML = flights
      .map(
        (f) => {
          const dateStr = f.date ? formatDate(f.date) : "";
          const depTime = f.time || "";
          const arrTime = f.arrivalTime || "";
          const timeStr = depTime && arrTime ? `${depTime}–${arrTime}` : depTime || arrTime || "";
          const flNum = f.flightNumber || "";
          const booking = f.bookingCode || "";
          const details = [flNum, booking, dateStr, timeStr].filter(Boolean);

          return `<div class="flight-card" data-flight-id="${f.id}">
            <div class="flight-card-main">
              <div class="flight-card-route">
                <div class="flight-card-airport">
                  <span class="flight-iata">${f.fromIATA || f.from || "?"}</span>
                  <span class="flight-city">${f.fromCity || f.fromName || ""}</span>
                </div>
                <div class="flight-card-arrow">
                  <span class="flight-arrow-line"></span>
                  <span class="flight-arrow-icon">✈</span>
                  <span class="flight-arrow-line"></span>
                </div>
                <div class="flight-card-airport">
                  <span class="flight-iata">${f.toIATA || f.to || "?"}</span>
                  <span class="flight-city">${f.toCity || f.toName || ""}</span>
                </div>
              </div>
              <div class="flight-card-meta">
                <span class="flight-card-dist">${f.distance.toLocaleString()} km</span>
                ${details.length ? `<span class="flight-card-details">${details.join(" · ")}</span>` : ""}
              </div>
            </div>
            <div class="flight-card-actions">
              <button class="flight-card-edit" title="Edit flight" data-edit-flight="${f.id}">✏️</button>
              <button class="flight-card-lookup" title="Find flight online" data-lookup-flight="${f.id}" data-flight-num="${flNum}">🔍</button>
              <button class="flight-card-remove" title="Remove flight" data-remove-flight="${f.id}">&times;</button>
            </div>
          </div>`;
        }
      )
      .join("");

    // ── Event: remove flight ──
    flightsList.querySelectorAll("[data-remove-flight]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = Number(btn.dataset.removeFlight);
        removeFlight(id);
        refreshFlights();
        mapApi.updateFlights();
        const fStats = getFlightStats();
        statFlights.textContent = fStats.totalFlights;
        statDistance.textContent = fStats.totalDistance.toLocaleString();
      });
    });

    // ── Event: edit flight ──
    flightsList.querySelectorAll("[data-edit-flight]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = Number(btn.dataset.editFlight);
        openEditFlightModal(id);
      });
    });

    // ── Event: lookup flight ──
    flightsList.querySelectorAll("[data-lookup-flight]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const flNum = btn.dataset.flightNum;
        const flId = Number(btn.dataset.lookupFlight);
        if (!flNum) {
          alert("No flight number to look up. Add a flight number first.");
          return;
        }

        const origText = btn.textContent;
        btn.textContent = "⏳";
        btn.disabled = true;

        try {
          const route = await fetchFlightRoute(flNum);
          if (route) {
            btn.textContent = "✅";
            setTimeout(() => { btn.textContent = origText; btn.disabled = false; }, 2000);
          } else {
            btn.textContent = origText;
            btn.disabled = false;
          }
          const result = await lookupFlight(flNum);
          if (result && result.found) {
            window.open(result.googleUrl, "_blank");
          }
        } catch {
          btn.textContent = origText;
          btn.disabled = false;
          const result = await lookupFlight(flNum);
          if (result && result.found) {
            window.open(result.googleUrl, "_blank");
          }
        }
      });
    });
  }

  // ── Advanced stats ──
  renderAdvancedStats(allFlights);
}

// ─── Year Filter & Search Handlers ────────────────────────────────────
function syncYearFilter(source) {
  const year = source.value;
  flightsYearFilter.value = year;
  mapYearFilter.value = year;
  refreshFlights();
  mapApi.updateFlights(year);
}

flightsYearFilter.addEventListener("change", () => syncYearFilter(flightsYearFilter));
mapYearFilter.addEventListener("change", () => syncYearFilter(mapYearFilter));
flightsSearch.addEventListener("input", () => refreshFlights());

// ─── Edit Flight Modal ────────────────────────────────────────────────
setupAirportSearch(editFlightFrom, editFlightFromIata, editFlightFromResults);
setupAirportSearch(editFlightTo, editFlightToIata, editFlightToResults);

function openEditFlightModal(flightId) {
  const flights = getFlights();
  const f = flights.find((fl) => fl.id === flightId);
  if (!f) return;

  editFlightId.value = f.id;
  editFlightFromIata.value = f.fromIATA || "";
  editFlightFrom.value = f.fromCity ? `${f.fromCity} (${f.fromIATA})` : f.fromIATA || "";
  editFlightToIata.value = f.toIATA || "";
  editFlightTo.value = f.toCity ? `${f.toCity} (${f.toIATA})` : f.toIATA || "";
  editFlightDate.value = f.date || "";
  editFlightTime.value = f.time || "";
  editFlightArrival.value = f.arrivalTime || "";
  editFlightNumber.value = f.flightNumber || "";
  editFlightBooking.value = f.bookingCode || "";
  editFlightModal.classList.add("active");
}

function closeEditFlightModal() {
  editFlightModal.classList.remove("active");
}

editFlightClose.addEventListener("click", closeEditFlightModal);
editFlightCancel.addEventListener("click", closeEditFlightModal);
editFlightModal.addEventListener("click", (e) => {
  if (e.target === editFlightModal) closeEditFlightModal();
});

// Auto-uppercase for edit modal fields
[editFlightNumber, editFlightBooking].forEach((inp) => {
  inp.addEventListener("input", () => { inp.value = inp.value.toUpperCase(); });
});

editFlightSave.addEventListener("click", () => {
  const id = Number(editFlightId.value);
  const fromIATA = editFlightFromIata.value;
  const toIATA = editFlightToIata.value;

  if (!fromIATA || !toIATA) {
    if (!fromIATA) editFlightFrom.classList.add("field-error");
    if (!toIATA) editFlightTo.classList.add("field-error");
    editFlightSave.classList.add("btn-shake");
    setTimeout(() => {
      editFlightSave.classList.remove("btn-shake");
      editFlightFrom.classList.remove("field-error");
      editFlightTo.classList.remove("field-error");
    }, 600);
    return;
  }

  // Build update data — recalculate airport info if changed
  const fromAirport = getAirport(fromIATA);
  const toAirport = getAirport(toIATA);
  const updateData = {
    fromIATA,
    toIATA,
    fromAirportName: fromAirport ? fromAirport.name : "",
    toAirportName: toAirport ? toAirport.name : "",
    fromCity: fromAirport ? fromAirport.city : "",
    toCity: toAirport ? toAirport.city : "",
    fromCoords: fromAirport ? [fromAirport.lat, fromAirport.lng] : null,
    toCoords: toAirport ? [toAirport.lat, toAirport.lng] : null,
    date: editFlightDate.value || "",
    time: editFlightTime.value || "",
    arrivalTime: editFlightArrival.value || "",
    flightNumber: editFlightNumber.value.trim(),
    bookingCode: editFlightBooking.value.trim(),
  };

  // Recalculate distance if airports changed
  if (updateData.fromCoords && updateData.toCoords) {
    const [lat1, lon1] = updateData.fromCoords;
    const [lat2, lon2] = updateData.toCoords;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    updateData.distance = Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  // Extract airline from flight number
  const airlineInfo = getAirlineFromFlightNumber(updateData.flightNumber);
  if (airlineInfo) updateData.airline = airlineInfo.name;

  updateFlight(id, updateData);
  closeEditFlightModal();
  refreshFlights();
  mapApi.updateFlights();
  const fStats = getFlightStats();
  statFlights.textContent = fStats.totalFlights;
  statDistance.textContent = fStats.totalDistance.toLocaleString();
});

// ─── Advanced Flight Statistics ───────────────────────────────────────
const BAR_COLORS = ["fill-amber", "fill-blue", "fill-green", "fill-purple"];

function renderAdvancedStats(flights) {
  if (flights.length === 0) {
    advancedStatsPanel.classList.add("hidden");
    return;
  }
  advancedStatsPanel.classList.remove("hidden");

  // ── Top Airports ──
  const airportCounts = {};
  flights.forEach((f) => {
    const from = f.fromIATA || f.from;
    const to = f.toIATA || f.to;
    if (from) airportCounts[from] = (airportCounts[from] || 0) + 1;
    if (to) airportCounts[to] = (airportCounts[to] || 0) + 1;
  });
  const topAirports = Object.entries(airportCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxAirport = topAirports.length ? topAirports[0][1] : 1;

  advTopAirportsBody.innerHTML = topAirports.map(([code, count], i) =>
    `<div class="adv-bar-row">
      <span class="adv-bar-label">${code}</span>
      <div class="adv-bar-track">
        <div class="adv-bar-fill ${BAR_COLORS[i % BAR_COLORS.length]}" style="width: ${(count / maxAirport * 100).toFixed(0)}%"></div>
      </div>
      <span class="adv-bar-count">${count}</span>
    </div>`
  ).join("");

  // ── Airlines ──
  const airlineCounts = {};
  flights.forEach((f) => {
    const info = getAirlineFromFlightNumber(f.flightNumber);
    if (info) {
      const key = info.code;
      if (!airlineCounts[key]) airlineCounts[key] = { name: info.name, count: 0 };
      airlineCounts[key].count++;
    }
  });
  const topAirlines = Object.entries(airlineCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8);

  if (topAirlines.length === 0) {
    advAirlinesBody.innerHTML = `<span style="font-size: 12px; color: var(--text-muted);">Add flight numbers to see airline stats</span>`;
  } else {
    advAirlinesBody.innerHTML = topAirlines.map(([code, { name, count }]) =>
      `<div class="adv-airline-row">
        <span class="adv-airline-code">${code}</span>
        <span class="adv-airline-name">${name}</span>
        <span class="adv-airline-count">${count}</span>
      </div>`
    ).join("");
  }

  // ── Busiest Months ──
  const monthCounts = {};
  flights.forEach((f) => {
    if (f.date) {
      const m = parseInt(f.date.slice(5, 7), 10);
      if (m >= 1 && m <= 12) {
        const key = SHORT_MONTHS[m - 1];
        monthCounts[key] = (monthCounts[key] || 0) + 1;
      }
    }
  });
  const topMonths = Object.entries(monthCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxMonth = topMonths.length ? topMonths[0][1] : 1;

  if (topMonths.length === 0) {
    advMonthlyBody.innerHTML = `<span style="font-size: 12px; color: var(--text-muted);">Add flight dates to see monthly stats</span>`;
  } else {
    advMonthlyBody.innerHTML = topMonths.map(([month, count], i) =>
      `<div class="adv-bar-row">
        <span class="adv-month-label">${month}</span>
        <div class="adv-bar-track">
          <div class="adv-bar-fill ${BAR_COLORS[(i + 2) % BAR_COLORS.length]}" style="width: ${(count / maxMonth * 100).toFixed(0)}%"></div>
        </div>
        <span class="adv-bar-count">${count}</span>
      </div>`
    ).join("");
  }

  // ── Longest Flights ──
  const longest = [...flights]
    .filter((f) => f.distance > 0)
    .sort((a, b) => b.distance - a.distance)
    .slice(0, 5);

  if (longest.length === 0) {
    advLongestBody.innerHTML = `<span style="font-size: 12px; color: var(--text-muted);">No distance data yet</span>`;
  } else {
    advLongestBody.innerHTML = longest.map((f) =>
      `<div class="adv-longest-row">
        <span class="adv-longest-route">${f.fromIATA || "?"} → ${f.toIATA || "?"}</span>
        <span class="adv-longest-dist">${f.distance.toLocaleString()} km${f.flightNumber ? ` · ${f.flightNumber}` : ""}</span>
      </div>`
    ).join("");
  }
}

// ─── Flights Import / Export ──────────────────────────────────────────
const fiModal = document.getElementById("flights-import-modal");
const feModal = document.getElementById("flights-export-modal");
const fiResults = document.getElementById("fi-results");
const fiResultText = document.getElementById("fi-result-text");
const fiResultErrors = document.getElementById("fi-result-errors");

function openImportModal() {
  fiResults.classList.add("hidden");
  document.querySelectorAll(".fi-panel").forEach((p) => p.classList.add("hidden"));
  document.getElementById("fi-panel-csv").classList.remove("hidden");
  document.querySelectorAll(".fi-tab").forEach((t) => t.classList.remove("active"));
  document.querySelector('[data-fi-tab="csv"]').classList.add("active");
  fiModal.classList.add("active");
}

function closeImportModal() { fiModal.classList.remove("active"); }
function openExportModal() { feModal.classList.add("active"); }
function closeExportModal() { feModal.classList.remove("active"); }

document.getElementById("btn-import-flights").addEventListener("click", openImportModal);
document.getElementById("btn-export-flights").addEventListener("click", openExportModal);
document.getElementById("fi-modal-close").addEventListener("click", closeImportModal);
document.getElementById("fe-modal-close").addEventListener("click", closeExportModal);
document.getElementById("fi-done").addEventListener("click", closeImportModal);

fiModal.addEventListener("click", (e) => { if (e.target === fiModal) closeImportModal(); });
feModal.addEventListener("click", (e) => { if (e.target === feModal) closeExportModal(); });

// Tab switching
document.querySelectorAll(".fi-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".fi-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    document.querySelectorAll(".fi-panel").forEach((p) => p.classList.add("hidden"));
    document.getElementById(`fi-panel-${tab.dataset.fiTab}`).classList.remove("hidden");
    fiResults.classList.add("hidden");
  });
});

function showImportResults(result) {
  fiResults.classList.remove("hidden");
  fiResultText.textContent = `✅ Imported ${result.imported} flight${result.imported !== 1 ? "s" : ""}` +
    (result.skipped ? ` · Skipped ${result.skipped}` : "");
  if (result.errors.length) {
    fiResultErrors.innerHTML = result.errors.slice(0, 10)
      .map((e) => `<div class="fi-error-line">⚠️ ${e}</div>`).join("");
    if (result.errors.length > 10) {
      fiResultErrors.innerHTML += `<div class="fi-error-line">...and ${result.errors.length - 10} more</div>`;
    }
  } else {
    fiResultErrors.innerHTML = "";
  }
  if (result.imported > 0) {
    refreshFlights();
    mapApi.updateFlights();
    const fStats = getFlightStats();
    statFlights.textContent = fStats.totalFlights;
    statDistance.textContent = fStats.totalDistance.toLocaleString();
  }
}

// CSV upload
const fiCsvDrop = document.getElementById("fi-csv-drop");
const fiCsvInput = document.getElementById("fi-csv-input");
fiCsvDrop.addEventListener("click", () => fiCsvInput.click());
fiCsvDrop.addEventListener("dragover", (e) => { e.preventDefault(); fiCsvDrop.classList.add("drag-over"); });
fiCsvDrop.addEventListener("dragleave", () => fiCsvDrop.classList.remove("drag-over"));
fiCsvDrop.addEventListener("drop", (e) => { e.preventDefault(); fiCsvDrop.classList.remove("drag-over"); handleCSVFile(e.dataTransfer.files[0]); });
fiCsvInput.addEventListener("change", () => { if (fiCsvInput.files[0]) handleCSVFile(fiCsvInput.files[0]); fiCsvInput.value = ""; });

function handleCSVFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const result = importFlightsCSV(reader.result);
    showImportResults(result);
  };
  reader.readAsText(file);
}

// JSON upload
const fiJsonDrop = document.getElementById("fi-json-drop");
const fiJsonInput = document.getElementById("fi-json-input");
fiJsonDrop.addEventListener("click", () => fiJsonInput.click());
fiJsonDrop.addEventListener("dragover", (e) => { e.preventDefault(); fiJsonDrop.classList.add("drag-over"); });
fiJsonDrop.addEventListener("dragleave", () => fiJsonDrop.classList.remove("drag-over"));
fiJsonDrop.addEventListener("drop", (e) => { e.preventDefault(); fiJsonDrop.classList.remove("drag-over"); handleJSONFile(e.dataTransfer.files[0]); });
fiJsonInput.addEventListener("change", () => { if (fiJsonInput.files[0]) handleJSONFile(fiJsonInput.files[0]); fiJsonInput.value = ""; });

function handleJSONFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const result = importFlightsJSON(reader.result);
    showImportResults(result);
  };
  reader.readAsText(file);
}

// Paste import
document.getElementById("fi-parse-paste").addEventListener("click", () => {
  const text = document.getElementById("fi-paste-area").value.trim();
  if (!text) return;

  // Try JSON first
  if (text.startsWith("[")) {
    const result = importFlightsJSON(text);
    showImportResults(result);
    return;
  }

  // Try CSV (if it has commas and a header-like first line)
  if (text.includes(",") && /from|to|origin|dest/i.test(text.split("\n")[0])) {
    const result = importFlightsCSV(text);
    showImportResults(result);
    return;
  }

  // Otherwise parse as simple text: one line per flight
  // FORMAT: FROM TO [DATE] [TIME] [FLIGHT#] [BOOKING]
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const records = [];
  const errors = [];

  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].trim().split(/[\s,;\t]+/);
    if (parts.length < 2) {
      errors.push(`Line ${i + 1}: need at least FROM and TO codes`);
      continue;
    }
    records.push({
      fromIATA: parts[0].toUpperCase(),
      toIATA: parts[1].toUpperCase(),
      date: parts[2] || "",
      time: parts[3] || "",
      flightNumber: parts[4] || "",
      bookingCode: parts[5] || "",
    });
  }

  // Use the CSV importer with built records
  const csvText = "From,To,Date,Time,Flight Number,Booking Code\n" +
    records.map((r) => `${r.fromIATA},${r.toIATA},${r.date},${r.time},${r.flightNumber},${r.bookingCode}`).join("\n");
  const result = importFlightsCSV(csvText);
  result.errors = [...errors, ...result.errors];
  showImportResults(result);
});

// Export buttons
document.getElementById("fe-csv").addEventListener("click", () => {
  downloadFile("my-flights.csv", exportFlightsCSV(), "text/csv");
  closeExportModal();
});

document.getElementById("fe-json").addEventListener("click", () => {
  downloadFile("my-flights.json", exportFlightsJSON(), "application/json");
  closeExportModal();
});

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Flight route fetching (per-card) ─────────────────────────────────
// The lookup button in each flight card now also tries to fetch the route.
// We override the original lookup handler to add route fetching.

// ─── Fetch flight from API ────────────────────────────────────────────
const btnFetchFlight = document.getElementById("btn-fetch-flight");
const fetchStatus = document.getElementById("fetch-status");

function showFetchStatus(msg, type = "info") {
  fetchStatus.classList.remove("hidden", "fetch-ok", "fetch-err", "fetch-loading");
  fetchStatus.classList.add(type === "ok" ? "fetch-ok" : type === "err" ? "fetch-err" : "fetch-loading");
  fetchStatus.textContent = msg;
}

function hideFetchStatus() {
  fetchStatus.classList.add("hidden");
}

btnFetchFlight.addEventListener("click", async () => {
  const flNum = flightNumber.value.trim();
  if (!flNum) {
    flightNumber.focus();
    return;
  }

  if (!isApiConfigured()) {
    showFetchStatus("No API key configured. Click ⚙️ to set up.", "err");
    setTimeout(hideFetchStatus, 4000);
    return;
  }

  btnFetchFlight.disabled = true;

  try {
    const dateVal = flightDate.value || "";
    if (!dateVal) {
      showFetchStatus("Fetching today's flight… (set Date for past flights)", "info");
    } else {
      showFetchStatus("Fetching flight info…", "info");
    }
    const info = await fetchFlightInfo(flNum, dateVal);
    if (!info) {
      showFetchStatus("Flight not found. Try a different flight number.", "err");
      setTimeout(hideFetchStatus, 4000);
      btnFetchFlight.disabled = false;
      return;
    }

    // Register airports if unknown
    if (info.departure.iata && info.departure.lat != null) {
      registerAirport({
        iata: info.departure.iata,
        name: info.departure.name,
        city: info.departure.city,
        lat: info.departure.lat,
        lng: info.departure.lng,
      });
    }
    if (info.arrival.iata && info.arrival.lat != null) {
      registerAirport({
        iata: info.arrival.iata,
        name: info.arrival.name,
        city: info.arrival.city,
        lat: info.arrival.lat,
        lng: info.arrival.lng,
      });
    }

    // Auto-fill From
    if (info.departure.iata) {
      flightFromIata.value = info.departure.iata;
      flightFrom.value = `${info.departure.city || info.departure.name} (${info.departure.iata})`;
    }

    // Auto-fill To
    if (info.arrival.iata) {
      flightToIata.value = info.arrival.iata;
      flightTo.value = `${info.arrival.city || info.arrival.name} (${info.arrival.iata})`;
    }

    // Auto-fill Date
    if (info.departure.date && !flightDate.value) {
      setCalDate(info.departure.date);
    }

    // Auto-fill Departure Time
    if (info.departure.time && !flightTime.value) {
      flightTime.value = info.departure.time;
    }

    // Auto-fill Arrival Time
    if (info.arrival.time && !flightArrivalTime.value) {
      flightArrivalTime.value = info.arrival.time;
    }

    // Build summary
    const parts = [];
    if (info.airline.name) parts.push(info.airline.name);
    if (info.departure.iata && info.arrival.iata) parts.push(`${info.departure.iata} → ${info.arrival.iata}`);
    if (info.departure.time || info.arrival.time) {
      const dep = info.departure.time || "?";
      const arr = info.arrival.time || "?";
      parts.push(`${dep} → ${arr}`);
    }
    if (info.status) parts.push(info.status);
    if (info.aircraft) parts.push(info.aircraft);
    if (info.departure.terminal) parts.push(`T${info.departure.terminal}`);
    if (info.departure.gate) parts.push(`Gate ${info.departure.gate}`);
    if (info.arrival.terminal) parts.push(`Arr T${info.arrival.terminal}`);

    showFetchStatus(`✅ ${parts.join(" · ")}`, "ok");

    // Try to fetch the actual GPS track (async, non-blocking)
    if (info.departure.iata && info.arrival.iata) {
      fetchFlightTrack(flNum, info.departure.iata, info.arrival.iata, info.departure.date || flightDate.value)
        .then((track) => {
          if (track && track.length >= 2) {
            // Store the track temporarily so it gets saved when the flight is added
            btnFetchFlight._fetchedTrack = track;
            showFetchStatus(`✅ ${parts.join(" · ")} · 📍 ${track.length} GPS points`, "ok");
            setTimeout(hideFetchStatus, 8000);
          } else {
            btnFetchFlight._fetchedTrack = null;
            setTimeout(hideFetchStatus, 6000);
          }
        })
        .catch(() => {
          btnFetchFlight._fetchedTrack = null;
          setTimeout(hideFetchStatus, 6000);
        });
    } else {
      btnFetchFlight._fetchedTrack = null;
      setTimeout(hideFetchStatus, 6000);
    }
  } catch (err) {
    showFetchStatus(`❌ ${err.message}`, "err");
    setTimeout(hideFetchStatus, 5000);
  } finally {
    btnFetchFlight.disabled = false;
  }
});

// Also fetch on Enter key in flight number field
flightNumber.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    btnFetchFlight.click();
  }
});

// Auto-uppercase flight number & booking code as user types
flightNumber.addEventListener("input", () => {
  const pos = flightNumber.selectionStart;
  flightNumber.value = flightNumber.value.toUpperCase();
  flightNumber.setSelectionRange(pos, pos);
});
flightBooking.addEventListener("input", () => {
  const pos = flightBooking.selectionStart;
  flightBooking.value = flightBooking.value.toUpperCase();
  flightBooking.setSelectionRange(pos, pos);
});

// ─── Flight API Settings Modal ────────────────────────────────────────
const fapiModal = document.getElementById("flight-api-modal");
const fapiProvider = document.getElementById("fapi-provider");
const fapiKey = document.getElementById("fapi-key");
const fapiStatus = document.getElementById("fapi-status");
const fapiSignupLink = document.getElementById("fapi-signup-link");

function openApiSettings() {
  const cfg = getApiConfig();
  fapiProvider.value = cfg.provider || "";
  fapiKey.value = cfg.apiKey || "";
  fapiStatus.classList.add("hidden");
  updateSignupLink();
  fapiModal.classList.add("active");
}

function closeApiSettings() {
  fapiModal.classList.remove("active");
}

function updateSignupLink() {
  const providers = getProviders();
  const selected = providers.find((p) => p.id === fapiProvider.value);
  if (selected) {
    fapiSignupLink.href = selected.signupUrl;
    fapiSignupLink.textContent = `Get a free ${selected.name} API key →`;
    fapiSignupLink.style.display = "";
  } else {
    fapiSignupLink.style.display = "none";
  }
}

document.getElementById("btn-flight-api-settings").addEventListener("click", openApiSettings);
document.getElementById("fapi-modal-close").addEventListener("click", closeApiSettings);
fapiModal.addEventListener("click", (e) => { if (e.target === fapiModal) closeApiSettings(); });

fapiProvider.addEventListener("change", updateSignupLink);

document.getElementById("fapi-save").addEventListener("click", () => {
  const provider = fapiProvider.value;
  const key = fapiKey.value.trim();
  if (!provider || !key) {
    fapiStatus.classList.remove("hidden");
    fapiStatus.className = "fapi-status fapi-err";
    fapiStatus.textContent = "Please select a provider and enter an API key.";
    return;
  }
  setApiConfig(provider, key);
  fapiStatus.classList.remove("hidden");
  fapiStatus.className = "fapi-status fapi-ok";
  fapiStatus.textContent = "✅ Settings saved!";
  setTimeout(() => { fapiStatus.classList.add("hidden"); }, 2500);
});

document.getElementById("fapi-test").addEventListener("click", async () => {
  const provider = fapiProvider.value;
  const key = fapiKey.value.trim();
  if (!provider || !key) {
    fapiStatus.classList.remove("hidden");
    fapiStatus.className = "fapi-status fapi-err";
    fapiStatus.textContent = "Enter a provider and key first.";
    return;
  }
  // Temporarily save to test
  setApiConfig(provider, key);
  fapiStatus.classList.remove("hidden");
  fapiStatus.className = "fapi-status fapi-loading";
  fapiStatus.textContent = "Testing connection…";

  const result = await testApiConnection();
  if (result.ok) {
    fapiStatus.className = "fapi-status fapi-ok";
    fapiStatus.textContent = `✅ Connected to ${result.provider} successfully!`;
  } else {
    fapiStatus.className = "fapi-status fapi-err";
    fapiStatus.textContent = `❌ ${result.error}`;
  }
});

// Show indicator if API is configured
function updateApiIndicator() {
  const btn = document.getElementById("btn-flight-api-settings");
  if (isApiConfigured()) {
    btn.classList.add("api-active");
    btn.title = "Flight API connected ✓";
  } else {
    btn.classList.remove("api-active");
    btn.title = "Flight API Settings — click to configure";
  }
}
updateApiIndicator();

// ─── Passport ─────────────────────────────────────────────────────────
document.getElementById("btn-passport").addEventListener("click", () => {
  openPassport(visitedCodes);
});

document.getElementById("modal-close").addEventListener("click", closePassport);

document.getElementById("passport-modal").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) closePassport();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePassport();
});

document.getElementById("btn-download").addEventListener("click", downloadPassport);

document.getElementById("btn-share").addEventListener("click", () => {
  copyStats(visitedCodes);
});
// ─── Google Photos integration ──────────────────────────────────────
const gpModal = document.getElementById("google-photos-modal");
const gpStepSetup = document.getElementById("gp-step-setup");
const gpStepScan = document.getElementById("gp-step-scan");
const gpStepDone = document.getElementById("gp-step-done");
const gpClientIdInput = document.getElementById("gp-client-id");
const gpProgressFill = document.getElementById("gp-progress-fill");
const gpProgressCount = document.getElementById("gp-progress-count");
const gpScanText = document.getElementById("gp-scan-text");
const gpResultText = document.getElementById("gp-result-text");

// Populate origin hint
document.getElementById("gp-origin").textContent = window.location.origin;

// Pre-fill Client ID if stored
gpClientIdInput.value = getStoredClientId();

function showGpModal() {
  gpStepSetup.classList.remove("hidden");
  gpStepScan.classList.add("hidden");
  gpStepDone.classList.add("hidden");
  gpModal.classList.add("active");
}

function closeGpModal() {
  gpModal.classList.remove("active");
}

document.getElementById("btn-google-photos").addEventListener("click", showGpModal);
document.getElementById("gp-modal-close").addEventListener("click", closeGpModal);
document.getElementById("gp-done").addEventListener("click", closeGpModal);

gpModal.addEventListener("click", (e) => {
  if (e.target === gpModal) closeGpModal();
});

/** Helper: import geotagged results into the map. */
async function importGeotaggedToMap(geotagged) {
  const currentPhotos = getPhotos();
  const newPhotos = geotagged.filter(
    (gp) => !currentPhotos.find((cp) => cp.name === gp.name && Math.abs(cp.lat - gp.lat) < 0.001)
  );

  if (newPhotos.length > 0) {
    const photosModule = await import("./photos.js");
    for (const p of newPhotos) {
      photosModule.addPhotoDirectly(p);
    }
  }

  mapApi.updatePhotos();
  updatePhotoBadge();
  return newPhotos.length;
}

// ── Picker flow (user selects specific photos via Google Picker) ─────

async function startPickerFlow() {
  const clientId = gpClientIdInput.value.trim();
  if (!clientId) { gpClientIdInput.focus(); return; }
  gpSetClientId(clientId);
  document.getElementById("gp-retry").classList.add("hidden");

  try {
    gpStepSetup.classList.add("hidden");
    gpStepScan.classList.remove("hidden");
    gpStepDone.classList.add("hidden");
    gpScanText.textContent = "Signing in to Google\u2026";
    gpProgressFill.style.width = "0%";
    gpProgressCount.textContent = "";

    await gpSignIn(clientId, "picker");

    gpScanText.textContent = "Opening photo picker \u2014 select your photos in the popup\u2026";
    gpProgressCount.textContent = "Waiting for selection\u2026";

    const geotagged = await fetchGeotaggedPhotos(
      (processed, total) => {
        const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
        gpProgressFill.style.width = pct + "%";
        gpProgressCount.textContent = `${processed} / ${total} photos processed`;
        gpScanText.textContent = "Extracting GPS data from selected photos\u2026";
      },
      (_pickerUrl) => {
        gpScanText.textContent = "Select your photos in the Google Photos picker\u2026";
        gpProgressCount.textContent = "A popup should have opened. Pick your photos and close it when done.";
      }
    );

    const added = await importGeotaggedToMap(geotagged);

    gpStepScan.classList.add("hidden");
    gpStepDone.classList.remove("hidden");
    gpResultText.textContent = geotagged.length > 0
      ? `Found ${geotagged.length} geotagged photo${geotagged.length !== 1 ? "s" : ""}! They\u2019re now on your map.`
      : "No geotagged photos found in your selection. Make sure the photos have GPS/location data.";
  } catch (err) {
    console.error("Google Photos Picker error:", err);
    gpStepScan.classList.add("hidden");
    gpStepDone.classList.remove("hidden");
    gpResultText.textContent = `Error: ${err.message}`;
    document.getElementById("gp-retry").classList.remove("hidden");
  }
}

document.getElementById("gp-connect").addEventListener("click", startPickerFlow);
document.getElementById("gp-retry").addEventListener("click", startPickerFlow);

// ─── Google Takeout import ──────────────────────────────────────────

document.getElementById("gp-takeout-btn").addEventListener("click", () => {
  document.getElementById("gp-takeout-input").click();
});

document.getElementById("gp-takeout-input").addEventListener("change", async (e) => {
  const files = Array.from(e.target.files);
  if (!files.length) return;

  // Show scanning step
  gpStepSetup.classList.add("hidden");
  gpStepScan.classList.remove("hidden");
  gpStepDone.classList.add("hidden");
  gpScanText.textContent = "Scanning for geotagged photos\u2026";
  gpProgressFill.style.width = "0%";
  gpProgressCount.textContent = `${files.length} files found, scanning metadata\u2026`;
  document.getElementById("gp-retry").classList.add("hidden");

  try {
    // Build lookup: relative-path → File
    const fileMap = new Map();
    for (const f of files) fileMap.set(f.webkitRelativePath, f);

    // Collect JSON sidecar files
    const jsonFiles = files.filter((f) => f.name.endsWith(".json"));

    const geotagged = [];

    for (let i = 0; i < jsonFiles.length; i++) {
      try {
        const text = await jsonFiles[i].text();
        const meta = JSON.parse(text);

        // Accept geoData or geoDataExif
        const geo = meta.geoData || meta.geoDataExif;
        if (!geo) continue;
        const lat = parseFloat(geo.latitude);
        const lng = parseFloat(geo.longitude);
        if (!lat && !lng) continue;                    // skip 0,0
        if (lat < -90 || lat > 90) continue;
        if (lng < -180 || lng > 180) continue;

        // Match the image file: "photo.jpg.json" → "photo.jpg"
        const jsonPath = jsonFiles[i].webkitRelativePath;
        const imagePath = jsonPath.replace(/\.json$/, "");
        const imageFile = fileMap.get(imagePath) || null;

        const title =
          meta.title || jsonFiles[i].name.replace(/\.json$/, "");
        let date = null;
        if (meta.photoTakenTime?.timestamp) {
          date = new Date(
            parseInt(meta.photoTakenTime.timestamp) * 1000
          )
            .toISOString()
            .slice(0, 10);
        }

        geotagged.push({ name: title, lat, lng, date, imageFile });
      } catch {
        /* skip unparseable files */
      }

      // Yield to UI every 200 files
      if (i % 200 === 0) {
        const pct = Math.round((i / jsonFiles.length) * 40);
        gpProgressFill.style.width = pct + "%";
        gpProgressCount.textContent = `Scanned ${i} / ${jsonFiles.length} metadata files (${geotagged.length} geotagged)`;
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    gpProgressFill.style.width = "40%";
    gpScanText.textContent = `Found ${geotagged.length} geotagged photos. Generating thumbnails\u2026`;

    // De-duplicate against existing photos
    const currentPhotos = getPhotos();
    const toImport = geotagged.filter(
      (gp) =>
        !currentPhotos.find(
          (cp) =>
            cp.name === gp.name &&
            Math.abs(cp.lat - gp.lat) < 0.001
        )
    );

    // Import in batches, generating thumbnails for images
    const photosModule = await import("./photos.js");
    let added = 0;
    const BATCH = 8;

    for (let i = 0; i < toImport.length; i += BATCH) {
      const batch = toImport.slice(i, i + BATCH);

      await Promise.all(
        batch.map(async (item) => {
          let thumb = null;
          if (item.imageFile && item.imageFile.type.startsWith("image/")) {
            try {
              thumb = await takeoutThumbnail(item.imageFile);
            } catch {
              /* skip thumbnail on error */
            }
          }
          photosModule.addPhotoDirectly({
            name: item.name,
            lat: item.lat,
            lng: item.lng,
            thumb,
            date: item.date,
          });
          added++;
        })
      );

      const pct = 40 + Math.round(((i + batch.length) / Math.max(toImport.length, 1)) * 60);
      gpProgressFill.style.width = pct + "%";
      gpProgressCount.textContent = `Imported ${Math.min(i + BATCH, toImport.length)} / ${toImport.length} photos`;
      await new Promise((r) => setTimeout(r, 0));
    }

    mapApi.updatePhotos();
    updatePhotoBadge();

    // Show results
    gpStepScan.classList.add("hidden");
    gpStepDone.classList.remove("hidden");
    gpResultText.textContent =
      added > 0
        ? `Imported ${added} geotagged photo${added !== 1 ? "s" : ""}! They\u2019re now on your map.`
        : geotagged.length > 0
          ? `All ${geotagged.length} geotagged photos were already on your map.`
          : "No geotagged photos found. Make sure you selected the Google Photos folder from your Takeout.";
  } catch (err) {
    console.error("Takeout import error:", err);
    gpStepScan.classList.add("hidden");
    gpStepDone.classList.remove("hidden");
    gpResultText.textContent = `Error: ${err.message}`;
  }

  // Reset input so the same folder can be re-selected
  e.target.value = "";
});

/** Create a small JPEG thumbnail from a File via createImageBitmap. */
async function takeoutThumbnail(file) {
  const MAX = 200;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(MAX / bitmap.width, MAX / bitmap.height, 1);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.7);
}

// ─── Init ─────────────────────────────────────────────────────────────
refresh();
refreshFlights();
updatePhotoBadge();