import { db, auth } from "./firebase.js";

import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  getDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* --------------------------------------------------
   STATE
-------------------------------------------------- */
let currentUser = null;
let currentMode = "current"; // current / past
let unsubscribe = null;

/* --------------------------------------------------
   AUTH
-------------------------------------------------- */
onAuthStateChanged(auth, async (user) => {

  if (!user) {
    location.href = "index.html";
    return;
  }

  currentUser = user;

  /* SHOW INSTANTLY */
  document.getElementById("userName").textContent = user.email;
  document.getElementById("userRole").textContent = "Passenger";

  bindButtons();
  updateHeading();
  listenJobs();

  /* LOAD PROFILE IN BACKGROUND */
  try {
    const snap = await getDoc(doc(db, "users", user.uid));

    if (snap.exists()) {
      const u = snap.data();

      if (u.nickName) {
        document.getElementById("userName").textContent = u.nickName;
      }
    }
  } catch (e) {}
});

/* --------------------------------------------------
   BUTTONS
-------------------------------------------------- */
function bindButtons() {

  const createBtn  = document.getElementById("createFareBtn");
  const currentBtn = document.getElementById("currentJobsBtn");
  const pastBtn    = document.getElementById("pastJobsBtn");
  const helpBtn    = document.getElementById("helpBtn");
  const logoutBtn  = document.getElementById("logoutBtn");
  const driversBtn = document.getElementById("driversBtn");
  const profileBtn = document.getElementById("profileBtn");

  if (createBtn) {
    createBtn.onclick = () => {
      location.href = "createPassenger.html";
    };
  }

  if (driversBtn) {
    driversBtn.onclick = () => {
      location.href = "passengerDriver.html";
    };
  }

  if (profileBtn) {
    profileBtn.onclick = () => {
      location.href = "passengerProfile.html";
    };
  }

  if (helpBtn) {
    helpBtn.onclick = () => {
      location.href = "help.html";
    };
  }

  if (currentBtn) {
    currentBtn.onclick = () => {
      currentMode = "current";
      updateHeading();
      listenJobs();
    };
  }

  if (pastBtn) {
    pastBtn.onclick = () => {
      currentMode = "past";
      updateHeading();
      listenJobs();
    };
  }

  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await signOut(auth);
      location.href = "index.html";
    };
  }
}

/* --------------------------------------------------
   HEADING
-------------------------------------------------- */
function updateHeading() {

  const title = document.querySelector(".section-title");

  if (!title) return;

  title.textContent =
    currentMode === "current"
      ? "Current Jobs"
      : "Past Jobs";
}

/* --------------------------------------------------
   LISTEN JOBS
-------------------------------------------------- */
function listenJobs() {

  const box = document.getElementById("jobsList");

  const q = query(
  collection(db, "fares"),
  where("passengerUID", "==", currentUser.uid)
);

  if (unsubscribe) unsubscribe();

  unsubscribe = onSnapshot(q, snap => {

    box.innerHTML = "";

    if (snap.empty) {
      box.innerHTML = `<div class="gold">No jobs found</div>`;
      return;
    }

    snap.forEach(d => {

      const f = d.data();

      const status = (f.status || "requested").toLowerCase();

      /* ---------------- CURRENT / PAST FILTER ---------------- */

      const currentStatuses = [
        "requested",
        "waiting response",
        "pending",
        "accepted",
        "assigned",
        "returned",
        "arrived",
        "in progress",
        "started"
      ];

      const pastStatuses = [
        "completed",
        "complete",
        "deleted",
        "cancelled",
        "cancel"
      ];

      if (currentMode === "current") {
        if (pastStatuses.includes(status)) return;
      }

      if (currentMode === "past") {
        if (!pastStatuses.includes(status)) return;
      }

      /* ---------------- STATUS DISPLAY ---------------- */

      let displayStatus = status;

      if (status === "requested") {
        displayStatus = "Requested";
      }

      if (status === "waiting response") {
        displayStatus = "Waiting for driver";
      }

      if (status === "accepted") {
        displayStatus =
          "Accepted by " +
          (f.currentDriverName || "Driver");
      }

      if (status === "assigned") {
        displayStatus = "Assigned";
      }

      if (status === "returned") {
        displayStatus = "Returned";
      }

      if (status === "arrived") {
        displayStatus =
          (f.currentDriverName || "Driver") +
          " arrived";
      }

      if (status === "in progress" || status === "started") {
        displayStatus = "Trip in progress";
      }

      if (status === "completed" || status === "complete") {
        displayStatus = "Completed";
      }

      if (
        status === "deleted" ||
        status === "cancelled" ||
        status === "cancel"
      ) {
        displayStatus = "Cancelled";
      }

      /* ---------------- CARD ---------------- */

      const div = document.createElement("div");
      div.className = "fare-card";

      div.innerHTML = `
        <div class="fare-row">
          <span>Job ID:</span>
          <b>${f.jobId || "N/A"}</b>
        </div>

        <div class="fare-row">
          <span>Pickup:</span>
          <b>${f.pickupSuburb || f.pickup || "-"}</b>
        </div>

        <div class="fare-row">
          <span>Drop:</span>
          <b>${f.dropSuburb || f.drop || "-"}</b>
        </div>

        <div class="fare-row">
          <span>Status:</span>
          <b class="status-text">${displayStatus}</b>
        </div>

        <div class="fare-row">
          <span>Price:</span>
          <b>${f.priceType || ""} ${f.price || "-"}</b>
        </div>

        <div class="fare-row">
          <span>Driver:</span>
          <b>${f.originalDriverName || f.currentDriverName || "-"}</b>
        </div>

        <div class="fare-row">
          <span>Time:</span>
          <b>${f.time || "-"}</b>
        </div>

        <div class="fare-row">
          <span>Notes:</span>
          <b>${f.notes || "-"}</b>
        </div>
      `;

      box.appendChild(div);
    });

    if (box.innerHTML.trim() === "") {
      box.innerHTML = `<div class="gold">No jobs found</div>`;
    }

  });
}