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
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;

/* =========================================================
   ROUTE SCREEN
========================================================= */
const routeBox = document.createElement("div");
routeBox.style.display = "none";
routeBox.style.position = "fixed";
routeBox.style.top = "0";
routeBox.style.left = "0";
routeBox.style.width = "100%";
routeBox.style.height = "100%";
routeBox.style.background = "#000";
routeBox.style.zIndex = "9999";
routeBox.style.padding = "10px";

routeBox.innerHTML = `
  <button onclick="closeRoute()" class="lux-btn full">← Back</button>
  <div id="routeMap" style="height:300px; margin-top:10px;"></div>
  <div id="routeInfo" style="margin-top:10px; color:#fff;"></div>
`;

document.body.appendChild(routeBox);

let routeMap, routeLine, driverMarker;

/* =========================================================
   AUTH
========================================================= */
onAuthStateChanged(auth, async user => {

  if (!user) {
    location.href = "index.html";
    return;
  }

  currentUser = user;

  document.getElementById("userName").textContent = user.email;
  document.getElementById("userRole").textContent = "Passenger";

  setupButtons();   // ✅ FIXED
  listenMyJobs();
});

/* =========================================================
   BUTTONS FIX
========================================================= */
function setupButtons() {

  document.getElementById("createFareBtn").onclick = () => {
    location.href = "createPassenger.html";
  };

  document.getElementById("driversBtn").onclick = () => {
    location.href = "friends.html";
  };

  document.getElementById("profileBtn").onclick = () => {
    location.href = "passengerProfile.html";
  };

  document.getElementById("helpBtn").onclick = () => {
    location.href = "help.html";
  };

  document.getElementById("jobsBtn").onclick = () => {
    listenMyJobs();
  };

  document.getElementById("logoutBtn").onclick = async () => {
    await signOut(auth);
    location.href = "index.html";
  };
}

/* =========================================================
   LISTEN JOBS
========================================================= */
function listenMyJobs() {

  const box = document.getElementById("jobsList");

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
   VIEW ROUTE
========================================================= */
window.viewRoute = async (jobId) => {

  const jobSnap = await getDoc(doc(db, "fares", jobId));
  const job = jobSnap.data();

  if (!job.pickupLat || !job.dropLat) {
    alert("Location not available");
    return;
  }

  routeBox.style.display = "block";

  setTimeout(() => {

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

  }, 300);

  /* -------- DISTANCE + ETA -------- */
  const dist = getDistance(
    job.pickupLat, job.pickupLng,
    job.dropLat, job.dropLng
  );

  const eta = (dist / 40 * 60).toFixed(0);

  document.getElementById("routeInfo").innerHTML =
    `Distance: ${dist.toFixed(2)} km<br>ETA: ${eta} min`;

  /* -------- LIVE DRIVER -------- */
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
   DISTANCE
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
   SEARCH DRIVER
========================================================= */
window.addDriver = async (driverUID, name) => {

  await addDoc(collection(db, "friends"), {
    owner: currentUser.uid,
    friendUID: driverUID,
    nickName: name
  });

  alert("Driver added");
};