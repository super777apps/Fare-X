import { db, auth } from "./firebase.js";

import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ---------------- STATE ---------------- */
let currentUser = null;
let currentMode = "current";

/* =========================================================
   AUTH
========================================================= */
onAuthStateChanged(auth, async user => {

  if (!user) {
    location.href = "index.html";
    return;
  }

  currentUser = user;

  const snap = await getDoc(doc(db, "users", user.uid));

  if (!snap.exists()) {
    location.href = "index.html";
    return;
  }

  const u = snap.data();

  document.getElementById("userName").textContent =
    u.nickName || user.email;

  document.getElementById("userRole").textContent =
    "Passenger";

  bindButtons();
  listenMyJobs();
});

/* =========================================================
   BUTTONS
========================================================= */
function bindButtons() {

  const createBtn  = document.getElementById("createFareBtn");
  const driversBtn = document.getElementById("driversBtn");
  const profileBtn = document.getElementById("profileBtn");
  const logoutBtn  = document.getElementById("logoutBtn");

  const currentBtn = document.getElementById("currentJobsBtn");
  const pastBtn    = document.getElementById("pastJobsBtn");

  /* ---------- NAV ---------- */

  if (createBtn) {
    createBtn.onclick = () => {
      location.href = "createPassenger.html";
    };
  }

  if (driversBtn) {
    driversBtn.onclick = () => {
      alert("Drivers page not linked yet");
    };
  }

  if (profileBtn) {
    profileBtn.onclick = () => {
      alert("Profile page not linked yet");
    };
  }

  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await signOut(auth);
      location.href = "index.html";
    };
  }

  /* ---------- JOB FILTER ---------- */

  if (currentBtn) {
    currentBtn.onclick = () => {
      currentMode = "current";
      listenMyJobs();
    };
  }

  if (pastBtn) {
    pastBtn.onclick = () => {
      currentMode = "past";
      listenMyJobs();
    };
  }
}

/* =========================================================
   JOB LIST
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
      box.innerHTML = `<div class="gold">No jobs found</div>`;
      return;
    }

    snap.forEach(d => {

      const f = d.data();

      const isPast =
        f.status === "completed" ||
        f.status === "deleted";

      /* ---------- FILTER ---------- */

      if (currentMode === "current" && isPast) return;

      if (currentMode === "past" && !isPast) return;

      /* ---------- CARD ---------- */

      const div = document.createElement("div");
      div.className = "fare-card";

      div.innerHTML = `
        <div class="fare-row">
          <span>Job ID:</span>
          <b>${f.jobId || "N/A"}</b>
        </div>

        <div class="fare-row">
          <span>Pickup:</span>
          <b>${f.pickupSuburb || f.pickup}</b>
        </div>

        <div class="fare-row">
          <span>Drop:</span>
          <b>${f.dropSuburb || f.drop}</b>
        </div>

        <div class="fare-row">
          <span>Status:</span>
          <b>${f.status}</b>
        </div>

        <div class="fare-row">
          <span>Driver:</span>
          <b>${f.currentDriverName || "-"}</b>
        </div>
      `;

      box.appendChild(div);
    });

  });
}