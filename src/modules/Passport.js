import {
  COUNTRIES,
  TOTAL_COUNTRIES,
  ALL_CONTINENTS,
  getCountryByCode,
  getFlagUrl,
} from "./countries.js";
import { getFlightStats } from "./flights.js";

/**
 * Return a traveler rank title based on number of countries visited.
 */
function getTravelerRank(count) {
  if (count === 0) return "Homebody";
  if (count <= 3) return "Beginner";
  if (count <= 8) return "Explorer";
  if (count <= 15) return "Adventurer";
  if (count <= 30) return "Globetrotter";
  if (count <= 50) return "World Traveler";
  if (count <= 80) return "Nomad";
  if (count <= 120) return "Legendary";
  return "World Conqueror";
}

/**
 * Open and populate the passport modal.
 */
export function openPassport(visitedCodes) {
  const modal = document.getElementById("passport-modal");
  const countries = visitedCodes
    .map((c) => getCountryByCode(c))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

  const count = countries.length;
  const percent = ((count / TOTAL_COUNTRIES) * 100).toFixed(1);
  const visitedContinents = [...new Set(countries.map((c) => c.continent))];
  const rank = getTravelerRank(count);

  // Stats
  document.getElementById("p-countries").textContent = count;
  document.getElementById("p-percent").textContent = percent + "%";
  document.getElementById("p-continents").textContent = `${visitedContinents.length}/7`;
  document.getElementById("p-rank").textContent = rank;

  // Flight stats
  const fStats = getFlightStats();
  document.getElementById("p-flights").textContent = fStats.totalFlights;
  document.getElementById("p-distance").textContent = `${fStats.totalDistance.toLocaleString()} km`;

  // Date
  document.getElementById("passport-date").textContent =
    `Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`;

  // Continent badges
  const continentContainer = document.getElementById("passport-continents");
  continentContainer.innerHTML = ALL_CONTINENTS.map((c) => {
    const unlocked = visitedContinents.includes(c);
    return `<span class="continent-badge${unlocked ? " unlocked" : ""}">${unlocked ? "✓ " : ""}${c}</span>`;
  }).join("");

  // Flags
  const flagsContainer = document.getElementById("passport-flags");
  if (count === 0) {
    flagsContainer.innerHTML =
      '<p style="color:var(--text-muted);text-align:center;width:100%;padding:24px 0;">No countries visited yet. Start exploring!</p>';
  } else {
    flagsContainer.innerHTML = countries
      .map(
        (c) =>
          `<div class="passport-flag-item">
            <img class="passport-flag-img" src="${getFlagUrl(c.code, 80)}" alt="${c.name}" title="${c.name}" loading="lazy" />
            <span class="passport-flag-code">${c.code}</span>
          </div>`
      )
      .join("");
  }

  // Show modal
  modal.classList.add("active");
}

export function closePassport() {
  document.getElementById("passport-modal").classList.remove("active");
}

/**
 * Download the passport as a PNG using html2canvas (dynamically loaded).
 */
export async function downloadPassport() {
  // Dynamically load html2canvas if not already present
  if (!window.html2canvas) {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  const passportEl = document.getElementById("passport");
  try {
    const canvas = await window.html2canvas(passportEl, {
      backgroundColor: "#1a1d27",
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
    });

    const link = document.createElement("a");
    link.download = "my-travel-passport.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  } catch (err) {
    console.error("Failed to generate passport image:", err);
    alert("Could not generate passport image. Try again.");
  }
}

/**
 * Copy stats text to clipboard.
 */
export function copyStats(visitedCodes) {
  const countries = visitedCodes
    .map((c) => getCountryByCode(c))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

  const count = countries.length;
  const percent = ((count / TOTAL_COUNTRIES) * 100).toFixed(1);
  const rank = getTravelerRank(count);
  const continents = [...new Set(countries.map((c) => c.continent))];

  const fStats = getFlightStats();
  const text = [
    `🌍 My Travel Passport — WHERE.`,
    ``,
    `📊 ${count} countries visited (${percent}% of the world)`,
    `🗺️ ${continents.length}/7 continents explored`,
    `✈️ ${fStats.totalFlights} flights (${fStats.totalDistance.toLocaleString()} km)`,
    `🏅 Rank: ${rank}`,
    ``,
    `Countries: ${countries.map((c) => `${c.name}`).join(", ")}`,
  ].join("\n");

  navigator.clipboard.writeText(text).then(
    () => {
      const btn = document.getElementById("btn-share");
      const original = btn.innerHTML;
      btn.innerHTML = "✓ Copied!";
      setTimeout(() => (btn.innerHTML = original), 2000);
    },
    () => alert("Could not copy to clipboard.")
  );
}
