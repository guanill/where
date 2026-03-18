/**
 * Flight API module — fetch real flight data from online aviation APIs.
 *
 * Supported providers:
 *   • AirLabs  (recommended, 1 000 free requests / month, HTTPS + CORS)
 *     – Sign up at https://airlabs.co  → Dashboard → API Keys
 *   • AviationStack  (100 free requests / month)
 *     – Sign up at https://aviationstack.com  → Dashboard → API Key
 *
 * The module normalises every provider's response into a common shape so the
 * rest of the app doesn't need to know which provider is active.
 */

import { getAirport } from "./airports.js";

const SETTINGS_KEY = "where_flight_api";

// ─── Settings ─────────────────────────────────────────────────────────

const PROVIDERS = {
  airlabs: {
    id: "airlabs",
    name: "AirLabs",
    signupUrl: "https://airlabs.co",
    freeQuota: "1 000 requests / month",
    requiresKey: true,
  },
  aviationstack: {
    id: "aviationstack",
    name: "AviationStack",
    signupUrl: "https://aviationstack.com",
    freeQuota: "100 requests / month",
    requiresKey: true,
  },
};

export function getProviders() {
  return Object.values(PROVIDERS);
}

export function getApiConfig() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || { provider: "", apiKey: "" };
  } catch {
    return { provider: "", apiKey: "" };
  }
}

export function setApiConfig(provider, apiKey) {
  const cfg = { provider, apiKey: apiKey.trim() };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(cfg));
  return cfg;
}

export function isApiConfigured() {
  const cfg = getApiConfig();
  return !!(cfg.provider && cfg.apiKey);
}

// ─── Main lookup function ─────────────────────────────────────────────

/**
 * Look up a flight by its IATA flight number (e.g. "BA178").
 * Optionally pass a date (YYYY-MM-DD) to narrow results.
 *
 * Returns a normalised object on success, or null.
 * Shape:
 *   {
 *     flightIata:    "BA178",
 *     airline:       { name: "British Airways", iata: "BA" },
 *     departure:     { iata: "LHR", name: "Heathrow", city: "London", time: "18:30", date: "2025-06-15" },
 *     arrival:       { iata: "JFK", name: "JFK Intl",  city: "New York", time: "21:35", date: "2025-06-15" },
 *     status:        "scheduled" | "active" | "landed" | "cancelled" | "",
 *     aircraft:      "A380" | "",
 *     duration:      185,          // minutes, if available
 *     track:         [[lat,lng], ...] | null,   // GPS waypoints if available
 *   }
 */
export async function fetchFlightInfo(flightNumber, date) {
  const cfg = getApiConfig();
  if (!cfg.provider || !cfg.apiKey) {
    throw new Error("No flight API configured. Open Settings to add your API key.");
  }

  const cleaned = flightNumber.replace(/\s+/g, "").toUpperCase();

  switch (cfg.provider) {
    case "airlabs":
      return fetchAirLabs(cleaned, date, cfg.apiKey);
    case "aviationstack":
      return fetchAviationStack(cleaned, date, cfg.apiKey);
    default:
      throw new Error(`Unknown provider: ${cfg.provider}`);
  }
}

/**
 * Fetch route / schedule info for a flight number.
 * Returns an array of scheduled routes (useful for recurring flights).
 */
export async function fetchFlightSchedule(flightNumber) {
  const cfg = getApiConfig();
  if (!cfg.provider || !cfg.apiKey) return null;

  const cleaned = flightNumber.replace(/\s+/g, "").toUpperCase();

  if (cfg.provider === "airlabs") {
    return fetchAirLabsSchedule(cleaned, cfg.apiKey);
  }
  // AviationStack doesn't have a separate schedule endpoint on free tier
  return null;
}

/**
 * Quick connectivity test — fetches a well-known flight to verify the API key.
 */
export async function testApiConnection() {
  const cfg = getApiConfig();
  if (!cfg.provider || !cfg.apiKey) {
    return { ok: false, error: "No API key configured" };
  }

  try {
    // Use a well-known route
    const result = await fetchFlightInfo("BA1", "");
    if (result) {
      return { ok: true, provider: PROVIDERS[cfg.provider]?.name || cfg.provider };
    }
    // Even if null, the request didn't throw — key is valid but flight not found
    return { ok: true, provider: PROVIDERS[cfg.provider]?.name || cfg.provider };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ─── AirLabs adapter ─────────────────────────────────────────────────

async function fetchAirLabs(flightIata, date, apiKey) {
  // Try real-time flight first, with optional date filter
  let url = `https://airlabs.co/api/v9/flight?api_key=${encodeURIComponent(apiKey)}&flight_iata=${encodeURIComponent(flightIata)}`;
  if (date) {
    url += `&dep_iata_date=${encodeURIComponent(date)}`;
  }

  const resp = await fetch(url);
  if (!resp.ok) {
    if (resp.status === 401 || resp.status === 403) throw new Error("Invalid API key");
    if (resp.status === 429) throw new Error("API rate limit reached. Try again later.");
    throw new Error(`API error: ${resp.status}`);
  }

  const data = await resp.json();

  if (data.error) {
    if (data.error.code === "no_data" || data.error.code === "not_found") {
      // Flight not in real-time — try schedules
      return fetchAirLabsSchedule(flightIata, apiKey);
    }
    throw new Error(data.error.message || "API error");
  }

  const fl = data.response;
  if (!fl) {
    // Try schedule as fallback
    return fetchAirLabsSchedule(flightIata, apiKey);
  }

  return normaliseAirLabs(fl);
}

async function fetchAirLabsSchedule(flightIata, apiKey) {
  const url = `https://airlabs.co/api/v9/schedules?api_key=${encodeURIComponent(apiKey)}&flight_iata=${encodeURIComponent(flightIata)}`;

  const resp = await fetch(url);
  if (!resp.ok) return null;

  const data = await resp.json();
  if (data.error || !data.response || data.response.length === 0) return null;

  // Return the first schedule entry
  return normaliseAirLabsSchedule(data.response[0]);
}

function normaliseAirLabs(fl) {
  const depIata = fl.dep_iata || "";
  const arrIata = fl.arr_iata || "";
  const depAirport = getAirport(depIata);
  const arrAirport = getAirport(arrIata);

  return {
    flightIata: fl.flight_iata || fl.flight_icao || "",
    airline: {
      name: fl.airline_name || "",
      iata: fl.airline_iata || "",
    },
    departure: {
      iata: depIata,
      name: depAirport?.name || fl.dep_name || "",
      city: depAirport?.city || fl.dep_city || "",
      time: extractTime(fl.dep_time_utc || fl.dep_time || ""),
      date: extractDate(fl.dep_time_utc || fl.dep_time || ""),
      terminal: fl.dep_terminal || "",
      gate: fl.dep_gate || "",
      lat: fl.dep_lat ?? depAirport?.lat ?? null,
      lng: fl.dep_lng ?? depAirport?.lng ?? null,
    },
    arrival: {
      iata: arrIata,
      name: arrAirport?.name || fl.arr_name || "",
      city: arrAirport?.city || fl.arr_city || "",
      time: extractTime(fl.arr_time_utc || fl.arr_time || ""),
      date: extractDate(fl.arr_time_utc || fl.arr_time || ""),
      terminal: fl.arr_terminal || "",
      gate: fl.arr_gate || "",
      lat: fl.arr_lat ?? arrAirport?.lat ?? null,
      lng: fl.arr_lng ?? arrAirport?.lng ?? null,
    },
    status: fl.status || "",
    aircraft: fl.aircraft_icao || "",
    duration: fl.duration || null,
  };
}

function normaliseAirLabsSchedule(sc) {
  const depIata = sc.dep_iata || "";
  const arrIata = sc.arr_iata || "";
  const depAirport = getAirport(depIata);
  const arrAirport = getAirport(arrIata);

  return {
    flightIata: sc.flight_iata || "",
    airline: {
      name: sc.airline_name || "",
      iata: sc.airline_iata || "",
    },
    departure: {
      iata: depIata,
      name: depAirport?.name || sc.dep_name || "",
      city: depAirport?.city || sc.dep_city || "",
      time: sc.dep_time || "",
      date: "",
      terminal: sc.dep_terminal || "",
      gate: "",
      lat: depAirport?.lat ?? null,
      lng: depAirport?.lng ?? null,
    },
    arrival: {
      iata: arrIata,
      name: arrAirport?.name || sc.arr_name || "",
      city: arrAirport?.city || sc.arr_city || "",
      time: sc.arr_time || "",
      date: "",
      terminal: sc.arr_terminal || "",
      gate: "",
      lat: arrAirport?.lat ?? null,
      lng: arrAirport?.lng ?? null,
    },
    status: sc.status || "scheduled",
    aircraft: "",
    duration: sc.duration || null,
  };
}

// ─── AviationStack adapter ───────────────────────────────────────────

async function fetchAviationStack(flightIata, date, apiKey) {
  // AviationStack free plan uses HTTP only
  const base = "https://api.aviationstack.com/v1/flights";
  let url = `${base}?access_key=${encodeURIComponent(apiKey)}&flight_iata=${encodeURIComponent(flightIata)}&limit=1`;
  if (date) {
    url += `&flight_date=${encodeURIComponent(date)}`;
  }

  const resp = await fetch(url);
  if (!resp.ok) {
    if (resp.status === 401 || resp.status === 403) throw new Error("Invalid API key");
    if (resp.status === 429) throw new Error("API rate limit reached. Try again later.");
    // AviationStack free plan may not support HTTPS
    if (resp.status === 0 || !resp.ok) {
      throw new Error("AviationStack free plan may not support HTTPS. Try AirLabs instead.");
    }
    throw new Error(`API error: ${resp.status}`);
  }

  const data = await resp.json();

  if (data.error) {
    throw new Error(data.error.info || data.error.message || "API error");
  }

  if (!data.data || data.data.length === 0) return null;

  return normaliseAviationStack(data.data[0]);
}

function normaliseAviationStack(fl) {
  const depIata = fl.departure?.iata || "";
  const arrIata = fl.arrival?.iata || "";
  const depAirport = getAirport(depIata);
  const arrAirport = getAirport(arrIata);

  const depTime = fl.departure?.scheduled || fl.departure?.estimated || "";
  const arrTime = fl.arrival?.scheduled || fl.arrival?.estimated || "";

  return {
    flightIata: fl.flight?.iata || "",
    airline: {
      name: fl.airline?.name || "",
      iata: fl.airline?.iata || "",
    },
    departure: {
      iata: depIata,
      name: depAirport?.name || fl.departure?.airport || "",
      city: depAirport?.city || "",
      time: extractTime(depTime),
      date: extractDate(depTime),
      terminal: fl.departure?.terminal || "",
      gate: fl.departure?.gate || "",
      lat: depAirport?.lat ?? null,
      lng: depAirport?.lng ?? null,
    },
    arrival: {
      iata: arrIata,
      name: arrAirport?.name || fl.arrival?.airport || "",
      city: arrAirport?.city || "",
      time: extractTime(arrTime),
      date: extractDate(arrTime),
      terminal: fl.arrival?.terminal || "",
      gate: fl.arrival?.gate || "",
      lat: arrAirport?.lat ?? null,
      lng: arrAirport?.lng ?? null,
    },
    status: fl.flight_status || "",
    aircraft: fl.aircraft?.iata || "",
    duration: null,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────

function extractTime(str) {
  if (!str) return "";
  // "2025-06-15T18:30:00+00:00" or "2025-06-15 18:30"
  const m = str.match(/(\d{2}:\d{2})/);
  return m ? m[1] : "";
}

function extractDate(str) {
  if (!str) return "";
  const m = str.match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}

// ─── Flight Track (real GPS path) ─────────────────────────────────────

/**
 * Try to fetch the actual flight path (GPS track).
 * Uses OpenSky Network free API — works for recent flights (last ~30 days).
 * Returns an array of [lat, lng] waypoints, or null if unavailable.
 *
 * For flights currently in the air, AirLabs also provides live lat/lng.
 */
export async function fetchFlightTrack(flightNumber, depIata, arrIata, date) {
  const cleaned = flightNumber.replace(/\s+/g, "").toUpperCase();

  // Strategy 1: Try OpenSky Network state vectors to find ICAO24 transponder code,
  //             then fetch the track. Only works for active/very recent flights.
  try {
    const track = await fetchOpenSkyTrack(cleaned, date);
    if (track && track.length >= 2) return track;
  } catch { /* ignore, try next */ }

  // Strategy 2: If AirLabs is configured and flight is active, it may have live position.
  const cfg = getApiConfig();
  if (cfg.provider === "airlabs" && cfg.apiKey) {
    try {
      const track = await fetchAirLabsLiveTrack(cleaned, cfg.apiKey);
      if (track && track.length >= 2) return track;
    } catch { /* ignore */ }
  }

  return null;
}

/**
 * OpenSky Network: try to get the track for a callsign.
 * The /tracks endpoint needs an ICAO24 hex code, so we first try /states
 * to map callsign → icao24, then fetch /tracks.
 * For historical flights, we try the /flights endpoint.
 */
async function fetchOpenSkyTrack(callsign, date) {
  // Pad callsign to 8 chars (OpenSky format)
  const cs = callsign.padEnd(8);

  // If we have a date, try the historical flights endpoint
  if (date) {
    const begin = Math.floor(new Date(date + "T00:00:00Z").getTime() / 1000);
    const end = begin + 86400; // +24h

    // Get flights for the time range
    const flightsUrl = `https://opensky-network.org/api/flights/all?begin=${begin}&end=${end}`;
    try {
      const resp = await fetch(flightsUrl);
      if (resp.ok) {
        const flights = await resp.json();
        // Find our flight by callsign
        const match = flights.find((f) =>
          f.callsign && f.callsign.trim().toUpperCase() === callsign
        );
        if (match && match.icao24) {
          // Now fetch the track using icao24
          return await fetchOpenSkyTrackByIcao24(match.icao24, begin);
        }
      }
    } catch { /* endpoint may be rate-limited */ }
  }

  // Try real-time states to find currently active flight
  try {
    const statesUrl = `https://opensky-network.org/api/states/all`;
    const resp = await fetch(statesUrl);
    if (resp.ok) {
      const data = await resp.json();
      if (data.states) {
        // State vector: [icao24, callsign, origin_country, ...]
        const match = data.states.find((s) =>
          s[1] && s[1].trim().toUpperCase() === callsign
        );
        if (match) {
          const icao24 = match[0];
          const trackData = await fetchOpenSkyTrackByIcao24(icao24, 0);
          if (trackData) return trackData;

          // At minimum, return current position
          const lat = match[6];
          const lng = match[5];
          if (lat != null && lng != null) {
            return [[lat, lng]];
          }
        }
      }
    }
  } catch { /* ignore */ }

  return null;
}

/**
 * Fetch track waypoints from OpenSky by ICAO24 hex code.
 */
async function fetchOpenSkyTrackByIcao24(icao24, time) {
  const url = `https://opensky-network.org/api/tracks/all?icao24=${encodeURIComponent(icao24)}&time=${time}`;
  const resp = await fetch(url);
  if (!resp.ok) return null;

  const data = await resp.json();
  if (!data.path || data.path.length < 2) return null;

  // path entries: [time, lat, lng, baro_altitude, true_track, on_ground]
  return data.path
    .filter((p) => p[1] != null && p[2] != null && !p[5]) // exclude ground points
    .map((p) => [p[1], p[2]]); // [lat, lng]
}

/**
 * AirLabs: for currently active flights, the /flight endpoint returns
 * live lat/lng. We return it as a single-point "track" (will be combined
 * with departure/arrival for a partial route).
 */
async function fetchAirLabsLiveTrack(flightIata, apiKey) {
  const url = `https://airlabs.co/api/v9/flight?api_key=${encodeURIComponent(apiKey)}&flight_iata=${encodeURIComponent(flightIata)}`;
  const resp = await fetch(url);
  if (!resp.ok) return null;

  const data = await resp.json();
  if (data.error || !data.response) return null;

  const fl = data.response;
  if (fl.lat != null && fl.lng != null) {
    // Return the live position as a waypoint
    return [[fl.lat, fl.lng]];
  }
  return null;
}
