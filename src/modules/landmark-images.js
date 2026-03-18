/**
 * Fetches landmark photos from Wikipedia REST API.
 * Caches results in localStorage so images only need to be fetched once.
 */

const CACHE_KEY = "been_landmark_images";
const WIKI_API = "https://en.wikipedia.org/api/rest_v1/page/summary/";

// Overrides for landmark names that don't map directly to Wikipedia article titles
const WIKI_SLUGS = {
  "Great Pyramids of Giza": "Giza_pyramid_complex",
  "Rock-Hewn Churches of Lalibela": "Rock-Hewn_Churches,_Lalibela",
  "Sossusvlei Dunes": "Sossusvlei",
  "Bwindi Forest": "Bwindi_Impenetrable_National_Park",
  "Tundavala Gap": "Tundavala",
  "Laas Geel Cave Paintings": "Laas_Geel",
  "Cotton Tree": "Cotton_Tree_(Freetown)",
  "Lake Assal": "Lake_Assal_(Djibouti)",
  "Easter Island (Moai)": "Moai",
  "Petronas Twin Towers": "Petronas_Towers",
  "Tiger's Nest Monastery": "Paro_Taktsang",
  "Hungarian Parliament": "Hungarian_Parliament_Building",
  "Sagrada Familia": "Sagrada_Família",
  "Baiterek Tower": "Bayterek",
  "Golden Temple": "Harmandir_Sahib",
  "Agadez Mosque": "Grand_Mosque_of_Agadez",
  "Boali Falls": "Chutes_de_Boali",
  "Source of the Nile": "Source_of_the_Nile_(Jinja)",
  "Sibebe Rock": "Sibebe",
  "Mont Saint-Michel": "Mont-Saint-Michel",
  "Basilica of Our Lady of Peace": "Basilica_of_Our_Lady_of_Peace,_Yamoussoukro",
  "Ruins of Loropéni": "Ruins_of_Loropéni",
  "Koutammakou": "Koutammakou",
  "Royal Palaces of Abomey": "Royal_Palaces_of_Abomey",
  "Lakes of Ounianga": "Lakes_of_Ounianga",
  "Vallée de Mai": "Vallée_de_Mai",
  "Pico Cão Grande": "Pico_Cão_Grande",
  "Monte Alén National Park": "Monte_Alén_National_Park",
  "Virunga National Park": "Virunga_National_Park",
  "Lopé National Park": "Lopé_National_Park",
  "Saint Basil's Cathedral": "Saint_Basil's_Cathedral",
  "Chichén Itzá": "Chichen_Itza",
  "Teotihuacán": "Teotihuacan",
  "Anne Frank House": "Anne_Frank_House",
  "Schönbrunn Palace": "Schönbrunn_Palace",
  "Neuschwanstein Castle": "Neuschwanstein_Castle",
  "Galápagos Islands": "Galápagos_Islands",
  "Torres del Paine": "Torres_del_Paine_National_Park",
  "Ciudad Perdida": "Ciudad_Perdida",
  "Salar de Uyuni": "Salar_de_Uyuni",
  "Perito Moreno Glacier": "Perito_Moreno_Glacier",
  "Iguazu Falls": "Iguazu_Falls",
  "Avenue of the Baobabs": "Avenue_of_the_Baobabs",
  "Pyramids of Meroë": "Meroë",
  "Okavango Delta": "Okavango_Delta",
  "Island of Mozambique": "Island_of_Mozambique",
  "Stone Circles of Senegambia": "Stone_Circles_of_Senegambia",
  "Inle Lake": "Inle_Lake",
  "Plain of Jars": "Plain_of_Jars",
};

// ── Cache ─────────────────────────────────────────────────────────────
let cache = {};
let pending = {};

try {
  const raw = localStorage.getItem(CACHE_KEY);
  cache = raw ? JSON.parse(raw) : {};
} catch {
  cache = {};
}

function saveCache() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage full — silently ignore
  }
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Synchronous lookup — returns cached URL or null.
 */
export function getCachedImageUrl(name) {
  const entry = cache[name];
  if (!entry || entry === "none") return null;
  return entry;
}

/**
 * Async fetch — returns URL or null. Deduplicates concurrent requests.
 */
export function fetchLandmarkImage(name) {
  // Already cached
  if (cache[name]) {
    return Promise.resolve(cache[name] === "none" ? null : cache[name]);
  }
  // Already in-flight
  if (pending[name]) return pending[name];

  pending[name] = _doFetch(name);
  return pending[name];
}

async function _doFetch(name) {
  const slug = WIKI_SLUGS[name] || name.replace(/ /g, "_");
  try {
    const res = await fetch(WIKI_API + encodeURIComponent(slug), {
      headers: { "Api-User-Agent": "WHERE/1.0" },
    });
    if (!res.ok) {
      cache[name] = "none";
      saveCache();
      delete pending[name];
      return null;
    }
    const data = await res.json();
    // Prefer originalimage for quality, thumbnail as fallback
    const url =
      data.thumbnail?.source?.replace(/\/\d+px-/, "/320px-") || // request 320px wide
      data.thumbnail?.source ||
      null;
    cache[name] = url || "none";
    saveCache();
    delete pending[name];
    return url;
  } catch {
    cache[name] = "none";
    saveCache();
    delete pending[name];
    return null;
  }
}

/**
 * Clear the image cache (useful for debugging).
 */
export function clearImageCache() {
  cache = {};
  localStorage.removeItem(CACHE_KEY);
}
