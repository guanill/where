// Full list of world countries AND territories with ISO-3166-1 alpha-2 codes,
// numeric ids (matching Natural Earth / TopoJSON feature ids), and continent.

export const COUNTRIES = [
  // ─── Sovereign States ──────────────────────────────────────────────
  { id: "004", code: "AF", name: "Afghanistan", continent: "Asia" },
  { id: "008", code: "AL", name: "Albania", continent: "Europe" },
  { id: "012", code: "DZ", name: "Algeria", continent: "Africa" },
  { id: "020", code: "AD", name: "Andorra", continent: "Europe" },
  { id: "024", code: "AO", name: "Angola", continent: "Africa" },
  { id: "028", code: "AG", name: "Antigua and Barbuda", continent: "North America" },
  { id: "032", code: "AR", name: "Argentina", continent: "South America" },
  { id: "051", code: "AM", name: "Armenia", continent: "Asia" },
  { id: "036", code: "AU", name: "Australia", continent: "Oceania" },
  { id: "040", code: "AT", name: "Austria", continent: "Europe" },
  { id: "031", code: "AZ", name: "Azerbaijan", continent: "Asia" },
  { id: "044", code: "BS", name: "Bahamas", continent: "North America" },
  { id: "048", code: "BH", name: "Bahrain", continent: "Asia" },
  { id: "050", code: "BD", name: "Bangladesh", continent: "Asia" },
  { id: "052", code: "BB", name: "Barbados", continent: "North America" },
  { id: "112", code: "BY", name: "Belarus", continent: "Europe" },
  { id: "056", code: "BE", name: "Belgium", continent: "Europe" },
  { id: "084", code: "BZ", name: "Belize", continent: "North America" },
  { id: "204", code: "BJ", name: "Benin", continent: "Africa" },
  { id: "064", code: "BT", name: "Bhutan", continent: "Asia" },
  { id: "068", code: "BO", name: "Bolivia", continent: "South America" },
  { id: "070", code: "BA", name: "Bosnia and Herzegovina", continent: "Europe" },
  { id: "072", code: "BW", name: "Botswana", continent: "Africa" },
  { id: "076", code: "BR", name: "Brazil", continent: "South America" },
  { id: "096", code: "BN", name: "Brunei", continent: "Asia" },
  { id: "100", code: "BG", name: "Bulgaria", continent: "Europe" },
  { id: "854", code: "BF", name: "Burkina Faso", continent: "Africa" },
  { id: "108", code: "BI", name: "Burundi", continent: "Africa" },
  { id: "132", code: "CV", name: "Cabo Verde", continent: "Africa" },
  { id: "116", code: "KH", name: "Cambodia", continent: "Asia" },
  { id: "120", code: "CM", name: "Cameroon", continent: "Africa" },
  { id: "124", code: "CA", name: "Canada", continent: "North America" },
  { id: "140", code: "CF", name: "Central African Republic", continent: "Africa" },
  { id: "148", code: "TD", name: "Chad", continent: "Africa" },
  { id: "152", code: "CL", name: "Chile", continent: "South America" },
  { id: "156", code: "CN", name: "China", continent: "Asia" },
  { id: "170", code: "CO", name: "Colombia", continent: "South America" },
  { id: "174", code: "KM", name: "Comoros", continent: "Africa" },
  { id: "178", code: "CG", name: "Congo", continent: "Africa" },
  { id: "180", code: "CD", name: "Democratic Republic of the Congo", continent: "Africa" },
  { id: "188", code: "CR", name: "Costa Rica", continent: "North America" },
  { id: "384", code: "CI", name: "Côte d'Ivoire", continent: "Africa" },
  { id: "191", code: "HR", name: "Croatia", continent: "Europe" },
  { id: "192", code: "CU", name: "Cuba", continent: "North America" },
  { id: "196", code: "CY", name: "Cyprus", continent: "Europe" },
  { id: "203", code: "CZ", name: "Czech Republic", continent: "Europe" },
  { id: "208", code: "DK", name: "Denmark", continent: "Europe" },
  { id: "262", code: "DJ", name: "Djibouti", continent: "Africa" },
  { id: "212", code: "DM", name: "Dominica", continent: "North America" },
  { id: "214", code: "DO", name: "Dominican Republic", continent: "North America" },
  { id: "218", code: "EC", name: "Ecuador", continent: "South America" },
  { id: "818", code: "EG", name: "Egypt", continent: "Africa" },
  { id: "222", code: "SV", name: "El Salvador", continent: "North America" },
  { id: "226", code: "GQ", name: "Equatorial Guinea", continent: "Africa" },
  { id: "232", code: "ER", name: "Eritrea", continent: "Africa" },
  { id: "233", code: "EE", name: "Estonia", continent: "Europe" },
  { id: "748", code: "SZ", name: "Eswatini", continent: "Africa" },
  { id: "231", code: "ET", name: "Ethiopia", continent: "Africa" },
  { id: "242", code: "FJ", name: "Fiji", continent: "Oceania" },
  { id: "246", code: "FI", name: "Finland", continent: "Europe" },
  { id: "250", code: "FR", name: "France", continent: "Europe" },
  { id: "266", code: "GA", name: "Gabon", continent: "Africa" },
  { id: "270", code: "GM", name: "Gambia", continent: "Africa" },
  { id: "268", code: "GE", name: "Georgia", continent: "Asia" },
  { id: "276", code: "DE", name: "Germany", continent: "Europe" },
  { id: "288", code: "GH", name: "Ghana", continent: "Africa" },
  { id: "300", code: "GR", name: "Greece", continent: "Europe" },
  { id: "308", code: "GD", name: "Grenada", continent: "North America" },
  { id: "320", code: "GT", name: "Guatemala", continent: "North America" },
  { id: "324", code: "GN", name: "Guinea", continent: "Africa" },
  { id: "624", code: "GW", name: "Guinea-Bissau", continent: "Africa" },
  { id: "328", code: "GY", name: "Guyana", continent: "South America" },
  { id: "332", code: "HT", name: "Haiti", continent: "North America" },
  { id: "340", code: "HN", name: "Honduras", continent: "North America" },
  { id: "348", code: "HU", name: "Hungary", continent: "Europe" },
  { id: "352", code: "IS", name: "Iceland", continent: "Europe" },
  { id: "356", code: "IN", name: "India", continent: "Asia" },
  { id: "360", code: "ID", name: "Indonesia", continent: "Asia" },
  { id: "364", code: "IR", name: "Iran", continent: "Asia" },
  { id: "368", code: "IQ", name: "Iraq", continent: "Asia" },
  { id: "372", code: "IE", name: "Ireland", continent: "Europe" },
  { id: "376", code: "IL", name: "Israel", continent: "Asia" },
  { id: "380", code: "IT", name: "Italy", continent: "Europe" },
  { id: "388", code: "JM", name: "Jamaica", continent: "North America" },
  { id: "392", code: "JP", name: "Japan", continent: "Asia" },
  { id: "400", code: "JO", name: "Jordan", continent: "Asia" },
  { id: "398", code: "KZ", name: "Kazakhstan", continent: "Asia" },
  { id: "404", code: "KE", name: "Kenya", continent: "Africa" },
  { id: "296", code: "KI", name: "Kiribati", continent: "Oceania" },
  { id: "408", code: "KP", name: "North Korea", continent: "Asia" },
  { id: "410", code: "KR", name: "South Korea", continent: "Asia" },
  { id: "414", code: "KW", name: "Kuwait", continent: "Asia" },
  { id: "417", code: "KG", name: "Kyrgyzstan", continent: "Asia" },
  { id: "418", code: "LA", name: "Laos", continent: "Asia" },
  { id: "428", code: "LV", name: "Latvia", continent: "Europe" },
  { id: "422", code: "LB", name: "Lebanon", continent: "Asia" },
  { id: "426", code: "LS", name: "Lesotho", continent: "Africa" },
  { id: "430", code: "LR", name: "Liberia", continent: "Africa" },
  { id: "434", code: "LY", name: "Libya", continent: "Africa" },
  { id: "438", code: "LI", name: "Liechtenstein", continent: "Europe" },
  { id: "440", code: "LT", name: "Lithuania", continent: "Europe" },
  { id: "442", code: "LU", name: "Luxembourg", continent: "Europe" },
  { id: "450", code: "MG", name: "Madagascar", continent: "Africa" },
  { id: "454", code: "MW", name: "Malawi", continent: "Africa" },
  { id: "458", code: "MY", name: "Malaysia", continent: "Asia" },
  { id: "462", code: "MV", name: "Maldives", continent: "Asia" },
  { id: "466", code: "ML", name: "Mali", continent: "Africa" },
  { id: "470", code: "MT", name: "Malta", continent: "Europe" },
  { id: "584", code: "MH", name: "Marshall Islands", continent: "Oceania" },
  { id: "478", code: "MR", name: "Mauritania", continent: "Africa" },
  { id: "480", code: "MU", name: "Mauritius", continent: "Africa" },
  { id: "484", code: "MX", name: "Mexico", continent: "North America" },
  { id: "583", code: "FM", name: "Micronesia", continent: "Oceania" },
  { id: "498", code: "MD", name: "Moldova", continent: "Europe" },
  { id: "492", code: "MC", name: "Monaco", continent: "Europe" },
  { id: "496", code: "MN", name: "Mongolia", continent: "Asia" },
  { id: "499", code: "ME", name: "Montenegro", continent: "Europe" },
  { id: "504", code: "MA", name: "Morocco", continent: "Africa" },
  { id: "508", code: "MZ", name: "Mozambique", continent: "Africa" },
  { id: "104", code: "MM", name: "Myanmar", continent: "Asia" },
  { id: "516", code: "NA", name: "Namibia", continent: "Africa" },
  { id: "520", code: "NR", name: "Nauru", continent: "Oceania" },
  { id: "524", code: "NP", name: "Nepal", continent: "Asia" },
  { id: "528", code: "NL", name: "Netherlands", continent: "Europe" },
  { id: "554", code: "NZ", name: "New Zealand", continent: "Oceania" },
  { id: "558", code: "NI", name: "Nicaragua", continent: "North America" },
  { id: "562", code: "NE", name: "Niger", continent: "Africa" },
  { id: "566", code: "NG", name: "Nigeria", continent: "Africa" },
  { id: "807", code: "MK", name: "North Macedonia", continent: "Europe" },
  { id: "578", code: "NO", name: "Norway", continent: "Europe" },
  { id: "512", code: "OM", name: "Oman", continent: "Asia" },
  { id: "586", code: "PK", name: "Pakistan", continent: "Asia" },
  { id: "585", code: "PW", name: "Palau", continent: "Oceania" },
  { id: "591", code: "PA", name: "Panama", continent: "North America" },
  { id: "598", code: "PG", name: "Papua New Guinea", continent: "Oceania" },
  { id: "600", code: "PY", name: "Paraguay", continent: "South America" },
  { id: "604", code: "PE", name: "Peru", continent: "South America" },
  { id: "608", code: "PH", name: "Philippines", continent: "Asia" },
  { id: "616", code: "PL", name: "Poland", continent: "Europe" },
  { id: "620", code: "PT", name: "Portugal", continent: "Europe" },
  { id: "634", code: "QA", name: "Qatar", continent: "Asia" },
  { id: "642", code: "RO", name: "Romania", continent: "Europe" },
  { id: "643", code: "RU", name: "Russia", continent: "Europe" },
  { id: "646", code: "RW", name: "Rwanda", continent: "Africa" },
  { id: "659", code: "KN", name: "Saint Kitts and Nevis", continent: "North America" },
  { id: "662", code: "LC", name: "Saint Lucia", continent: "North America" },
  { id: "670", code: "VC", name: "Saint Vincent and the Grenadines", continent: "North America" },
  { id: "882", code: "WS", name: "Samoa", continent: "Oceania" },
  { id: "674", code: "SM", name: "San Marino", continent: "Europe" },
  { id: "678", code: "ST", name: "São Tomé and Príncipe", continent: "Africa" },
  { id: "682", code: "SA", name: "Saudi Arabia", continent: "Asia" },
  { id: "686", code: "SN", name: "Senegal", continent: "Africa" },
  { id: "688", code: "RS", name: "Serbia", continent: "Europe" },
  { id: "690", code: "SC", name: "Seychelles", continent: "Africa" },
  { id: "694", code: "SL", name: "Sierra Leone", continent: "Africa" },
  { id: "702", code: "SG", name: "Singapore", continent: "Asia" },
  { id: "703", code: "SK", name: "Slovakia", continent: "Europe" },
  { id: "705", code: "SI", name: "Slovenia", continent: "Europe" },
  { id: "090", code: "SB", name: "Solomon Islands", continent: "Oceania" },
  { id: "706", code: "SO", name: "Somalia", continent: "Africa" },
  { id: "710", code: "ZA", name: "South Africa", continent: "Africa" },
  { id: "728", code: "SS", name: "South Sudan", continent: "Africa" },
  { id: "724", code: "ES", name: "Spain", continent: "Europe" },
  { id: "144", code: "LK", name: "Sri Lanka", continent: "Asia" },
  { id: "275", code: "PS", name: "Palestine", continent: "Asia" },
  { id: "729", code: "SD", name: "Sudan", continent: "Africa" },
  { id: "740", code: "SR", name: "Suriname", continent: "South America" },
  { id: "752", code: "SE", name: "Sweden", continent: "Europe" },
  { id: "756", code: "CH", name: "Switzerland", continent: "Europe" },
  { id: "760", code: "SY", name: "Syria", continent: "Asia" },
  { id: "158", code: "TW", name: "Taiwan", continent: "Asia" },
  { id: "762", code: "TJ", name: "Tajikistan", continent: "Asia" },
  { id: "834", code: "TZ", name: "Tanzania", continent: "Africa" },
  { id: "764", code: "TH", name: "Thailand", continent: "Asia" },
  { id: "626", code: "TL", name: "Timor-Leste", continent: "Asia" },
  { id: "768", code: "TG", name: "Togo", continent: "Africa" },
  { id: "776", code: "TO", name: "Tonga", continent: "Oceania" },
  { id: "780", code: "TT", name: "Trinidad and Tobago", continent: "North America" },
  { id: "788", code: "TN", name: "Tunisia", continent: "Africa" },
  { id: "792", code: "TR", name: "Turkey", continent: "Asia" },
  { id: "795", code: "TM", name: "Turkmenistan", continent: "Asia" },
  { id: "798", code: "TV", name: "Tuvalu", continent: "Oceania" },
  { id: "800", code: "UG", name: "Uganda", continent: "Africa" },
  { id: "804", code: "UA", name: "Ukraine", continent: "Europe" },
  { id: "784", code: "AE", name: "United Arab Emirates", continent: "Asia" },
  { id: "826", code: "GB", name: "United Kingdom", continent: "Europe" },
  { id: "840", code: "US", name: "United States", continent: "North America" },
  { id: "858", code: "UY", name: "Uruguay", continent: "South America" },
  { id: "860", code: "UZ", name: "Uzbekistan", continent: "Asia" },
  { id: "548", code: "VU", name: "Vanuatu", continent: "Oceania" },
  { id: "336", code: "VA", name: "Vatican City", continent: "Europe" },
  { id: "862", code: "VE", name: "Venezuela", continent: "South America" },
  { id: "704", code: "VN", name: "Vietnam", continent: "Asia" },
  { id: "887", code: "YE", name: "Yemen", continent: "Asia" },
  { id: "894", code: "ZM", name: "Zambia", continent: "Africa" },
  { id: "716", code: "ZW", name: "Zimbabwe", continent: "Africa" },
  { id: "-99", code: "XK", name: "Kosovo", continent: "Europe" },

  // ─── Territories & Dependencies ────────────────────────────────────
  // Americas
  { id: "630", code: "PR", name: "Puerto Rico", continent: "North America", territory: true },
  { id: "850", code: "VI", name: "U.S. Virgin Islands", continent: "North America", territory: true },
  { id: "316", code: "GU", name: "Guam", continent: "Oceania", territory: true },
  { id: "016", code: "AS", name: "American Samoa", continent: "Oceania", territory: true },
  { id: "580", code: "MP", name: "Northern Mariana Islands", continent: "Oceania", territory: true },
  { id: "060", code: "BM", name: "Bermuda", continent: "North America", territory: true },
  { id: "136", code: "KY", name: "Cayman Islands", continent: "North America", territory: true },
  { id: "796", code: "TC", name: "Turks and Caicos Islands", continent: "North America", territory: true },
  { id: "092", code: "VG", name: "British Virgin Islands", continent: "North America", territory: true },
  { id: "533", code: "AW", name: "Aruba", continent: "North America", territory: true },
  { id: "531", code: "CW", name: "Curaçao", continent: "North America", territory: true },
  { id: "534", code: "SX", name: "Sint Maarten", continent: "North America", territory: true },
  { id: "254", code: "GF", name: "French Guiana", continent: "South America", territory: true },
  { id: "312", code: "GP", name: "Guadeloupe", continent: "North America", territory: true },
  { id: "474", code: "MQ", name: "Martinique", continent: "North America", territory: true },
  { id: "652", code: "BL", name: "Saint Barthélemy", continent: "North America", territory: true },
  { id: "663", code: "MF", name: "Saint Martin", continent: "North America", territory: true },
  { id: "666", code: "PM", name: "Saint Pierre and Miquelon", continent: "North America", territory: true },
  { id: "238", code: "FK", name: "Falkland Islands", continent: "South America", territory: true },
  { id: "239", code: "GS", name: "South Georgia", continent: "South America", territory: true },

  // Europe
  { id: "304", code: "GL", name: "Greenland", continent: "North America", territory: true },
  { id: "234", code: "FO", name: "Faroe Islands", continent: "Europe", territory: true },
  { id: "292", code: "GI", name: "Gibraltar", continent: "Europe", territory: true },
  { id: "833", code: "IM", name: "Isle of Man", continent: "Europe", territory: true },
  { id: "832", code: "JE", name: "Jersey", continent: "Europe", territory: true },
  { id: "831", code: "GG", name: "Guernsey", continent: "Europe", territory: true },
  { id: "248", code: "AX", name: "Åland Islands", continent: "Europe", territory: true },
  { id: "744", code: "SJ", name: "Svalbard", continent: "Europe", territory: true },

  // Asia
  { id: "344", code: "HK", name: "Hong Kong", continent: "Asia", territory: true },
  { id: "446", code: "MO", name: "Macau", continent: "Asia", territory: true },

  // Africa & Indian Ocean
  { id: "638", code: "RE", name: "Réunion", continent: "Africa", territory: true },
  { id: "175", code: "YT", name: "Mayotte", continent: "Africa", territory: true },
  { id: "654", code: "SH", name: "Saint Helena", continent: "Africa", territory: true },
  { id: "732", code: "EH", name: "Western Sahara", continent: "Africa", territory: true },

  // Oceania / Pacific
  { id: "258", code: "PF", name: "French Polynesia", continent: "Oceania", territory: true },
  { id: "540", code: "NC", name: "New Caledonia", continent: "Oceania", territory: true },
  { id: "876", code: "WF", name: "Wallis and Futuna", continent: "Oceania", territory: true },
  { id: "184", code: "CK", name: "Cook Islands", continent: "Oceania", territory: true },
  { id: "570", code: "NU", name: "Niue", continent: "Oceania", territory: true },
  { id: "772", code: "TK", name: "Tokelau", continent: "Oceania", territory: true },
  { id: "574", code: "NF", name: "Norfolk Island", continent: "Oceania", territory: true },
  { id: "162", code: "CX", name: "Christmas Island", continent: "Oceania", territory: true },
  { id: "166", code: "CC", name: "Cocos (Keeling) Islands", continent: "Oceania", territory: true },
  { id: "612", code: "PN", name: "Pitcairn Islands", continent: "Oceania", territory: true },

  // Antarctica
  { id: "010", code: "AQ", name: "Antarctica", continent: "Antarctica", territory: true },
];

export const ALL_CONTINENTS = [
  "Africa",
  "Asia",
  "Europe",
  "North America",
  "Oceania",
  "South America",
  "Antarctica",
];

export const TOTAL_COUNTRIES = COUNTRIES.length;

/**
 * Get flag image URL for a country code (uses flagcdn.com)
 */
export function getFlagUrl(code, size = 64) {
  // Use width-based format with closest supported size
  const widths = [20, 40, 80, 160, 320, 640];
  const w = widths.find((v) => v >= size) || 320;
  return `https://flagcdn.com/w${w}/${code.toLowerCase()}.png`;
}

/**
 * Get the large flag SVG URL
 */
export function getFlagSvg(code) {
  return `https://flagcdn.com/${code.toLowerCase()}.svg`;
}

/**
 * Lookup a country by its numeric id (used by TopoJSON)
 */
export function getCountryById(numericId) {
  const id = String(numericId).padStart(3, "0");
  return COUNTRIES.find((c) => c.id === id) || null;
}

/**
 * Lookup a country by its alpha-2 code
 */
export function getCountryByCode(code) {
  return COUNTRIES.find((c) => c.code === code.toUpperCase()) || null;
}

/**
 * Search countries by name (fuzzy)
 */
export function searchCountries(query) {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 15);
}
