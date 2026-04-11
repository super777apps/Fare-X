import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const params = new URLSearchParams(location.search);
const jobId = params.get("id");

let map;
let driverMarker;
let routeLine;

let pickup, drop;
let driverUID;

let lastRouteKey = null; // ✅ prevent duplicate API calls

/* ---------- INIT ---------- */
async function init() {

  const snap = await getDoc(doc(db, "fares", jobId));

  if (!snap.exists()) {
    alert("Job not found");
    return;
  }

  const job = snap.data();

  pickup = [job.pickupLat, job.pickupLng];
  drop = [job.dropLat || job.pickupLat, job.dropLng || job.pickupLng];

  driverUID = job.currentDriverUID;

  // ✅ FAST MAP INIT
  map = L.map("map", {
    zoomControl: true,
    preferCanvas: true // 🔥 faster rendering
  }).setView(pickup, 13);

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    { maxZoom: 19 }
  ).addTo(map);

  L.marker(pickup).addTo(map).bindPopup("Pickup");
  L.marker(drop).addTo(map).bindPopup("Drop");

  // 🔥 draw initial route ONCE
  drawRoute(pickup, drop);

  showInfo(pickup, drop);

  checkTracking(job);
}

/* ---------- ROUTE (OPTIMIZED) ---------- */
async function drawRoute(p1, p2) {

  const key = `${p1[0]},${p1[1]}-${p2[0]},${p2[1]}`;

  // ✅ prevent same route call again
  if (key === lastRouteKey) return;
  lastRouteKey = key;

  try {

    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${p1[1]},${p1[0]};${p2[1]},${p2[0]}?overview=full&geometries=geojson`
    );

    const data = await res.json();

    if (!data.routes || !data.routes[0]) return;

    const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);

    if (routeLine) map.removeLayer(routeLine);

    routeLine = L.polyline(coords, {
      color: "blue",
      weight: 4
    }).addTo(map);

  } catch (e) {
    console.error("Route error:", e);
  }
}

/* ---------- DISTANCE + ETA (THROTTLED) ---------- */
let lastInfoUpdate = 0;

function showInfo(p1, p2) {

  const now = Date.now();

  // ✅ limit calls every 5 sec
  if (now - lastInfoUpdate < 5000) return;

  lastInfoUpdate = now;

  fetch(
    `https://router.project-osrm.org/route/v1/driving/${p1[1]},${p1[0]};${p2[1]},${p2[0]}`
  )
    .then(r => r.json())
    .then(d => {

      if (!d.routes || !d.routes[0]) return;

      const dist = (d.routes[0].distance / 1000).toFixed(2);
      const time = (d.routes[0].duration / 60).toFixed(0);

      document.getElementById("info").innerText =
        `Distance: ${dist} km | ETA: ${time} mins`;
    })
    .catch(()=>{});
}

/* ---------- CHECK 15 MIN RULE ---------- */
function checkTracking(job) {

  if (!job.time) {
    enableLiveTracking();
    return;
  }

  const pickupTime = new Date(job.time);
  const now = new Date();

  const diff = (pickupTime - now) / (1000 * 60);

  if (diff <= 15) {
    enableLiveTracking();
  } else {
    document.getElementById("info").innerText +=
      " | Live tracking starts 15 min before pickup";
  }
}

/* ---------- LIVE DRIVER TRACKING (OPTIMIZED) ---------- */
let lastDriverUpdate = 0;

function enableLiveTracking() {

  if (!driverUID) return;

  onSnapshot(doc(db, "users", driverUID), (snap) => {

    const d = snap.data();
    if (!d?.location) return;

    const now = Date.now();

    // ✅ throttle updates (every 3 sec)
    if (now - lastDriverUpdate < 3000) return;
    lastDriverUpdate = now;

    const pos = [d.location.lat, d.location.lng];

    updateDriverMarker(pos);

    // 🔁 update route driver → pickup
    drawRoute(pos, pickup);

    // 🔁 update ETA
    showInfo(pos, pickup);

  });
}

/* ---------- DRIVER MARKER ---------- */
function updateDriverMarker(pos) {

  if (!driverMarker) {
    driverMarker = L.marker(pos).addTo(map).bindPopup("Driver");
  } else {
    driverMarker.setLatLng(pos);
  }
}

/* ---------- START ---------- */
init();