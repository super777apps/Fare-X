import { db, auth } from "./firebase.js";

import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  addDoc,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;

/* =========================================================
   ✅ NEW: ROUTE SCREEN ELEMENTS
========================================================= */
const routeBox = document.createElement("div");
routeBox.style.display = "none";
routeBox.innerHTML = `
  <button onclick="closeRoute()" class="lux-btn full">← Back</button>
  <div id="routeMap" style="height:300px; margin-top:10px;"></div>
  <div id="routeInfo" style="margin-top:10px;"></div>
`;
document.body.appendChild(routeBox);

let routeMap, routeLine, driverMarker;

/* =========================================================
   AUTH
========================================================= */
onAuthStateChanged(auth, user => {

  if (!user) {
    location.href = "index.html";
    return;
  }

  currentUser = user;

  loadMyDrivers();
  listenMyJobs(); // ✅ NEW
});

/* =========================================================
   LOAD DRIVERS (UNCHANGED)
========================================================= */
function loadMyDrivers() {

  const box = document.getElementById("driversList");

  if (!box) return;

  const q = query(
    collection(db, "friends"),
    where("owner", "==", currentUser.uid)
  );

  onSnapshot(q, snap => {

    box.innerHTML = "";

    if (snap.empty) {
      box.innerHTML = `<div class="gold">No drivers added</div>`;
      return;
    }

    snap.forEach(docSnap => {

      const f = docSnap.data();

      const div = document.createElement("div");
      div.className = "fare-card";

      div.innerHTML = `
        <div class="fare-row">
          <span>Driver:</span>
          <b>${f.nickName || f.name || f.email}</b>
        </div>
      `;

      box.appendChild(div);
    });

  });
}

/* =========================================================
   ✅ NEW: LISTEN MY JOBS
========================================================= */
function listenMyJobs() {

  const box = document.getElementById("jobsList");
  if (!box) return;

  const q = query(
    collection(db, "fares"),
    where("passengerUID", "==", currentUser.uid)
  );

  onSnapshot(q, snap => {

    box.innerHTML = "";

    if (snap.empty) {
      box.innerHTML = `<div class="gold">No jobs</div>`;
      return;
    }

    snap.forEach(docSnap => {

      const f = docSnap.data();

      const div = document.createElement("div");
      div.className = "fare-card";

      div.innerHTML = `
        <div class="fare-row"><span>Pickup:</span><b>${f.pickup}</b></div>
        <div class="fare-row"><span>Drop:</span><b>${f.drop}</b></div>
        <div class="fare-row"><span>Status:</span><b>${f.status}</b></div>

        <button class="lux-btn full" onclick="viewRoute('${docSnap.id}')">
          View Route / Driver
        </button>
      `;

      box.appendChild(div);
    });

  });
}

/* =========================================================
   ✅ NEW: VIEW ROUTE
========================================================= */
window.viewRoute = async (jobId) => {

  const jobSnap = await getDoc(doc(db, "fares", jobId));
  const job = jobSnap.data();

  if (!job.pickupLat || !job.dropLat) {
    alert("Location not available");
    return;
  }

  routeBox.style.display = "block";

  if (!routeMap) {
    routeMap = L.map('routeMap').setView([job.pickupLat, job.pickupLng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
      .addTo(routeMap);
  }

  if (routeLine) routeMap.removeLayer(routeLine);

  routeLine = L.polyline([
    [job.pickupLat, job.pickupLng],
    [job.dropLat, job.dropLng]
  ]).addTo(routeMap);

  routeMap.fitBounds(routeLine.getBounds());

  /* -------- DISTANCE -------- */
  const dist = getDistance(
    job.pickupLat, job.pickupLng,
    job.dropLat, job.dropLng
  );

  const eta = (dist / 40 * 60).toFixed(0); // avg 40km/h

  document.getElementById("routeInfo").innerHTML =
    `Distance: ${dist.toFixed(2)} km<br>ETA: ${eta} min`;

  /* -------- DRIVER LIVE TRACK -------- */
  if (job.currentDriverUID) {

    onSnapshot(doc(db, "users", job.currentDriverUID), snap => {

      const d = snap.data();
      if (!d?.location) return;

      const { lat, lng } = d.location;

      if (!driverMarker) {
        driverMarker = L.marker([lat, lng]).addTo(routeMap);
      } else {
        driverMarker.setLatLng([lat, lng]);
      }

    });

  }

};

/* =========================================================
   CLOSE ROUTE
========================================================= */
window.closeRoute = () => {
  routeBox.style.display = "none";
};

/* =========================================================
   DISTANCE FUNCTION
========================================================= */
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* =========================================================
   SEARCH DRIVER (UNCHANGED)
========================================================= */
document.getElementById("searchBtn").onclick = async () => {

  const text = document.getElementById("searchInput").value.trim().toLowerCase();

  if (!text) return alert("Enter nickname");

  const box = document.getElementById("searchResults");
  box.innerHTML = "Searching...";

  const snap = await getDocs(collection(db, "users"));

  box.innerHTML = "";

  let found = false;

  snap.forEach(docSnap => {

    const u = docSnap.data();

    if (u.role === "driver" && u.nickName?.toLowerCase().includes(text)) {

      found = true;

      const div = document.createElement("div");
      div.className = "fare-card";

      div.innerHTML = `
        <div class="fare-row">
          <span>Driver:</span>
          <b>${u.nickName}</b>
        </div>

        <button class="lux-btn full" onclick="addDriver('${docSnap.id}','${u.nickName}')">
          Add Driver
        </button>
      `;

      box.appendChild(div);
    }

  });

  if (!found) {
    box.innerHTML = `<div class="gold">No driver found</div>`;
  }
};

/* =========================================================
   ADD DRIVER (UNCHANGED)
========================================================= */
window.addDriver = async (driverUID, name) => {

  await addDoc(collection(db, "friends"), {
    owner: currentUser.uid,
    friendUID: driverUID,
    nickName: name
  });

  alert("Driver added");
};