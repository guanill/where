import { getCountryById, getFlagUrl } from "./countries.js";
import { LANDMARKS, getLandmarkIconUrl } from "./landmarks.js";
import { getCachedImageUrl, fetchLandmarkImage } from "./landmark-images.js";
import { getFlightArcs } from "./flights.js";
import { getPhotos, removePhoto, loadVideoBlob } from "./photos.js";

const WORLD_TOPO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";

// ─── Photo Story Viewer ────────────────────────────────────────────────
const storyViewer = (() => {
  const el        = document.getElementById("story-viewer");
  const backdrop  = document.getElementById("story-backdrop");
  const closeBtn  = document.getElementById("story-close");
  const deleteBtn = document.getElementById("story-delete");
  const confirmEl  = document.getElementById("story-confirm");
  const confirmMsg = document.getElementById("story-confirm-msg");
  const confirmDel = document.getElementById("story-confirm-delete");
  const confirmCan = document.getElementById("story-confirm-cancel");
  const prevZone  = document.getElementById("story-prev");
  const nextZone  = document.getElementById("story-next");
  const progressC = document.getElementById("story-progress");
  const imgEl     = document.getElementById("story-img");
  const videoEl   = document.getElementById("story-video");
  const metaEl    = document.getElementById("story-meta");
  const counterEl = document.getElementById("story-counter");
  const contentEl = document.getElementById("story-content");

  let photos = [];
  let idx = 0;
  let onDeleteCb = null;
  let currentVideoUrl = null;   // track object URL to revoke

  function open(photoList, startIdx = 0) {
    // Sort chronologically (oldest first); undated go to end
    photos = [...photoList].sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });
    idx = Math.min(startIdx, photos.length - 1);
    el.classList.remove("hidden");
    buildProgressBars();
    show();
    document.addEventListener("keydown", onKey);
  }

  function close() {
    el.classList.add("hidden");
    document.removeEventListener("keydown", onKey);
    revokeVideoUrl();
    if (videoEl) { videoEl.pause(); videoEl.removeAttribute("src"); videoEl.load(); }
  }

  function revokeVideoUrl() {
    if (currentVideoUrl) { URL.revokeObjectURL(currentVideoUrl); currentVideoUrl = null; }
  }

  function buildProgressBars() {
    progressC.innerHTML = "";
    photos.forEach(() => {
      const bar = document.createElement("div");
      bar.className = "story-progress-bar";
      bar.innerHTML = '<div class="fill"></div>';
      progressC.appendChild(bar);
    });
  }

  function show() {
    if (!photos.length) { close(); return; }
    const p = photos[idx];
    const isVideo = p.type === "video";
    // Progress bars
    const bars = progressC.children;
    for (let i = 0; i < bars.length; i++) {
      bars[i].classList.toggle("done", i < idx);
      bars[i].classList.toggle("active", i === idx);
    }

    // Clean up previous video
    revokeVideoUrl();
    if (videoEl) { videoEl.pause(); videoEl.style.display = "none"; videoEl.removeAttribute("src"); }

    // Remove "no preview" placeholder if present
    contentEl.querySelector(".story-no-thumb")?.remove();

    if (isVideo) {
      // Hide image, show video
      imgEl.style.display = "none";
      loadVideoBlob(p.id).then(blob => {
        if (!blob || photos[idx]?.id !== p.id) return; // user navigated away
        currentVideoUrl = URL.createObjectURL(blob);
        videoEl.src = currentVideoUrl;
        videoEl.style.display = "";
        videoEl.style.animation = "none";
        videoEl.offsetHeight;
        videoEl.style.animation = "";
      });
    } else if (p.thumb) {
      imgEl.style.display = "";
      imgEl.src = p.thumb;
      imgEl.style.animation = "none";
      imgEl.offsetHeight;
      imgEl.style.animation = "";
    } else {
      imgEl.style.display = "none";
      const ph = document.createElement("div");
      ph.className = "story-no-thumb";
      ph.innerHTML = '<span class="story-no-thumb-icon">📷</span><span class="story-no-thumb-text">No preview available</span>';
      contentEl.insertBefore(ph, metaEl);
    }

    // Meta
    const icon = isVideo ? "🎥" : "📷";
    const dateLine = p.date ? `<div class="story-meta-date">${formatDate(p.date)}</div>` : "";
    const locLine = `<div class="story-meta-loc">${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}</div>`;
    metaEl.innerHTML = `<div class="story-meta-name">${icon} ${escHtml(p.name)}</div>${dateLine}${locLine}`;

    // Counter
    counterEl.textContent = `${idx + 1} / ${photos.length}`;
  }

  function deleteCurrent() {
    if (!photos.length) return;
    const p = photos[idx];
    confirmMsg.textContent = `Delete "${p.name}"?`;
    confirmEl.classList.remove("hidden");

    function cleanup() {
      confirmEl.classList.add("hidden");
      confirmDel.removeEventListener("click", onDel);
      confirmCan.removeEventListener("click", onCan);
    }
    function onDel() {
      cleanup();
      removePhoto(p.id);
      photos.splice(idx, 1);
      if (idx >= photos.length) idx = Math.max(0, photos.length - 1);
      buildProgressBars();
      show();
      if (onDeleteCb) onDeleteCb();
    }
    function onCan() { cleanup(); }

    confirmDel.addEventListener("click", onDel);
    confirmCan.addEventListener("click", onCan);
  }

  function go(dir) {
    idx = Math.max(0, Math.min(photos.length - 1, idx + dir));
    show();
  }

  function onKey(e) {
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight" || e.key === "ArrowDown") go(1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") go(-1);
    else if (e.key === "Delete") deleteCurrent();
  }

  // Helpers
  function escHtml(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
  function formatDate(iso) {
    try { return new Date(iso + "T00:00:00").toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
    catch { return iso; }
  }

  // Bind DOM events
  closeBtn.addEventListener("click", close);
  backdrop.addEventListener("click", close);
  prevZone.addEventListener("click", () => go(-1));
  nextZone.addEventListener("click", () => go(1));
  deleteBtn.addEventListener("click", deleteCurrent);

  // Touch swipe support
  let touchStartX = 0;
  contentEl.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  contentEl.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
  }, { passive: true });

  return { open, close, set onDelete(fn) { onDeleteCb = fn; } };
})();

/**
 * Initialise the D3 world map inside the given container.
 * Returns an API object for controlling map layers.
 */
export function initMap({ container, svgEl, tooltip, onCountryClick }) {
  let width = container.clientWidth || 960;
  let height = container.clientHeight || 500;

  const svg = d3
    .select(svgEl)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const g = svg.append("g");

  // SVG filters for glow effects
  const defs = svg.append("defs");
  const flightGlow = defs.append("filter").attr("id", "flight-glow");
  flightGlow.append("feGaussianBlur").attr("stdDeviation", "2").attr("result", "blur");
  const feMerge = flightGlow.append("feMerge");
  feMerge.append("feMergeNode").attr("in", "blur");
  feMerge.append("feMergeNode").attr("in", "SourceGraphic");

  // Story-ring gradient (Instagram-like) for photo clusters
  const storyGrad = defs.append("linearGradient")
    .attr("id", "story-gradient")
    .attr("x1", "0%").attr("y1", "100%")
    .attr("x2", "100%").attr("y2", "0%");
  storyGrad.append("stop").attr("offset", "0%").attr("stop-color", "#f58529");
  storyGrad.append("stop").attr("offset", "33%").attr("stop-color", "#dd2a7b");
  storyGrad.append("stop").attr("offset", "66%").attr("stop-color", "#8134af");
  storyGrad.append("stop").attr("offset", "100%").attr("stop-color", "#515bd4");

  // Shared clip-path for photo circle thumbnails
  defs.append("clipPath").attr("id", "photo-circle-clip")
    .append("circle").attr("r", 1);

  // Sub-groups for layering: countries → roads → flights → photos → landmarks (top)
  const gCountries = g.append("g").attr("class", "layer-countries");
  const gRoads = g.append("g").attr("class", "layer-roads").style("display", "none");
  const gFlights = g.append("g").attr("class", "layer-flights");
  const gPhotos = g.append("g").attr("class", "layer-photos");
  const gLandmarks = g.append("g").attr("class", "layer-landmarks");

  let landmarksVisible = true;
  let flightsVisible = true;
  let photosVisible = true;
  let visitedSet = new Set();
  let visitedLandmarkSet = new Set();
  let currentZoomK = 1;
  let photoClusterTimeout = null;

  // ─── Dynamic city roads near photo locations ───────────────────────
  // Fetches roads from Overpass API around photo locations, caches per grid cell
  const ROAD_ZOOM_THRESHOLD = 50;
  const ROAD_CELL_SIZE = 0.15;  // ~16km grid cells for dedup
  const roadCellCache = new Set();       // "lat|lng" grid keys already fetched
  let allRoadFeatures = [];              // accumulates across fetches
  let roadFeaturesByType = {};           // highway → FeatureCollection (for rendering)
  let roadFetchQueue = [];
  let roadFetching = false;

  const roadWidths = {
    motorway: 1.2, trunk: 1.0, primary: 0.7,
    secondary: 0.5, tertiary: 0.35, road: 0.3,
  };
  const roadColors = {
    motorway: "#f59e0b", trunk: "#f59e0b", primary: "#8b5cf6",
    secondary: "#6366f1", tertiary: "#4f46e5", road: "#4f46e5",
  };

  function photoGridKey(lat, lng) {
    return `${Math.floor(lat / ROAD_CELL_SIZE)}|${Math.floor(lng / ROAD_CELL_SIZE)}`;
  }

  function cellBbox(key) {
    const [r, c] = key.split("|").map(Number);
    return [
      r * ROAD_CELL_SIZE,                // south
      c * ROAD_CELL_SIZE,                // west
      (r + 1) * ROAD_CELL_SIZE,          // north
      (c + 1) * ROAD_CELL_SIZE,          // east
    ];
  }

  async function fetchRoadsForCell(key) {
    const [s, w, n, e] = cellBbox(key);
    const query = `[out:json][timeout:25];(way["highway"~"^(motorway|trunk|primary|secondary|tertiary)$"](${s},${w},${n},${e}););out geom;`;
    const resp = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(query),
    });
    const data = await resp.json();
    return data.elements
      .filter((el) => el.geometry && el.geometry.length > 1)
      .map((el) => ({
        type: "Feature",
        properties: { highway: el.tags?.highway || "road" },
        geometry: {
          type: "LineString",
          coordinates: el.geometry.map((pt) => [pt.lon, pt.lat]),
        },
      }));
  }

  async function processRoadQueue() {
    if (roadFetching || !roadFetchQueue.length) return;
    roadFetching = true;
    while (roadFetchQueue.length) {
      const key = roadFetchQueue.shift();
      if (roadCellCache.has(key)) continue;
      roadCellCache.add(key);
      try {
        const features = await fetchRoadsForCell(key);
        if (features.length) {
          allRoadFeatures.push(...features);
          rebuildRoadsByType();
          renderRoads();
          console.log(`[Roads] Fetched ${features.length} segments for cell ${key}`);
        }
      } catch (err) {
        console.warn(`[Roads] Failed cell ${key}:`, err);
        roadCellCache.delete(key); // allow retry
      }
    }
    roadFetching = false;
  }

  function rebuildRoadsByType() {
    const grouped = {};
    for (const f of allRoadFeatures) {
      const type = f.properties.highway || "road";
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(f);
    }
    roadFeaturesByType = {};
    for (const [type, features] of Object.entries(grouped)) {
      roadFeaturesByType[type] = { type: "FeatureCollection", features };
    }
  }

  function queueRoadsForPhotos() {
    const photos = getPhotos();
    if (!photos.length) return;
    let queued = 0;
    for (const p of photos) {
      const key = photoGridKey(p.lat, p.lng);
      if (!roadCellCache.has(key) && !roadFetchQueue.includes(key)) {
        roadFetchQueue.push(key);
        queued++;
      }
    }
    if (queued) processRoadQueue();
  }

  // Kick off road fetching based on current photos
  queueRoadsForPhotos();

  // Smooth line generator for roads (Catmull-Rom spline)
  const roadLine = d3.line()
    .curve(d3.curveCatmullRom.alpha(0.5))
    .defined(d => d !== null)
    .x(d => d[0])
    .y(d => d[1]);

  function renderRoads() {
    gRoads.selectAll("path").remove();
    const order = ["tertiary", "secondary", "primary", "trunk", "motorway"];
    for (const type of order) {
      const fc = roadFeaturesByType[type];
      if (!fc) continue;
      // Build one smooth path string for all features of this type
      const segments = [];
      for (const f of fc.features) {
        const coords = f.geometry.coordinates;
        const projected = coords.map(c => projection(c)).filter(p => p !== null);
        if (projected.length >= 2) segments.push(roadLine(projected));
      }
      if (!segments.length) continue;
      gRoads.append("path")
        .attr("d", segments.join(""))
        .attr("fill", "none")
        .attr("stroke", roadColors[type] || "#6366f1")
        .attr("stroke-width", (roadWidths[type] || 0.3) / currentZoomK)
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round")
        .attr("opacity", 0.7)
        .attr("class", "road-type");
    }
  }

  // Projection
  const projection = d3
    .geoNaturalEarth1()
    .scale(width / 5.6)
    .translate([width / 2, height / 2]);

  const path = d3.geoPath().projection(projection);

  // Resize handling — keep map filling the container
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const w = entry.contentRect.width;
      const h = entry.contentRect.height;
      if (w > 0 && h > 0 && (w !== width || h !== height)) {
        width = w;
        height = h;
        svg.attr("viewBox", `0 0 ${width} ${height}`);
        projection.scale(width / 5.6).translate([width / 2, height / 2]);
        // Re-project country/flight paths (not roads — those use custom line gen)
        gCountries.selectAll("path").attr("d", path);
        gFlights.selectAll("path").attr("d", path);
        // Re-render roads with updated projection
        renderRoads();
        // Reposition landmarks
        gLandmarks.selectAll(".lm-g").attr("transform", (d) => {
          const [x, y] = projection([d.lng, d.lat]);
          return `translate(${x},${y})`;
        });
        // Reposition photo markers (re-cluster after projection change)
        renderPhotos();
      }
    }
  });
  resizeObserver.observe(container);

  // Zoom
  const zoom = d3
    .zoom()
    .scaleExtent([1, 4000])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
      currentZoomK = event.transform.k;
      // Scale country borders inversely so they stay thin
      gCountries.selectAll("path")
        .style("stroke-width", (0.8 / currentZoomK) + "px");
      // Scale landmark icons inversely so they stay the same screen size
      gLandmarks.selectAll(".lm-scale")
        .attr("transform", `scale(${1 / currentZoomK})`);
      // Immediate inverse-scale for smooth zoom on photos
      gPhotos.selectAll(".photo-scale")
        .attr("transform", `scale(${1 / currentZoomK})`);
      // Debounced re-cluster photos after zoom settles
      clearTimeout(photoClusterTimeout);
      photoClusterTimeout = setTimeout(renderPhotos, 150);
      // Scale flight dots and planes inversely
      gFlights.selectAll(".flight-arc")
        .attr("stroke-width", 1.5 / currentZoomK);
      gFlights.selectAll(".flight-dot")
        .attr("r", 5 / currentZoomK)
        .attr("stroke-width", 1 / currentZoomK);
      gFlights.selectAll(".flight-plane")
        .attr("font-size", `${14 / currentZoomK}px`);
      gFlights.selectAll(".flight-label")
        .attr("font-size", `${10 / currentZoomK}px`)
        .attr("dx", 8 / currentZoomK)
        .attr("dy", -8 / currentZoomK)
        .attr("stroke-width", 2 / currentZoomK);
      // Roads: show only at deep zoom, lightweight stroke update (~5 paths)
      if (currentZoomK >= ROAD_ZOOM_THRESHOLD) {
        gRoads.style("display", null);
        gRoads.selectAll(".road-type")
          .attr("stroke-width", function() {
            const d = d3.select(this).datum();
            const type = d.features?.[0]?.properties?.highway || "road";
            return (roadWidths[type] || 0.3) / currentZoomK;
          });
      } else {
        gRoads.style("display", "none");
      }
    });

  svg.call(zoom);

  // Zoom controls
  document.getElementById("zoom-in").addEventListener("click", () => {
    svg.transition().duration(300).call(zoom.scaleBy, 1.5);
  });
  document.getElementById("zoom-out").addEventListener("click", () => {
    svg.transition().duration(300).call(zoom.scaleBy, 0.67);
  });
  document.getElementById("zoom-reset").addEventListener("click", () => {
    svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
  });

  // Tooltip element
  const tooltipEl = d3.select(tooltip);

  // Load TopoJSON
  d3.json(WORLD_TOPO_URL).then((world) => {
    const countries = topojson.feature(
      world,
      world.objects.countries
    ).features;

    gCountries
      .selectAll("path")
      .data(countries)
      .join("path")
      .attr("d", path)
      .attr("class", (d) => {
        const country = getCountryById(d.id);
        if (country && visitedSet.has(country.code)) return "country-visited";
        return "country-default";
      })
      .attr("data-id", (d) => d.id)
      .on("click", (event, d) => {
        const country = getCountryById(d.id);
        if (country) onCountryClick(country, event);
      })
      .on("mouseenter", (event, d) => {
        const country = getCountryById(d.id);
        if (!country) return;
        const isVisited = visitedSet.has(country.code);
        tooltipEl
          .html(
            `<img class="tooltip-flag" src="${getFlagUrl(country.code, 44)}" alt="" />
             <span>${country.name}${isVisited ? " ✓" : ""}</span>`
          )
          .classed("visible", true);
      })
      .on("mousemove", (event) => {
        tooltipEl
          .style("left", event.clientX + 14 + "px")
          .style("top", event.clientY - 10 + "px");
      })
      .on("mouseleave", () => {
        tooltipEl.classed("visible", false);
      });

    // ── Landmarks layer ─────────────────────────────────────────
    renderLandmarks();

    // ── Flights layer ───────────────────────────────────────────
    renderFlightArcs();

    // ── Photos layer ────────────────────────────────────────────
    renderPhotos();
  });

  // ── Landmark rendering (only checked landmarks) ─────────────────
  function renderLandmarks() {
    gLandmarks.selectAll(".lm-g").remove();

    if (!landmarksVisible) return;

    // Only show landmarks that the user has individually checked
    const visibleLandmarks = LANDMARKS.filter(
      (l) => visitedLandmarkSet.has(l.code + ":" + l.name)
    );

    const groups = gLandmarks
      .selectAll(".lm-g")
      .data(visibleLandmarks, (d) => d.code + d.name)
      .join("g")
      .attr("class", "lm-g")
      .attr("transform", (d) => {
        const [x, y] = projection([d.lng, d.lat]);
        return `translate(${x},${y})`;
      });

    // Inner group for inverse-zoom scaling
    const inner = groups
      .append("g")
      .attr("class", "lm-scale")
      .attr("transform", `scale(${1 / currentZoomK})`);

    // White border circle (visible only for photo markers)
    inner.append("circle")
      .attr("class", "lm-border")
      .attr("r", 22)
      .attr("fill", "#1a1a2e")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2.5)
      .style("display", (d) => getCachedImageUrl(d.name) ? null : "none");

    // Image: Wikipedia photo or SVG icon fallback
    inner
      .append("image")
      .attr("href", (d) => getCachedImageUrl(d.name) || getLandmarkIconUrl(d.icon, d.name))
      .attr("x", -20)
      .attr("y", -20)
      .attr("width", 40)
      .attr("height", 40)
      .attr("cursor", "pointer")
      .attr("class", "lm-img")
      .attr("preserveAspectRatio", (d) => getCachedImageUrl(d.name) ? "xMidYMid slice" : "xMidYMid meet")
      .style("clip-path", (d) => getCachedImageUrl(d.name) ? "circle(50%)" : "none")
      .each(function(d) {
        if (!getCachedImageUrl(d.name)) {
          const imgEl = this;
          fetchLandmarkImage(d.name).then(url => {
            if (url && imgEl.isConnected) {
              d3.select(imgEl)
                .attr("href", url)
                .attr("preserveAspectRatio", "xMidYMid slice")
                .style("clip-path", "circle(50%)");
              d3.select(imgEl.parentNode).select(".lm-border")
                .style("display", null);
            }
          });
        }
      });

    // Tooltip on landmark hover
    groups
      .on("mouseenter", (event, d) => {
        const imgUrl = getCachedImageUrl(d.name) || getLandmarkIconUrl(d.icon, d.name);
        const isPhoto = !!getCachedImageUrl(d.name);
        const imgStyle = isPhoto
          ? "width:28px;height:28px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:6px"
          : "width:28px;height:28px;vertical-align:middle;margin-right:6px";
        tooltipEl
          .html(`<img src="${imgUrl}" style="${imgStyle}" /><span>${d.name}</span>`)
          .classed("visible", true);
      })
      .on("mousemove", (event) => {
        tooltipEl
          .style("left", event.clientX + 14 + "px")
          .style("top", event.clientY - 10 + "px");
      })
      .on("mouseleave", () => {
        tooltipEl.classed("visible", false);
      });
  }

  // ── Flight arc rendering ────────────────────────────────────────
  let flightYearFilter = null;

  function renderFlightArcs() {
    const arcs = getFlightArcs(flightYearFilter ? { year: flightYearFilter } : undefined);

    gFlights.selectAll("*").remove();

    if (!flightsVisible || arcs.length === 0) return;

    // Main arc line — dashed if it has real waypoints, solid if great-circle
    gFlights
      .selectAll(".flight-arc")
      .data(arcs)
      .join("path")
      .attr("class", "flight-arc")
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", (d) => d.properties.hasWaypoints ? "#10b981" : "#3b82f6")
      .attr("stroke-width", 1.5)
      .attr("stroke-linecap", "round")
      .attr("stroke-opacity", 1)
      .attr("stroke-dasharray", (d) => d.properties.hasWaypoints ? "6 3" : "none")
      .attr("pointer-events", "visibleStroke")
      .style("cursor", "pointer")
      .on("mouseenter", (event, d) => {
        const flNum = d.properties.flightNumber ? ` (${d.properties.flightNumber})` : "";
        tooltipEl
          .html(`<span>✈️ ${d.properties.fromIATA} → ${d.properties.toIATA}${flNum} — ${d.properties.distance.toLocaleString()} km</span>`)
          .classed("visible", true);
      })
      .on("mousemove", (event) => {
        tooltipEl
          .style("left", event.clientX + 14 + "px")
          .style("top", event.clientY - 10 + "px");
      })
      .on("mouseleave", () => {
        tooltipEl.classed("visible", false);
      });

    // Dots at airports with IATA labels
    const dotMap = new Map();
    arcs.forEach((a) => {
      const coords = a.geometry.coordinates;
      const key0 = coords[0].join(",");
      const keyN = coords[coords.length - 1].join(",");
      if (!dotMap.has(key0)) dotMap.set(key0, { coords: coords[0], iata: a.properties.fromIATA, city: a.properties.fromCity });
      if (!dotMap.has(keyN)) dotMap.set(keyN, { coords: coords[coords.length - 1], iata: a.properties.toIATA, city: a.properties.toCity });
    });
    const dots = [...dotMap.values()];

    gFlights
      .selectAll(".flight-dot")
      .data(dots)
      .join("circle")
      .attr("class", "flight-dot")
      .attr("cx", (d) => projection(d.coords)[0])
      .attr("cy", (d) => projection(d.coords)[1])
      .attr("r", 5 / currentZoomK)
      .attr("fill", "#3b82f6")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1);

    // IATA labels next to dots
    gFlights
      .selectAll(".flight-label")
      .data(dots)
      .join("text")
      .attr("class", "flight-label")
      .attr("x", (d) => projection(d.coords)[0])
      .attr("y", (d) => projection(d.coords)[1])
      .attr("dx", 8 / currentZoomK)
      .attr("dy", -8 / currentZoomK)
      .attr("font-size", `${10 / currentZoomK}px`)
      .attr("font-weight", "700")
      .attr("fill", "#e2e8f0")
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 2 / currentZoomK)
      .attr("paint-order", "stroke")
      .attr("pointer-events", "none")
      .text((d) => d.iata);

    // Airplane emoji at midpoint of each arc
    gFlights
      .selectAll(".flight-plane")
      .data(arcs)
      .join("text")
      .attr("class", "flight-plane")
      .attr("transform", (d) => {
        const coords = d.geometry.coordinates;
        const interp = d3.geoInterpolate(coords[0], coords[coords.length - 1]);
        const mid = interp(0.5);
        const [x, y] = projection(mid);
        return `translate(${x},${y})`;
      })
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-size", `${14 / currentZoomK}px`)
      .attr("pointer-events", "none")
      .text("✈️");
  }

  // ── Photo clustering ────────────────────────────────────────────
  /**
   * Cluster photos by screen-space proximity.
   * At low zoom, nearby photos merge into area/country-level clusters.
   * At high zoom, individual photos are visible.
   */
  function clusterPhotos(allPhotos, zoomK) {
    const CLUSTER_RADIUS = 30; // screen-pixel merge radius
    const points = allPhotos.map(p => {
      const [x, y] = projection([p.lng, p.lat]);
      return { ...p, px: x, py: y };
    });

    const used = new Set();
    const clusters = [];

    for (let i = 0; i < points.length; i++) {
      if (used.has(i)) continue;
      used.add(i);

      const members = [points[i]];
      let cx = points[i].px;
      let cy = points[i].py;

      // Greedy merge: keep scanning until no new members added
      let changed = true;
      while (changed) {
        changed = false;
        for (let j = 0; j < points.length; j++) {
          if (used.has(j)) continue;
          const dx = (points[j].px - cx) * zoomK;
          const dy = (points[j].py - cy) * zoomK;
          if (Math.sqrt(dx * dx + dy * dy) < CLUSTER_RADIUS) {
            members.push(points[j]);
            used.add(j);
            cx = members.reduce((s, p) => s + p.px, 0) / members.length;
            cy = members.reduce((s, p) => s + p.py, 0) / members.length;
            changed = true;
          }
        }
      }

      clusters.push({ photos: members, cx, cy });
    }
    return clusters;
  }

  // ── Photo markers rendering (with clustering) ───────────────────
  let clusterGeneration = 0; // unique ids for clip-paths

  function renderPhotos() {
    gPhotos.selectAll("*").remove();
    if (!photosVisible) return;
    const allPhotos = getPhotos();
    if (!allPhotos.length) return;

    const clusters = clusterPhotos(allPhotos, currentZoomK);
    const gen = ++clusterGeneration;

    clusters.forEach((cluster, idx) => {
      const isSingle = cluster.photos.length === 1;

      const groupEl = gPhotos.append("g")
        .attr("class", isSingle ? "photo-g" : "photo-cluster-g")
        .attr("transform", `translate(${cluster.cx},${cluster.cy})`)
        .datum(cluster);

      const inner = groupEl.append("g")
        .attr("class", "photo-scale")
        .attr("transform", `scale(${1 / currentZoomK})`);

      if (isSingle) {
        // ── Single photo/video marker ────────────────────────────
        const d = cluster.photos[0];
        const isVid = d.type === "video";
        if (d.thumb) {
          // Show thumbnail in a circle with accent border
          inner.append("circle").attr("r", 16)
            .attr("fill", "#1a1d27")
            .attr("stroke", "#6366f1").attr("stroke-width", 2.5);
          const clipId = `pc-${gen}-${idx}`;
          inner.append("clipPath").attr("id", clipId)
            .append("circle").attr("r", 13);
          inner.append("image")
            .attr("href", d.thumb)
            .attr("x", -13).attr("y", -13)
            .attr("width", 26).attr("height", 26)
            .attr("preserveAspectRatio", "xMidYMid slice")
            .attr("clip-path", `url(#${clipId})`);
          // Video play badge
          if (isVid) {
            inner.append("circle").attr("cx", 0).attr("cy", 0).attr("r", 7)
              .attr("fill", "rgba(0,0,0,0.6)");
            inner.append("text")
              .attr("text-anchor", "middle").attr("dominant-baseline", "central")
              .attr("font-size", "8px").attr("fill", "#fff").attr("pointer-events", "none")
              .text("▶");
          }
        } else {
          inner.append("circle").attr("r", 14)
            .attr("fill", "#6366f1")
            .attr("stroke", "#fff").attr("stroke-width", 2)
            .attr("opacity", 0.9);
          inner.append("text")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "central")
            .attr("font-size", "12px")
            .attr("pointer-events", "none")
            .text(isVid ? "🎥" : "📷");
        }

        // Tooltip + click to open viewer
        const icon = isVid ? "🎥" : "📷";
        groupEl.style("cursor", "pointer")
          .on("mouseenter", (event) => {
            const thumb = d.thumb
              ? `<img src="${d.thumb}" style="width:80px;height:60px;object-fit:cover;border-radius:4px;display:block;margin-bottom:4px" />`
              : "";
            tooltipEl.html(`${thumb}<span>${icon} ${d.name}</span>`).classed("visible", true);
          })
          .on("mousemove", (event) => {
            tooltipEl.style("left", event.clientX + 14 + "px").style("top", event.clientY - 10 + "px");
          })
          .on("mouseleave", () => tooltipEl.classed("visible", false))
          .on("click", (event) => {
            event.stopPropagation();
            tooltipEl.classed("visible", false);
            storyViewer.open([d]);
          });

      } else {
        // ── Cluster "story" icon ────────────────────────────────
        const count = cluster.photos.length;
        const baseR = Math.min(22 + count, 36); // ring radius

        // Outer story-gradient ring
        inner.append("circle")
          .attr("r", baseR)
          .attr("fill", "none")
          .attr("stroke", "url(#story-gradient)")
          .attr("stroke-width", 3)
          .attr("class", "story-ring");

        // Dark inner fill
        inner.append("circle")
          .attr("r", baseR - 3)
          .attr("fill", "#1a1d27");

        // Show thumbnail of first photo with thumb, or camera emoji
        const thumbPhoto = cluster.photos.find(p => p.thumb);
        const imgR = baseR - 5;
        if (thumbPhoto) {
          const clipId = `cc-${gen}-${idx}`;
          inner.append("clipPath").attr("id", clipId)
            .append("circle").attr("r", imgR);
          inner.append("image")
            .attr("href", thumbPhoto.thumb)
            .attr("x", -imgR).attr("y", -imgR)
            .attr("width", imgR * 2).attr("height", imgR * 2)
            .attr("preserveAspectRatio", "xMidYMid slice")
            .attr("clip-path", `url(#${clipId})`);
        } else {
          inner.append("text")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "central")
            .attr("font-size", `${imgR}px`)
            .attr("pointer-events", "none")
            .text("📷");
        }

        // Count badge (top-right)
        const badgeR = Math.max(9, baseR * 0.35);
        const bx = baseR * 0.65;
        const by = -baseR * 0.65;
        inner.append("circle")
          .attr("cx", bx).attr("cy", by).attr("r", badgeR)
          .attr("fill", "#6366f1")
          .attr("stroke", "#0f1117").attr("stroke-width", 2);
        inner.append("text")
          .attr("x", bx).attr("y", by)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "central")
          .attr("font-size", `${badgeR * 1.1}px`)
          .attr("font-weight", "700")
          .attr("fill", "#fff")
          .attr("pointer-events", "none")
          .text(count);

        // Tooltip: show up to 4 thumbnails + count
        groupEl
          .on("mouseenter", (event) => {
            const thumbs = cluster.photos.filter(p => p.thumb).slice(0, 4);
            const grid = thumbs.length
              ? `<div style="display:flex;gap:3px;margin-bottom:4px">${thumbs.map(p =>
                  `<img src="${p.thumb}" style="width:42px;height:42px;object-fit:cover;border-radius:4px" />`
                ).join("")}</div>`
              : "";
            const nVids = cluster.photos.filter(p => p.type === "video").length;
            const nPhotos = count - nVids;
            const label = [nPhotos && `📷 ${nPhotos}`, nVids && `🎥 ${nVids}`].filter(Boolean).join(" · ") || `📷 ${count} photos`;
            tooltipEl
              .html(`${grid}<span>${label}</span>`)
              .classed("visible", true);
          })
          .on("mousemove", (event) => {
            tooltipEl.style("left", event.clientX + 14 + "px").style("top", event.clientY - 10 + "px");
          })
          .on("mouseleave", () => tooltipEl.classed("visible", false));

        // Click cluster → open story viewer with all photos
        groupEl.style("cursor", "pointer")
          .on("click", (event) => {
            event.stopPropagation();
            tooltipEl.classed("visible", false);
            storyViewer.open(cluster.photos);
          });
      }
    });
  }

  // ── Public API ──────────────────────────────────────────────────
  function updateVisited(codes) {
    visitedSet = new Set(codes);
    gCountries.selectAll("path[data-id]").attr("class", function (d) {
      const country = getCountryById(d.id);
      if (country && visitedSet.has(country.code)) return "country-visited";
      return "country-default";
    });
    // Re-render landmarks since they depend on visited state
    renderLandmarks();
  }

  function updateFlights(year) {
    if (year !== undefined) flightYearFilter = year;
    renderFlightArcs();
  }

  function setLandmarksVisible(visible) {
    landmarksVisible = visible;
    renderLandmarks();
  }

  function updateVisitedLandmarks(keys) {
    visitedLandmarkSet = new Set(keys);
    renderLandmarks();
  }

  function setFlightsVisible(visible) {
    flightsVisible = visible;
    renderFlightArcs();
  }

  function updatePhotos() {
    renderPhotos();
    // Fetch roads for any new photo locations
    queueRoadsForPhotos();
  }

  function setPhotosVisible(visible) {
    photosVisible = visible;
    renderPhotos();
  }

  // Wire story-viewer delete → re-render map + notify caller
  let _onPhotoDeleted = null;
  storyViewer.onDelete = () => {
    renderPhotos();
    if (_onPhotoDeleted) _onPhotoDeleted();
  };

  function onPhotoDeleted(fn) { _onPhotoDeleted = fn; }

  return { updateVisited, updateFlights, setLandmarksVisible, setFlightsVisible, updatePhotos, setPhotosVisible, updateVisitedLandmarks, onPhotoDeleted };
}
