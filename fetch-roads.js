const https = require("https");
const fs = require("fs");

const cities = [
  { name: "Tokyo", bbox: [35.52, 139.55, 35.82, 139.95] },
  { name: "Kyoto", bbox: [34.9, 135.68, 35.1, 135.84] },
  { name: "Osaka", bbox: [34.55, 135.38, 34.75, 135.58] },
];

function fetchCity(city) {
  const [s, w, n, e] = city.bbox;
  const query = `[out:json][timeout:60];(way["highway"~"^(motorway|trunk|primary|secondary|tertiary)$"](${s},${w},${n},${e}););out geom;`;
  const body = "data=" + encodeURIComponent(query);
  return new Promise((resolve, reject) => {
    const req = https.request(
      "https://overpass-api.de/api/interpreter",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            const features = json.elements
              .filter((el) => el.geometry && el.geometry.length > 1)
              .map((el) => ({
                type: "Feature",
                properties: {
                  highway: el.tags?.highway || "road",
                  name: el.tags?.name || "",
                },
                geometry: {
                  type: "LineString",
                  coordinates: el.geometry.map((pt) => [pt.lon, pt.lat]),
                },
              }));
            console.log(city.name + ": " + features.length + " roads");
            resolve(features);
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  const all = [];
  for (const c of cities) {
    const f = await fetchCity(c);
    all.push(...f);
  }
  const geojson = { type: "FeatureCollection", features: all };
  fs.writeFileSync("src/data/city-roads.json", JSON.stringify(geojson));
  console.log(
    "Saved " + all.length + " total road segments to src/data/city-roads.json"
  );
})();
