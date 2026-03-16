/**
 * Airline IATA code → name mapping for flight insights.
 * Covers major worldwide airlines.
 */

const AIRLINES = {
  // North America
  AA: "American Airlines",
  DL: "Delta Air Lines",
  UA: "United Airlines",
  WN: "Southwest Airlines",
  B6: "JetBlue Airways",
  AS: "Alaska Airlines",
  NK: "Spirit Airlines",
  F9: "Frontier Airlines",
  G4: "Allegiant Air",
  HA: "Hawaiian Airlines",
  SY: "Sun Country Airlines",
  AC: "Air Canada",
  WS: "WestJet",
  TS: "Air Transat",
  PD: "Porter Airlines",
  AM: "Aeromexico",
  "4O": "Interjet",
  Y4: "Volaris",
  VB: "VivaAerobus",

  // Europe
  BA: "British Airways",
  LH: "Lufthansa",
  AF: "Air France",
  KL: "KLM Royal Dutch",
  IB: "Iberia",
  AZ: "ITA Airways",
  SK: "SAS Scandinavian",
  AY: "Finnair",
  LX: "Swiss International",
  OS: "Austrian Airlines",
  SN: "Brussels Airlines",
  TP: "TAP Air Portugal",
  EI: "Aer Lingus",
  LO: "LOT Polish Airlines",
  OK: "Czech Airlines",
  RO: "TAROM",
  BT: "airBaltic",
  OU: "Croatia Airlines",
  JU: "Air Serbia",
  A3: "Aegean Airlines",
  OA: "Olympic Air",
  BJ: "Nouvelair",

  // Low-cost Europe
  FR: "Ryanair",
  U2: "easyJet",
  W6: "Wizz Air",
  VY: "Vueling",
  DY: "Norwegian",
  HV: "Transavia",
  LS: "Jet2",
  QS: "SmartWings",
  PC: "Pegasus Airlines",
  XQ: "SunExpress",
  TO: "Transavia France",
  V7: "Volotea",
  "0B": "Blue Air",

  // Middle East
  EK: "Emirates",
  QR: "Qatar Airways",
  EY: "Etihad Airways",
  TK: "Turkish Airlines",
  SV: "Saudia",
  GF: "Gulf Air",
  WY: "Oman Air",
  RJ: "Royal Jordanian",
  MS: "EgyptAir",
  ME: "Middle East Airlines",
  KU: "Kuwait Airways",
  XY: "flynas",
  G9: "Air Arabia",

  // Asia
  SQ: "Singapore Airlines",
  CX: "Cathay Pacific",
  NH: "ANA All Nippon",
  JL: "Japan Airlines",
  KE: "Korean Air",
  OZ: "Asiana Airlines",
  TG: "Thai Airways",
  GA: "Garuda Indonesia",
  MH: "Malaysia Airlines",
  PR: "Philippine Airlines",
  VN: "Vietnam Airlines",
  AI: "Air India",
  CI: "China Airlines",
  BR: "EVA Air",
  CA: "Air China",
  MU: "China Eastern",
  CZ: "China Southern",
  HU: "Hainan Airlines",
  "3U": "Sichuan Airlines",
  FM: "Shanghai Airlines",
  UO: "Hong Kong Express",
  TR: "Scoot",
  AK: "AirAsia",
  FD: "Thai AirAsia",
  QZ: "Indonesia AirAsia",
  D7: "AirAsia X",
  SL: "Thai Lion Air",
  JT: "Lion Air",
  "5J": "Cebu Pacific",
  MM: "Peach Aviation",
  GK: "Jetstar Japan",
  TW: "T'way Air",
  LJ: "Jin Air",
  "7C": "Jeju Air",
  IT: "Tigerair Taiwan",
  BI: "Royal Brunei",
  UL: "SriLankan Airlines",
  PG: "Bangkok Airways",

  // Oceania
  QF: "Qantas",
  VA: "Virgin Australia",
  NZ: "Air New Zealand",
  JQ: "Jetstar",
  FJ: "Fiji Airways",

  // Latin America / Caribbean
  LA: "LATAM Airlines",
  AV: "Avianca",
  CM: "Copa Airlines",
  G3: "Gol Linhas Aéreas",
  AD: "Azul Brazilian",
  AR: "Aerolíneas Argentinas",
  JA: "JetSMART",
  H2: "Sky Airline",
  "4C": "LATAM Colombia",
  BW: "Caribbean Airlines",
  LR: "LACSA / Avianca CR",

  // Africa
  ET: "Ethiopian Airlines",
  SA: "South African Airways",
  KQ: "Kenya Airways",
  AT: "Royal Air Maroc",
  RW: "RwandAir",
  WB: "RwandAir",
  TC: "Air Tanzania",
  UM: "Air Zimbabwe",

  // Cargo/Other (commonly seen on codes)
  FX: "FedEx Express",
  "5X": "UPS Airlines",
};

/**
 * Extract the airline IATA code from a flight number.
 * Flight numbers typically start with 2-3 letter airline code followed by digits.
 * Examples: AA1234 → AA, DL567 → DL, U2123 → U2
 */
export function extractAirlineCode(flightNumber) {
  if (!flightNumber) return null;
  const cleaned = flightNumber.replace(/\s+/g, "").toUpperCase();
  // Match 1-3 alphanumeric prefix before the digits
  const match = cleaned.match(/^([A-Z0-9]{2,3}?)(\d+)/);
  if (match) return match[1];
  return null;
}

/**
 * Get the airline name for a given IATA code.
 */
export function getAirlineName(code) {
  if (!code) return null;
  return AIRLINES[code.toUpperCase()] || null;
}

/**
 * Get airline info from a flight number.
 * Returns { code, name } or null.
 */
export function getAirlineFromFlightNumber(flightNumber) {
  const code = extractAirlineCode(flightNumber);
  if (!code) return null;
  const name = getAirlineName(code);
  return { code, name: name || `Unknown (${code})` };
}
