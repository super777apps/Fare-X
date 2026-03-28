import { db, auth } from "./firebase.js";

import {
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ---------- MAP ---------- */
let map;
let markers = [];

/* ---------- INIT MAP ---------- */
function initMap() {

  map = L.map('map').setView([31.52, 74.35], 12); // Lahore default

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);
}

/* ---------- AUTH ---------- */
onAuthStateChanged(auth, user => {

  if (!user) {
    location.href = "index.html";
    return;
  }

  initMap();
  loadUsers();
  loadJobs();
  liveDrivers();
});

/* ---------- USERS ---------- */
function loadUsers() {

  const box = document.getElementById("usersList");

  onSnapshot(collection(db, "users"), snap => {

    box.innerHTML = "";

    snap.forEach(docSnap => {

      const u = docSnap.data();

      const div = document.createElement("div");
      div.className = "fare-card";

      div.innerHTML = `
        <div class="fare-row"><span>Email:</span><b>${u.email || "-"}</b></div>
        <div class="fare-row"><span>Name:</span><b>${u.nickName || "-"}</b></div>
        <div class="fare-row"><span>Role:</span><b>${u.role}</b></div>
        <div class="fare-row"><span>Online:</span><b>${u.online ? "Yes" : "No"}</b></div>
      `;

      box.appendChild(div);
    });

  });
}

/* ---------- JOBS ---------- */
function loadJobs() {

  const box = document.getElementById("jobsList");

  onSnapshot(collection(db, "fares"), snap => {

    box.innerHTML = "";

    snap.forEach(docSnap => {

      const f = docSnap.data();

      const div = document.createElement("div");
      div.className = "fare-card";

      div.innerHTML = `
        <div class="fare-row"><span>Pickup:</span><b>${f.pickup}</b></div>
        <div class="fare-row"><span>Drop:</span><b>${f.drop}</b></div>
        <div class="fare-row"><span>Status:</span><b>${f.status}</b></div>
        <div class="fare-row"><span>Driver:</span><b>${f.currentDriverName || "-"}</b></div>
        <div class="fare-row"><span>Passenger:</span><b>${f.passengerName || "-"}</b></div>
      `;

      box.appendChild(div);
    });

  });
}

/* ---------- LIVE DRIVERS ---------- */
function liveDrivers() {

  onSnapshot(collection(db, "users"), snap => {

    // clear old markers
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    snap.forEach(docSnap => {

      const u = docSnap.data();

      if (u.role === "driver" && u.online && u.location) {

        const m = L.marker([u.location.lat, u.location.lng])
          .addTo(map)
          .bindPopup(`
            <b>${u.nickName || u.email}</b><br>
            Online Driver
          `);

        markers.push(m);
      }

    });

  });
}