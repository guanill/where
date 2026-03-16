/**
 * Simple dev server: static files + CORS proxy for Google Photos Picker API.
 *
 * Usage:  node server.js
 * Opens:  http://localhost:3456
 *
 * Any request to /gp-proxy/* is forwarded to photospicker.googleapis.com/v1/*
 * with the Authorization header passed through and CORS headers added.
 */

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = 3457;
const STATIC_DIR = path.join(__dirname, "src");
const GP_API = "photospicker.googleapis.com";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
};

function addCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

const server = http.createServer((req, res) => {
  // ─── CORS preflight ──────────────────────────────────
  if (req.method === "OPTIONS") {
    addCors(res);
    res.writeHead(204);
    return res.end();
  }

  // ─── Google Photos Picker proxy ──────────────────────
  if (req.url.startsWith("/gp-proxy/")) {
    const apiPath = "/v1/" + req.url.slice("/gp-proxy/".length);
    addCors(res);

    const proxyOpts = {
      hostname: GP_API,
      port: 443,
      path: apiPath,
      method: req.method,
      headers: {},
    };

    // Forward Authorization header
    if (req.headers.authorization) {
      proxyOpts.headers["Authorization"] = req.headers.authorization;
    }
    if (req.headers["content-type"]) {
      proxyOpts.headers["Content-Type"] = req.headers["content-type"];
    }

    const proxyReq = https.request(proxyOpts, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, {
        "Content-Type": proxyRes.headers["content-type"] || "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      proxyRes.pipe(res);
    });

    proxyReq.on("error", (err) => {
      console.error("[proxy] error:", err.message);
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: err.message } }));
    });

    // Pipe body for POST/PUT
    if (req.method === "POST" || req.method === "PUT") {
      req.pipe(proxyReq);
    } else {
      proxyReq.end();
    }
    return;
  }

  // ─── Static file serving ─────────────────────────────
  let filePath = path.join(STATIC_DIR, req.url === "/" ? "index.html" : req.url);
  filePath = decodeURIComponent(filePath);

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Not found");
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Content-Length": stat.size,
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n  🌍  WHERE server running at http://localhost:${PORT}\n`);
});
