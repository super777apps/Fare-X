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

  const snap = await getDoc(doc(db, "users", user.uid));

  if (!snap.exists()) {
    location.href = "index.html";
    return;
  }

  const u = snap.data();

  document.getElementById("userName").textContent =
    u.nickName || user.email;

  document.getElementById("userRole").textContent = "Passenger";

  bindButtons();
  updateHeading();
  listenJobs();
});

/* --------------------------------------------------
   BUTTONS
-------------------------------------------------- */
function bindButtons() {

  const createBtn   = document.getElementById("createFareBtn");
  const currentBtn  = document.getElementById("currentJobsBtn");
  const pastBtn     = document.getElementById("pastJobsBtn");
  const helpBtn     = document.getElementById("helpBtn");
  const logoutBtn   = document.getElementById("logoutBtn");
  const driversBtn  = document.getElementById("driversBtn");
  const profileBtn  = document.getElementById("profileBtn");

  if (createBtn) {
    createBtn.addEventListener("click", () => {
      location.href = "createPassenger.html";
    });
  }

  if (driversBtn) {
    driversBtn.addEventListener("click", () => {
      location.href = "passengerDriver.html";
    });
  }

  if (profileBtn) {
    profileBtn.addEventListener("click", () => {
      location.href = "passengerProfile.html";
    });
  }

  if (helpBtn) {
    helpBtn.addEventListener("click", () => {
      location.href = "help.html";
    });
  }

  if (currentBtn) {
    currentBtn.addEventListener("click", () => {
      currentMode = "current";
      updateHeading();
      listenJobs();
    });
  }

  if (pastBtn) {
    pastBtn.addEventListener("click", () => {
      currentMode = "past";
      updateHeading();
      listenJobs();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await signOut(auth);
      location.href = "index.html";
    });
  }
}/* --------------------------------------------------
   HEADING
-------------------------------------------------- */
function updateHeading(){

  const title = document.querySelector(".section-title");

  if(!title) return;

  if(currentMode === "current"){
    title.textContent = "Current Jobs";
  }else{
    title.textContent = "Past Jobs";
  }
}

/* --------------------------------------------------
   LISTEN JOBS
-------------------------------------------------- */
function listenJobs(){

  const box = document.getElementById("jobsList");

  const q = query(
    collection(db, "fares"),
    where("passengerUID", "==", currentUser.uid),
    orderBy("createdAt", "desc")
  );

  if(unsubscribe) unsubscribe();

  unsubscribe = onSnapshot(q, snap => {

    box.innerHTML = "";

    if(snap.empty){
      box.innerHTML = `<div class="gold">No jobs found</div>`;
      return;
    }

    snap.forEach(d => {

      const f = d.data();

      /* ---------------- CURRENT / PAST FILTER ---------------- */

      const currentStatuses = [
        "waiting response",
        "accepted",
        "assigned",
        "returned",
        "arrived",
        "in progress"
      ];

      const pastStatuses = [
        "completed",
        "deleted",
        "cancelled"
      ];

      if(currentMode === "current"){
        if(!currentStatuses.includes(f.status)) return;
      }

      if(currentMode === "past"){
        if(!pastStatuses.includes(f.status)) return;
      }

      /* ---------------- STATUS DISPLAY ---------------- */

      let displayStatus = f.status;

      if(f.status === "waiting response"){
        displayStatus = "Waiting for driver";
      }

      if(f.status === "accepted"){
        displayStatus =
          "Accepted by " +
          (f.currentDriverName || "Driver");
      }

      if(f.status === "arrived"){
        displayStatus =
          (f.currentDriverName || "Driver") +
          " arrived";
      }

      if(f.status === "in progress"){
        displayStatus = "Trip in progress";
      }

      if(f.status === "completed"){
        displayStatus = "Completed";
      }

      if(f.status === "deleted"){
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
          <b>${f.price || "-"}</b>
        </div>

        <div class="fare-row">
          <span>Driver:</span>
          <b>${f.originalDriverName || f.currentDriverName || "-"}</b>
        </div>

        <div class="fare-row">
          <span>Time:</span>
          <b>${f.time || "-"}</b>
        </div>
      `;

      box.appendChild(div);
    });

    if(box.innerHTML.trim() === ""){
      box.innerHTML = `<div class="gold">No jobs found</div>`;
    }

  });
}