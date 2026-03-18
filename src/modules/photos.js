/**
 * Photos module – extract GPS coordinates from photo EXIF data
 * and display them as markers on the map.
 *
 * Uses the lightweight exif-js approach (manual EXIF parsing) so
 * we don't need any external library.
 */

const STORAGE_KEY = "been_photos";
const IDB_NAME = "been_photos_db";
const IDB_STORE = "thumbs";
let nextId = 1;
let photos = loadPhotos();
if (photos.length) nextId = Math.max(...photos.map((p) => p.id)) + 1;

// Restore thumbnails from IndexedDB once DOM is ready
restoreThumbs();

// ─── IndexedDB thumbnail store ────────────────────────────────────────
const IDB_VID_STORE = "videos";

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
      if (!db.objectStoreNames.contains(IDB_VID_STORE)) db.createObjectStore(IDB_VID_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveThumb(id, dataUrl) {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(dataUrl, id);
    await new Promise((r, f) => { tx.oncomplete = r; tx.onerror = f; });
  } catch { /* best-effort */ }
}

async function deleteThumb(id) {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).delete(id);
  } catch { /* best-effort */ }
}

async function clearAllThumbs() {
  try {
    const db = await openIDB();
    const tx = db.transaction([IDB_STORE, IDB_VID_STORE], "readwrite");
    tx.objectStore(IDB_STORE).clear();
    tx.objectStore(IDB_VID_STORE).clear();
  } catch { /* best-effort */ }
}

// ─── Video blob persistence ──────────────────────────────────────────
async function saveVideoBlob(id, blob) {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_VID_STORE, "readwrite");
    tx.objectStore(IDB_VID_STORE).put(blob, id);
    await new Promise((r, f) => { tx.oncomplete = r; tx.onerror = f; });
  } catch { /* best-effort */ }
}

export async function loadVideoBlob(id) {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_VID_STORE, "readonly");
    const req = tx.objectStore(IDB_VID_STORE).get(id);
    await new Promise((r, f) => { tx.oncomplete = r; tx.onerror = f; });
    return req.result || null;
  } catch { return null; }
}

async function deleteVideoBlob(id) {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_VID_STORE, "readwrite");
    tx.objectStore(IDB_VID_STORE).delete(id);
  } catch { /* best-effort */ }
}

/** Restore thumbnails from IndexedDB into in-memory photo objects. */
async function restoreThumbs() {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, "readonly");
    const store = tx.objectStore(IDB_STORE);
    const req = store.getAll();
    const keysReq = store.getAllKeys();
    await new Promise((r, f) => { tx.oncomplete = r; tx.onerror = f; });
    const keys = keysReq.result;
    const vals = req.result;
    const map = new Map();
    keys.forEach((k, i) => map.set(k, vals[i]));
    let changed = false;
    for (const p of photos) {
      if (!p.thumb && map.has(p.id)) {
        p.thumb = map.get(p.id);
        changed = true;
      }
    }
    // Notify the map to re-render if thumbs were restored
    if (changed && _onThumbsRestored) _onThumbsRestored();
  } catch { /* IndexedDB not available—thumbs stay null */ }
}

let _onThumbsRestored = null;
/** Register a callback to re-render when thumbnails are restored from IDB. */
export function onThumbsRestored(fn) { _onThumbsRestored = fn; }

// ─── Persistence ──────────────────────────────────────────────────────
function loadPhotos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save() {
  // Save only metadata (not thumbnails/blobs) to keep localStorage small
  const slim = photos.map(({ id, name, lat, lng, date, type }) => ({
    id,
    name,
    lat,
    lng,
    date,
    ...(type === "video" ? { type } : {}),
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
}

// ─── EXIF GPS extraction ──────────────────────────────────────────────
function readUint16(view, offset, littleEndian) {
  return view.getUint16(offset, littleEndian);
}

function readUint32(view, offset, littleEndian) {
  return view.getUint32(offset, littleEndian);
}

function readRational(view, offset, littleEndian) {
  const num = view.getUint32(offset, littleEndian);
  const den = view.getUint32(offset + 4, littleEndian);
  return den ? num / den : 0;
}

function readString(view, offset, length) {
  let s = "";
  for (let i = 0; i < length; i++) {
    const c = view.getUint8(offset + i);
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s;
}

function dmsToDecimal(degrees, minutes, seconds, ref) {
  let dec = degrees + minutes / 60 + seconds / 3600;
  if (ref === "S" || ref === "W") dec = -dec;
  return dec;
}

/**
 * Extract GPS lat/lng from a JPEG file's EXIF data.
 * Returns { lat, lng } or null if no GPS data found.
 */
export function extractGPS(arrayBuffer) {
  const view = new DataView(arrayBuffer);

  // Verify JPEG SOI marker
  if (view.getUint16(0) !== 0xffd8) return null;

  let offset = 2;
  const len = view.byteLength;

  while (offset < len - 1) {
    const marker = view.getUint16(offset);
    offset += 2;

    // APP1 marker (EXIF)
    if (marker === 0xffe1) {
      const segLen = view.getUint16(offset);

      // Check "Exif\0\0"
      if (
        readString(view, offset + 2, 4) !== "Exif" ||
        view.getUint16(offset + 6) !== 0
      )
        break;

      const tiffStart = offset + 8;
      const byteOrder = view.getUint16(tiffStart);
      const littleEndian = byteOrder === 0x4949; // "II"

      // Read IFD0
      const ifd0Offset = readUint32(view, tiffStart + 4, littleEndian);
      const ifd0Abs = tiffStart + ifd0Offset;
      const ifd0Count = readUint16(view, ifd0Abs, littleEndian);

      let gpsIFDOffset = null;

      for (let i = 0; i < ifd0Count; i++) {
        const entryOffset = ifd0Abs + 2 + i * 12;
        const tag = readUint16(view, entryOffset, littleEndian);

        // GPS IFD Pointer tag = 0x8825
        if (tag === 0x8825) {
          gpsIFDOffset =
            tiffStart + readUint32(view, entryOffset + 8, littleEndian);
          break;
        }
      }

      if (!gpsIFDOffset) return null;

      // Read GPS IFD
      const gpsCount = readUint16(view, gpsIFDOffset, littleEndian);
      let latRef = null,
        lngRef = null;
      let latVals = null,
        lngVals = null;

      for (let i = 0; i < gpsCount; i++) {
        const entryOffset = gpsIFDOffset + 2 + i * 12;
        const tag = readUint16(view, entryOffset, littleEndian);
        const valueOffset =
          tiffStart + readUint32(view, entryOffset + 8, littleEndian);

        switch (tag) {
          case 1: // GPSLatitudeRef
            latRef = String.fromCharCode(
              view.getUint8(entryOffset + 8)
            );
            break;
          case 2: // GPSLatitude (3 rationals)
            latVals = [
              readRational(view, valueOffset, littleEndian),
              readRational(view, valueOffset + 8, littleEndian),
              readRational(view, valueOffset + 16, littleEndian),
            ];
            break;
          case 3: // GPSLongitudeRef
            lngRef = String.fromCharCode(
              view.getUint8(entryOffset + 8)
            );
            break;
          case 4: // GPSLongitude (3 rationals)
            lngVals = [
              readRational(view, valueOffset, littleEndian),
              readRational(view, valueOffset + 8, littleEndian),
              readRational(view, valueOffset + 16, littleEndian),
            ];
            break;
        }
      }

      if (latVals && lngVals && latRef && lngRef) {
        const lat = dmsToDecimal(latVals[0], latVals[1], latVals[2], latRef);
        const lng = dmsToDecimal(lngVals[0], lngVals[1], lngVals[2], lngRef);
        if (
          lat >= -90 && lat <= 90 &&
          lng >= -180 && lng <= 180 &&
          (lat !== 0 || lng !== 0)
        ) {
          return { lat, lng };
        }
      }

      return null;
    }

    // Skip non-APP1 segments
    if ((marker & 0xff00) === 0xff00 && marker !== 0xffd9) {
      offset += view.getUint16(offset);
    } else {
      break;
    }
  }

  return null;
}

/**
 * Create a thumbnail data URL from an image file.
 */
function createThumbnail(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 1200;
        const scale = Math.min(MAX / img.width, MAX / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      };
      img.onerror = () => resolve(null);
      img.src = reader.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/**
 * Create a thumbnail data URL from a video file by capturing a frame.
 */
function createVideoThumbnail(file) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadeddata = () => {
      // Seek to 25% or 1 second, whichever is smaller
      video.currentTime = Math.min(1, video.duration * 0.25 || 0.5);
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        const MAX = 1200;
        const scale = Math.min(MAX / video.videoWidth, MAX / video.videoHeight, 1);
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      } catch {
        URL.revokeObjectURL(url);
        resolve(null);
      }
    };
    video.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
  });
}

// ─── Video GPS extraction (MP4/MOV ©xyz atom) ────────────────────────
/**
 * Extract GPS lat/lng from MP4/MOV files.
 * Looks for the ©xyz atom inside moov > udta.
 * Format: "+DD.DDDD-DDD.DDDD/" or "+DD.DDDD+DDD.DDDD/"
 */
export function extractVideoGPS(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const len = view.byteLength;

  function readBoxType(offset) {
    return String.fromCharCode(
      view.getUint8(offset), view.getUint8(offset + 1),
      view.getUint8(offset + 2), view.getUint8(offset + 3)
    );
  }

  function findBox(start, end, type) {
    let off = start;
    while (off < end - 8) {
      let size = view.getUint32(off);
      if (size < 8) { if (size === 0) size = end - off; else break; }
      if (off + size > end) break;
      const btype = readBoxType(off + 4);
      if (btype === type) return { start: off, end: off + size, data: off + 8 };
      off += size;
    }
    return null;
  }

  const moov = findBox(0, len, "moov");
  if (!moov) return null;
  const udta = findBox(moov.data, moov.end, "udta");
  if (!udta) return null;

  // Search for ©xyz (0xA9 'x' 'y' 'z') inside udta
  let off = udta.data;
  while (off < udta.end - 8) {
    let size = view.getUint32(off);
    if (size < 8) { if (size === 0) size = udta.end - off; else break; }
    if (off + size > udta.end) break;

    const b0 = view.getUint8(off + 4);
    if (b0 === 0xA9 && view.getUint8(off + 5) === 0x78 &&
        view.getUint8(off + 6) === 0x79 && view.getUint8(off + 7) === 0x7A) {
      // Data: 2 bytes str-length, 2 bytes language code, then string
      const dataOff = off + 8;
      const strLen = view.getUint16(dataOff);
      const strStart = dataOff + 4;
      let str = "";
      for (let i = 0; i < strLen && (strStart + i) < off + size; i++) {
        str += String.fromCharCode(view.getUint8(strStart + i));
      }
      const m = str.match(/([+-]\d+\.\d+)([+-]\d+\.\d+)/);
      if (m) {
        const lat = parseFloat(m[1]);
        const lng = parseFloat(m[2]);
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && (lat !== 0 || lng !== 0)) {
          return { lat, lng };
        }
      }
    }
    off += size;
  }
  return null;
}

// ─── Public API ───────────────────────────────────────────────────────

export function getPhotos() {
  return [...photos];
}

/**
 * Process a File and add it as a photo marker if it has GPS data.
 * Returns the photo object or null.
 */
export async function addPhotoFromFile(file) {
  const buffer = await file.arrayBuffer();
  const gps = extractGPS(buffer);
  if (!gps) return null;

  const thumb = await createThumbnail(file);

  const photo = {
    id: nextId++,
    name: file.name.replace(/\.[^.]+$/, ""),
    lat: gps.lat,
    lng: gps.lng,
    date: file.lastModified ? new Date(file.lastModified).toISOString().slice(0, 10) : null,
    thumb,
  };

  photos.push(photo);
  save();
  if (thumb) saveThumb(photo.id, thumb);
  return photo;
}

/**
 * Process a video File: extract GPS from MP4/MOV metadata, capture a
 * thumbnail frame, and store the full video blob for playback.
 * Returns the photo object (with type:"video") or null.
 */
export async function addVideoFromFile(file) {
  const buffer = await file.arrayBuffer();
  const gps = extractVideoGPS(buffer);
  if (!gps) return null;

  const thumb = await createVideoThumbnail(file);

  const photo = {
    id: nextId++,
    name: file.name.replace(/\.[^.]+$/, ""),
    lat: gps.lat,
    lng: gps.lng,
    date: file.lastModified ? new Date(file.lastModified).toISOString().slice(0, 10) : null,
    thumb,
    type: "video",
  };

  photos.push(photo);
  save();
  if (thumb) saveThumb(photo.id, thumb);
  // Store the full video blob for later playback
  await saveVideoBlob(photo.id, file);
  return photo;
}

/**
 * Process multiple files. Returns array of successfully added photos.
 */
export async function addPhotosFromFiles(files) {
  const results = [];
  for (const file of files) {
    if (file.type.startsWith("image/")) {
      const photo = await addPhotoFromFile(file);
      if (photo) results.push(photo);
    } else if (file.type.startsWith("video/")) {
      const photo = await addVideoFromFile(file);
      if (photo) results.push(photo);
    }
  }
  return results;
}

export function removePhoto(id) {
  const p = photos.find((ph) => ph.id === id);
  photos = photos.filter((ph) => ph.id !== id);
  save();
  deleteThumb(id);
  if (p && p.type === "video") deleteVideoBlob(id);
}

/** Check if a photo with the given name already exists. */
export function hasPhotoNamed(name) {
  return photos.some((p) => p.name === name);
}

/** Rename a photo in-memory + persistence. */
export function renamePhoto(id, newName) {
  const p = photos.find((ph) => ph.id === id);
  if (p) { p.name = newName; save(); }
}

/**
 * Add a photo directly from pre-extracted data (e.g. from Google Photos).
 */
export function addPhotoDirectly({ name, lat, lng, thumb, date, type }) {
  const photo = {
    id: nextId++,
    name: name || "Photo",
    lat,
    lng,
    date: date || null,
    thumb: thumb || null,
    ...(type === "video" ? { type } : {}),
  };
  photos.push(photo);
  save();
  if (thumb) saveThumb(photo.id, thumb);
  return photo;
}

export function clearPhotos() {
  photos = [];
  nextId = 1;
  save();
  clearAllThumbs();
}

export function getPhotoStats() {
  return {
    total: photos.length,
    countries: new Set(
      // rough: we don't match to countries here, just count unique locations
    ).size,
  };
}
