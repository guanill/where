/**
 * Google Photos integration module.
 *
 * Two modes:
 *  A) Library scan  — signs in with photoslibrary.readonly, pages through the
 *     entire library, downloads EXIF headers to find GPS, stores metadata +
 *     tiny thumbnails.  (Photos Library API — deprecated March 2025 but still
 *     functional; the only way to programmatically list all photos.)
 *  B) Picker flow   — signs in with photospicker scope, user manually selects
 *     photos in Google's Picker UI.
 *
 * Requires a Google Cloud project with:
 *  - Photos Library API enabled  (for mode A)
 *  - Photos Picker API enabled   (for mode B)
 *  - OAuth 2.0 Client ID (Web application) with your origin in Authorized JS origins
 */

import { extractGPS } from "./photos.js";

const PICKER_SCOPE  = "https://www.googleapis.com/auth/photospicker.mediaitems.readonly";
const LIBRARY_SCOPE = "https://www.googleapis.com/auth/photoslibrary.readonly";
const LIBRARY_API   = "https://photoslibrary.googleapis.com/v1";
// Route Picker API calls through our local proxy to avoid CORS issues.
// The proxy at /gp-proxy/* forwards to photospicker.googleapis.com/v1/*
const PICKER_API = "/gp-proxy";
const CLIENT_ID_KEY = "where_google_client_id";
const TOKEN_KEY = "where_google_token";
const TOKEN_TS_KEY = "where_google_token_ts";
const TOKEN_TTL = 50 * 60 * 1000; // 50 min (tokens last 60 min, refresh early)

let accessToken = null;
let gisLoaded = false;

// ─── Token persistence ────────────────────────────────────────────────
function saveToken(token) {
  accessToken = token;
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(TOKEN_TS_KEY, String(Date.now()));
  } catch {}
}

function loadToken() {
  try {
    const t = sessionStorage.getItem(TOKEN_KEY);
    const ts = Number(sessionStorage.getItem(TOKEN_TS_KEY) || 0);
    if (t && Date.now() - ts < TOKEN_TTL) {
      accessToken = t;
      return true;
    }
  } catch {}
  return false;
}

function clearToken() {
  accessToken = null;
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_TS_KEY);
  } catch {}
}

// ─── GIS script loader ───────────────────────────────────────────────
function loadGIS() {
  return new Promise((resolve, reject) => {
    if (gisLoaded || window.google?.accounts?.oauth2) {
      gisLoaded = true;
      return resolve();
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      gisLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(script);
  });
}

// ─── Client ID management ─────────────────────────────────────────────
export function getStoredClientId() {
  return localStorage.getItem(CLIENT_ID_KEY) || "";
}

export function setClientId(id) {
  localStorage.setItem(CLIENT_ID_KEY, id.trim());
}

// ─── OAuth2 sign-in ───────────────────────────────────────────────────

let lastScope = null;  // track which scope the current token was granted for

/**
 * Sign in (or reuse a cached token if it's still fresh).
 * @param {string} clientId
 * @param {"picker"|"library"} mode — which scope to request
 */
export async function signIn(clientId, mode = "picker") {
  if (!clientId) throw new Error("No Client ID provided");

  const scope = mode === "library" ? LIBRARY_SCOPE : PICKER_SCOPE;

  // Reuse token only if it was granted for the same scope
  if (loadToken() && lastScope === scope) return accessToken;

  // Different scope requested — force new consent
  clearToken();
  await loadGIS();

  return new Promise((resolve, reject) => {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope,
      prompt: "consent",    // force consent to ensure the correct scope is granted
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }
        const granted = (response.scope || "").split(" ");
        console.log("[GP] Requested scope:", scope);
        console.log("[GP] Granted scopes:", granted);
        if (!granted.includes(scope)) {
          reject(new Error(
            `The required scope was not granted.\n\n` +
            `Requested: ${scope}\n` +
            `Granted: ${granted.join(", ")}\n\n` +
            `Make sure "Photos Library API" is enabled in your GCP project.`
          ));
          return;
        }
        lastScope = scope;
        saveToken(response.access_token);
        resolve(accessToken);
      },
      error_callback: (err) => {
        reject(new Error(err.message || "Sign-in was cancelled"));
      },
    });
    tokenClient.requestAccessToken();
  });
}

export function isSignedIn() {
  if (accessToken) return true;
  return loadToken();
}

export function signOut() {
  if (accessToken) {
    try { google.accounts.oauth2.revoke(accessToken); } catch {}
  }
  clearToken();
}

// ─── Picker session helpers ───────────────────────────────────────────

/**
 * Wrapper for all Picker API requests.
 * When the API isn't enabled or returns a server error, Google often
 * omits CORS headers from the error response, which makes the browser
 * throw a generic "Failed to fetch" instead of showing the real error.
 * This wrapper catches that and gives an actionable message.
 */
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 6000];

async function pickerFetch(path, { method = "GET", body } = {}) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const headers = { Authorization: `Bearer ${accessToken}` };
    const opts = { method, headers };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }

    let resp;
    try {
      resp = await fetch(`${PICKER_API}${path}`, opts);
    } catch (networkErr) {
      console.warn(`[GP] Network error on ${method} ${path}:`, networkErr.message);
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
        continue;
      }
      throw new Error(
        `Could not reach the Photos Picker API (${networkErr.message}).\n\n` +
        "Make sure the server is running: node server.js"
      );
    }

    // 401 = token expired
    if (resp.status === 401) {
      clearToken();
      throw new Error("Session expired. Please click Connect again to re-authenticate.");
    }

    // Retry on 5xx
    if (resp.status >= 500 && attempt < MAX_RETRIES) {
      console.warn(`[GP] Server error ${resp.status}, retrying…`);
      await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
      continue;
    }

    if (!resp.ok) {
      const errData = await resp.json().catch(() => null);
      const msg = errData?.error?.message || `HTTP ${resp.status}`;
      console.error(`[GP] API error:`, msg);
      throw new Error(`Photos Picker API: ${msg}`);
    }

    return resp.json();
  }
}

/** Create a new Photos Picker session. */
async function createPickerSession() {
  return pickerFetch("/sessions", { method: "POST", body: {} });
}

/** Poll session until user finishes selecting or timeout (5 min). */
async function pollSession(sessionId) {
  const TIMEOUT = 5 * 60 * 1000;          // 5 minutes
  const INTERVAL = 2000;                   // 2 seconds
  const start = Date.now();

  while (Date.now() - start < TIMEOUT) {
    const session = await pickerFetch(`/sessions/${sessionId}`);
    if (session.mediaItemsSet) return session;
    await new Promise((r) => setTimeout(r, INTERVAL));
  }
  throw new Error("Photo selection timed out. Please try again.");
}

/** Fetch all media items the user selected in the Picker. */
async function getPickedMediaItems(sessionId) {
  const items = [];
  let pageToken = null;

  do {
    let suffix = `/mediaItems?sessionId=${encodeURIComponent(sessionId)}`;
    if (pageToken) suffix += `&pageToken=${encodeURIComponent(pageToken)}`;

    const data = await pickerFetch(suffix);
    if (data.mediaItems) items.push(...data.mediaItems);
    pageToken = data.nextPageToken;
  } while (pageToken);

  return items;
}

// ─── EXIF GPS extraction from a remote image (with retry) ────────────
async function extractGPSFromUrl(url) {
  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      const headers = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const resp = await fetch(url, { headers });
      if (!resp.ok) {
        console.warn("[GP] EXIF download failed:", resp.status, resp.statusText, url.slice(0, 60));
        if (resp.status >= 500 && attempt < 2) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        return null;
      }

      const reader = resp.body.getReader();
      const chunks = [];
      let totalBytes = 0;
      const MAX_BYTES = 65536; // 64 KB — enough for EXIF header

      while (totalBytes < MAX_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        totalBytes += value.byteLength;
      }
      try { reader.cancel(); } catch {}

      const merged = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.byteLength;
      }

      return extractGPS(merged.buffer);
    } catch {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      return null;
    }
  }
  return null;
}

// ─── Main public entry point ──────────────────────────────────────────

/**
 * Open the Google Photos Picker, let the user select photos,
 * then extract GPS coordinates from the selected images' EXIF data.
 *
 * @param {(processed:number, total:number)=>void} onProgress
 * @param {(pickerUrl:string)=>void} onPickerReady — called with the Picker URL
 *        so the caller can update the UI (e.g. show "Select your photos…")
 * @returns {Promise<Array<{id, name, lat, lng, thumb, date}>>}
 */
export async function fetchGeotaggedPhotos(onProgress, onPickerReady) {
  if (!accessToken) throw new Error("Not signed in");

  // 1. Create Picker session
  const session = await createPickerSession();

  // 2. Open Picker UI in a popup / new tab
  const pickerWindow = window.open(
    session.pickerUri,
    "google-photos-picker",
    "width=1000,height=700,menubar=no,toolbar=no"
  );

  // Notify the caller so it can update the UI text
  if (onPickerReady) onPickerReady(session.pickerUri);

  // 3. Poll until the user finishes picking (or times out)
  await pollSession(session.id);

  // Close the popup if it's still open
  if (pickerWindow && !pickerWindow.closed) pickerWindow.close();

  // Small delay — Google may need a moment to finalize the selection
  await new Promise((r) => setTimeout(r, 1500));

  // 4. Retrieve the selected media items
  const items = await getPickedMediaItems(session.id);
  console.log("[GP] Picker returned items:", items.length, items.slice(0, 2));

  const imageItems = items.filter(
    (item) => item.type === "PHOTO" || item.mediaFile?.mimeType?.startsWith("image/")
  );
  console.log("[GP] Image items after filter:", imageItems.length);

  if (imageItems.length === 0) return [];

  // 5. Extract GPS from each image's EXIF in batches
  const geotagged = [];
  let processed = 0;
  const BATCH = 10;

  for (let i = 0; i < imageItems.length; i += BATCH) {
    const batch = imageItems.slice(i, i + BATCH);

    const results = await Promise.allSettled(
      batch.map(async (item) => {
        try {
          // baseUrl with =d gives the original bytes (needed for EXIF)
          const downloadUrl = item.mediaFile.baseUrl + "=d";
          console.log("[GP] Downloading EXIF from:", downloadUrl.slice(0, 80) + "…");
          const gps = await extractGPSFromUrl(downloadUrl);
          console.log("[GP]", item.mediaFile?.filename, "→ GPS:", gps);
          if (gps) {
            // Download thumbnail as data URL (baseUrls expire, so persist it)
            let thumb = null;
            try {
              const thumbResp = await fetch(item.mediaFile.baseUrl + "=w200-h200-c", {
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              if (thumbResp.ok) {
                const blob = await thumbResp.blob();
                thumb = await new Promise((r) => {
                  const fr = new FileReader();
                  fr.onloadend = () => r(fr.result);
                  fr.onerror = () => r(null);
                  fr.readAsDataURL(blob);
                });
              }
            } catch {}
            return {
              id: item.id,
              name: item.mediaFile?.filename || "Photo",
              lat: gps.lat,
              lng: gps.lng,
              thumb,
              date: item.createTime ? item.createTime.split("T")[0] : null,
            };
          }
          return null;
        } catch (err) {
          console.error("[GP] Error processing item:", item.id, err);
          return null;
        }
      })
    );

    for (const r of results) {
      processed++;
      if (r.status === "fulfilled" && r.value) geotagged.push(r.value);
    }

    if (onProgress) onProgress(processed, imageItems.length);
  }

  return geotagged;
}

// ─── Library API: scan entire photo library ──────────────────────────

/**
 * Fetch a page of media items from the Photos Library API.
 * @returns {{ mediaItems: Array, nextPageToken?: string }}
 */
async function libraryFetch(pageToken) {
  const url = new URL(`${LIBRARY_API}/mediaItems`);
  url.searchParams.set("pageSize", "100");
  if (pageToken) url.searchParams.set("pageToken", pageToken);

  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (resp.status === 401) {
    clearToken();
    throw new Error("Session expired — please sign in again.");
  }
  if (!resp.ok) {
    const err = await resp.json().catch(() => null);
    const msg = err?.error?.message || `HTTP ${resp.status}`;
    console.error("[GP] Library API error:", JSON.stringify(err, null, 2));

    if (resp.status === 403) {
      throw new Error(
        `Photos Library API returned 403 Forbidden.\n\n` +
        `This usually means the API is not enabled in your GCP project. ` +
        `Go to APIs & Services → Library, search for "Photos Library API" and enable it.\n\n` +
        `If the API is not available (deprecated by Google), use the Takeout import instead.\n\n` +
        `Details: ${msg}`
      );
    }
    throw new Error(`Photos Library API: ${msg}`);
  }
  return resp.json();
}

/**
 * Download the first ~32 KB of a URL and try to extract GPS from EXIF.
 * Smaller than the Picker version (64 KB) to save bandwidth during bulk scan.
 */
async function quickExtractGPS(url) {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;

    const reader = resp.body.getReader();
    const chunks = [];
    let total = 0;
    const MAX = 32768; // 32 KB — covers GPS IFD in ~99% of JPEGs

    while (total < MAX) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.byteLength;
    }
    try { reader.cancel(); } catch {}

    const merged = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) { merged.set(c, off); off += c.byteLength; }

    return extractGPS(merged.buffer);
  } catch {
    return null;
  }
}

/**
 * Download a thumbnail and convert to a persistent data-URL.
 */
async function downloadThumb(baseUrl) {
  try {
    const resp = await fetch(baseUrl + "=w100-h100-c");
    const blob = await resp.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Scan the user's entire Google Photos library for geotagged images.
 *
 * @param {(info:{phase:string, listed?:number, scanned?:number, total?:number, found?:number})=>void} onProgress
 * @returns {Promise<Array<{id, name, lat, lng, thumb, date}>>}
 */
export async function scanLibrary(onProgress) {
  if (!accessToken) throw new Error("Not signed in");

  // ── Phase 1: page through the library to collect all image items ──
  const allItems = [];
  let pageToken = null;

  do {
    const data = await libraryFetch(pageToken);
    if (data.mediaItems) {
      for (const item of data.mediaItems) {
        if (item.mimeType?.startsWith("image/") || item.mediaMetadata?.photo) {
          allItems.push(item);
        }
      }
    }
    pageToken = data.nextPageToken;
    if (onProgress) onProgress({ phase: "listing", listed: allItems.length });
  } while (pageToken);

  if (!allItems.length) return [];

  // ── Phase 2: extract GPS from EXIF + download thumbnails ──────────
  const geotagged = [];
  let scanned = 0;
  const BATCH = 10;

  for (let i = 0; i < allItems.length; i += BATCH) {
    const batch = allItems.slice(i, i + BATCH);

    await Promise.allSettled(
      batch.map(async (item) => {
        scanned++;
        const gps = await quickExtractGPS(item.baseUrl + "=d");
        if (!gps) return;

        const thumb = await downloadThumb(item.baseUrl);

        geotagged.push({
          id: item.id,
          name: item.filename || "Photo",
          lat: gps.lat,
          lng: gps.lng,
          thumb,
          date: item.mediaMetadata?.creationTime
            ? item.mediaMetadata.creationTime.split("T")[0]
            : null,
        });
      })
    );

    if (onProgress) {
      onProgress({
        phase: "scanning",
        scanned,
        total: allItems.length,
        found: geotagged.length,
      });
    }
  }

  return geotagged;
}
