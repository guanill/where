/**
 * Flights tracker module — airport-based.
 * Stores flights as { id, fromIATA, toIATA, fromAirportName, toAirportName,
 *   fromCity, toCity, fromCoords, toCoords, date, time, bookingCode,
 *   flightNumber, airline, distance, waypoints? }.
 */

import { getAirport } from "./airports.js";

const STORAGE_KEY = "been_flights";
const R = 6371; // Earth radius in km

let flights = loadFlights();
let nextId = flights.length ? Math.max(...flights.map((f) => f.id)) + 1 : 1;

// ─── Persistence ──────────────────────────────────────────────────────
function loadFlights() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Migrate old country-based flights if needed
    return parsed.map((f) => {
      if (f.fromIATA) return f; // already new format
      return {
        ...f,
        fromIATA: f.from || "",
        toIATA: f.to || "",
        fromAirportName: f.fromName || "",
        toAirportName: f.toName || "",
        fromCity: f.fromName || "",
        toCity: f.toName || "",
        fromCoords: null,
        toCoords: null,
        date: f.date || "",
        time: f.time || "",
        bookingCode: f.bookingCode || "",
        flightNumber: f.flightNumber || "",
        airline: f.airline || "",
        waypoints: f.waypoints || null,
      };
    });
  } catch {
    return [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(flights));
}

// ─── Haversine distance ───────────────────────────────────────────────
function toRad(deg) {
  return (deg * Math.PI) / 180;
}

export function haversine(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Public API ───────────────────────────────────────────────────────

export function getFlights() {
  return [...flights];
}

/**
 * Add a new airport-based flight.
 * @param {{ fromIATA, toIATA, date?, time?, bookingCode?, flightNumber?, airline? }} opts
 */
export function addFlight(opts) {
  const fromAirport = getAirport(opts.fromIATA);
  const toAirport = getAirport(opts.toIATA);
  if (!fromAirport || !toAirport) return null;

  const distance = Math.round(
    haversine(fromAirport.lat, fromAirport.lng, toAirport.lat, toAirport.lng)
  );

  const flight = {
    id: nextId++,
    fromIATA: fromAirport.iata,
    toIATA: toAirport.iata,
    fromAirportName: fromAirport.name,
    toAirportName: toAirport.name,
    fromCity: fromAirport.city,
    toCity: toAirport.city,
    fromCoords: [fromAirport.lat, fromAirport.lng],
    toCoords: [toAirport.lat, toAirport.lng],
    date: opts.date || "",
    time: opts.time || "",
    arrivalTime: opts.arrivalTime || "",
    bookingCode: opts.bookingCode || "",
    flightNumber: opts.flightNumber || "",
    airline: opts.airline || "",
    distance,
    waypoints: null, // filled by flight lookup
  };

  flights.push(flight);
  save();
  return flight;
}

/**
 * Update a flight with looked-up data (e.g., waypoints, airline).
 */
export function updateFlight(id, data) {
  const f = flights.find((fl) => fl.id === id);
  if (!f) return null;
  Object.assign(f, data);
  save();
  return f;
}

export function removeFlight(id) {
  flights = flights.filter((f) => f.id !== id);
  save();
}

export function getFlightStats() {
  const totalFlights = flights.length;
  const totalDistance = flights.reduce((sum, f) => sum + f.distance, 0);
  const uniqueRoutes = new Set(
    flights.map((f) => [f.fromIATA, f.toIATA].sort().join("-"))
  ).size;
  const airports = new Set(
    flights.flatMap((f) => [f.fromIATA, f.toIATA])
  ).size;

  const earthCircumference = 40075;
  const timesAroundEarth = (totalDistance / earthCircumference).toFixed(1);

  return {
    totalFlights,
    totalDistance,
    uniqueRoutes,
    airports,
    timesAroundEarth,
  };
}

/**
 * Generate GeoJSON features for all flights (for D3 rendering).
 * Flights with waypoints produce multi-point LineStrings (real routes).
 * @param {Object} [filter] - Optional filter: { year: "2025" }
 */
export function getFlightArcs(filter) {
  let source = flights;
  if (filter && filter.year && filter.year !== "all") {
    source = flights.filter((f) => f.date && f.date.startsWith(filter.year));
  }
  return source
    .map((f) => {
      const fromAirport = getAirport(f.fromIATA);
      const toAirport = getAirport(f.toIATA);
      // Use stored coords, or look up from DB, or skip
      const fromCoords = f.fromCoords || (fromAirport ? [fromAirport.lat, fromAirport.lng] : null);
      const toCoords = f.toCoords || (toAirport ? [toAirport.lat, toAirport.lng] : null);
      if (!fromCoords || !toCoords) return null;

      // If flight has waypoints (real route), build multi-point line
      let coordinates;
      if (f.waypoints && f.waypoints.length > 0) {
        coordinates = [
          [fromCoords[1], fromCoords[0]],
          ...f.waypoints.map((wp) => [wp[1], wp[0]]),
          [toCoords[1], toCoords[0]],
        ];
      } else {
        coordinates = [
          [fromCoords[1], fromCoords[0]], // [lng, lat]
          [toCoords[1], toCoords[0]],
        ];
      }

      return {
        type: "Feature",
        geometry: { type: "LineString", coordinates },
        properties: {
          id: f.id,
          fromIATA: f.fromIATA,
          toIATA: f.toIATA,
          fromCity: f.fromCity || f.fromAirportName,
          toCity: f.toCity || f.toAirportName,
          distance: f.distance,
          flightNumber: f.flightNumber || "",
          hasWaypoints: !!(f.waypoints && f.waypoints.length),
        },
      };
    })
    .filter(Boolean);
}

/**
 * Try to look up a flight online using AviationStack or similar free API.
 * Returns route info including waypoints if available.
 * Falls back gracefully if API is unavailable.
 */
export async function lookupFlight(flightNumber) {
  if (!flightNumber) return null;
  const cleaned = flightNumber.replace(/\s+/g, "").toUpperCase();

  try {
    const searchUrl = `https://www.flightradar24.com/data/flights/${cleaned.toLowerCase()}`;
    const googleUrl = `https://www.google.com/search?q=flight+${encodeURIComponent(cleaned)}`;

    return {
      flightNumber: cleaned,
      searchUrl,
      googleUrl,
      found: true,
    };
  } catch {
    return null;
  }
}

// ─── Import / Export ──────────────────────────────────────────────────

/**
 * Export all flights as a JSON string.
 */
export function exportFlightsJSON() {
  return JSON.stringify(flights, null, 2);
}

/**
 * Export all flights as CSV text.
 */
export function exportFlightsCSV() {
  const header = "From,To,Date,Departure Time,Arrival Time,Flight Number,Booking Code,Airline,Distance (km)";
  const rows = flights.map((f) =>
    [
      f.fromIATA || f.from || "",
      f.toIATA || f.to || "",
      f.date || "",
      f.time || "",
      f.arrivalTime || "",
      f.flightNumber || "",
      f.bookingCode || "",
      f.airline || "",
      f.distance || "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`) 
      .join(",")
  );
  return [header, ...rows].join("\n");
}

/**
 * Import flights from a JSON array (our own export format).
 * Returns { imported, skipped, errors }.
 */
export function importFlightsJSON(jsonStr) {
  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch {
    return { imported: 0, skipped: 0, errors: ["Invalid JSON"] };
  }
  if (!Array.isArray(data)) {
    return { imported: 0, skipped: 0, errors: ["JSON must be an array of flights"] };
  }
  return importFlightRecords(data);
}

/**
 * Import flights from CSV text.
 * Expected columns: From, To, Date, Time, Flight Number, Booking Code, Airline
 * Returns { imported, skipped, errors }.
 */
export function importFlightsCSV(csvStr) {
  const lines = csvStr.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return { imported: 0, skipped: 0, errors: ["CSV must have a header row and at least one data row"] };
  }

  // Parse header
  const headerRaw = parseCSVLine(lines[0]);
  const header = headerRaw.map((h) => h.toLowerCase().trim());

  // Map column names to indices
  const col = (names) => {
    for (const n of names) {
      const idx = header.findIndex((h) => h.includes(n));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const iFrom = col(["from", "origin", "departure", "dep"]);
  const iTo = col(["to", "destination", "dest", "arrival", "arr"]);
  const iDate = col(["date", "dep date", "departure date", "flight date"]);
  const iTime = col(["dep time", "departure time", "dep_time", "time"]);
  const iArrTime = col(["arr time", "arrival time", "arr_time"]);
  const iFlNum = col(["flight", "flight number", "flight #", "flight no", "flightnumber"]);
  const iBooking = col(["booking", "booking code", "pnr", "confirmation", "ref"]);
  const iAirline = col(["airline", "carrier", "operator"]);

  if (iFrom < 0 || iTo < 0) {
    return { imported: 0, skipped: 0, errors: ['CSV must have "From" and "To" columns with IATA codes'] };
  }

  const records = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = parseCSVLine(lines[i]);
    const from = (cols[iFrom] || "").trim().toUpperCase();
    const to = (cols[iTo] || "").trim().toUpperCase();
    if (!from || !to) {
      errors.push(`Row ${i + 1}: missing From or To`);
      continue;
    }
    records.push({
      fromIATA: from.substring(0, 3),
      toIATA: to.substring(0, 3),
      date: iDate >= 0 ? (cols[iDate] || "").trim() : "",
      time: iTime >= 0 ? (cols[iTime] || "").trim() : "",
      arrivalTime: iArrTime >= 0 ? (cols[iArrTime] || "").trim() : "",
      flightNumber: iFlNum >= 0 ? (cols[iFlNum] || "").trim() : "",
      bookingCode: iBooking >= 0 ? (cols[iBooking] || "").trim() : "",
      airline: iAirline >= 0 ? (cols[iAirline] || "").trim() : "",
    });
  }

  const result = importFlightRecords(records);
  result.errors = [...errors, ...result.errors];
  return result;
}

/**
 * Parse a single CSV line respecting quoted fields.
 */
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

/**
 * Core import: takes an array of flight-like objects and adds them.
 */
function importFlightRecords(records) {
  let imported = 0;
  let skipped = 0;
  const errors = [];

  for (const rec of records) {
    const fromCode = (rec.fromIATA || rec.from || "").toUpperCase().substring(0, 3);
    const toCode = (rec.toIATA || rec.to || "").toUpperCase().substring(0, 3);

    if (!fromCode || !toCode) {
      skipped++;
      continue;
    }

    const fromAirport = getAirport(fromCode);
    const toAirport = getAirport(toCode);

    if (!fromAirport || !toAirport) {
      errors.push(`Unknown airport: ${!fromAirport ? fromCode : ""} ${!toAirport ? toCode : ""}`.trim());
      skipped++;
      continue;
    }

    // Normalise date from various formats
    const date = normaliseDate(rec.date || "");
    const time = (rec.time || "").trim();
    const arrivalTime = (rec.arrivalTime || "").trim();
    const flightNumber = (rec.flightNumber || "").trim();
    const bookingCode = (rec.bookingCode || "").trim();
    const airline = (rec.airline || "").trim();

    const result = addFlight({
      fromIATA: fromCode,
      toIATA: toCode,
      date,
      time,
      arrivalTime,
      flightNumber,
      bookingCode,
      airline,
    });

    if (result) {
      // Carry over waypoints if provided
      if (rec.waypoints && Array.isArray(rec.waypoints)) {
        updateFlight(result.id, { waypoints: rec.waypoints });
      }
      imported++;
    } else {
      skipped++;
    }
  }

  return { imported, skipped, errors };
}

/**
 * Attempt to normalise various date string formats to YYYY-MM-DD.
 */
function normaliseDate(str) {
  if (!str) return "";
  const s = str.trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmy = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // MM/DD/YYYY (US style) — try parsing with Date
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split("T")[0];
    }
  } catch { /* ignore */ }

  return s;
}

/**
 * Try to fetch the real route (waypoints) for a flight from OpenSky Network.
 * Uses their free /api/routes endpoint with callsign.
 * Returns array of [lat, lng] waypoints on success, or null.
 */
export async function fetchFlightRoute(flightNumber) {
  if (!flightNumber) return null;
  const callsign = flightNumber.replace(/\s+/g, "").toUpperCase();

  try {
    // OpenSky has a routes API: /api/routes?callsign=XXX
    const resp = await fetch(
      `https://opensky-network.org/api/routes?callsign=${encodeURIComponent(callsign)}`
    );
    if (!resp.ok) return null;
    const data = await resp.json();

    // The route field gives airport IATA codes in the path
    // e.g. ["KJFK", "EGLL"] or ["KJFK", "KORD", "EGLL"]
    if (data.route && data.route.length >= 2) {
      // Convert ICAO to intermediate airport lookup
      return {
        routeCodes: data.route,  // ICAO codes
        operator: data.operatorIata || data.callsign || callsign,
        flightNumber: data.callsign || callsign,
      };
    }
    return null;
  } catch {
    return null;
  }
}
