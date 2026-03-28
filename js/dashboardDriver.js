import { db, auth } from "./firebase.js";

import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;
let currentMode = "current";
let isOnline = false;
let watchId = null;

// 🔊 Sounds
const jobSound = new Audio("assets/job.mp3");
const acceptSound = new Audio("assets/accept.mp3");
const declineSound = new Audio("assets/decline.mp3");

/* =========================================================
   ✅ NEW: ETA CALCULATION (simple fallback)
========================================================= */
function calculateETA(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI/180;
  const dLng = (lng2 - lng1) * Math.PI/180;

  const a =
    Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180) *
    Math.cos(lat2*Math.PI/180) *
    Math.sin(dLng/2)**2;

  const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  // assume avg 40km/h
  const timeMinutes = Math.round((distance / 40) * 60);

  return {
    distance: distance.toFixed(2) + " km",
    eta: timeMinutes + " min"
  };
}

/* =========================================================
   GPS TRACKING (UNCHANGED + ENHANCED)
========================================================= */
function startLocationTracking() {

  if (!navigator.geolocation) {
    alert("GPS not supported");
    return;
  }

  watchId = navigator.geolocation.watchPosition(async (pos) => {

    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    await updateDoc(doc(db, "users", currentUser.uid), {
      location: { lat, lng },
      lastActive: serverTimestamp()
    });

  }, (err) => {
    console.error(err);
  }, {
    enableHighAccuracy: true
  });
}

function stopLocationTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

/* =========================================================
   AUTH (UNCHANGED)
========================================================= */
onAuthStateChanged(auth, async (user) => {

  if (!user) {
    location.href = "index.html";
    return;
  }

  currentUser = user;

  const snap = await getDoc(doc(db, "users", user.uid));

  let name = user.email;
  let role = "driver";

  if (snap.exists()) {
    const u = snap.data();
    name = u.nickName || user.email;
    role = u.role || "driver";

    isOnline = u.online || false;
    updateOnlineUI();

    if (isOnline) startLocationTracking();
  }

  document.getElementById("userName").textContent = name;
  document.getElementById("userRole").textContent = role;

  listenJobs();
});

/* =========================================================
   ONLINE TOGGLE (UNCHANGED)
========================================================= */
const toggleBtn = document.getElementById("toggleOnlineBtn");

toggleBtn.onclick = async () => {

  isOnline = !isOnline;

  await updateDoc(doc(db, "users", currentUser.uid), {
    online: isOnline,
    lastActive: serverTimestamp()
  });

  if (isOnline) startLocationTracking();
  else stopLocationTracking();

  updateOnlineUI();
};

/* =========================================================
   UI (UNCHANGED)
========================================================= */
function updateOnlineUI() {

  const statusText = document.getElementById("onlineStatus");

  if (isOnline) {
    toggleBtn.textContent = "Go Offline";
    statusText.textContent = "● Online";
    statusText.style.color = "#00e676";
  } else {
    toggleBtn.textContent = "Go Online";
    statusText.textContent = "● Offline";
    statusText.style.color = "#ff5252";
  }
}

/* =========================================================
   LOGOUT (UNCHANGED)
========================================================= */
document.getElementById("logoutBtn").onclick = async () => {

  await updateDoc(doc(db, "users", currentUser.uid), {
    online: false
  });

  stopLocationTracking();

  await signOut(auth);
  location.href = "index.html";
};

/* =========================================================
   BUTTONS (UNCHANGED)
========================================================= */
document.getElementById("currentJobsBtn").onclick = () => {
  currentMode = "current";
  listenJobs();
};

document.getElementById("pastJobsBtn").onclick = () => {
  currentMode = "past";
  listenJobs();
};

/* =========================================================
   JOB LISTENER (ENHANCED)
========================================================= */
function listenJobs() {

  const box = document.getElementById("jobList");

  let q;

  if (currentMode === "current") {
    q = query(
      collection(db, "fares"),
      where("status", "in", [
        "assigned",
        "waiting response",
        "accepted"
      ])
    );
  } else {
    q = query(
      collection(db, "fares"),
      where("status", "in", [
        "declined",
        "completed",
        "deleted"
      ])
    );
  }

  onSnapshot(q, snap => {

    box.innerHTML = "";

    if (snap.empty) {
      box.innerHTML = `<div class="gold">No jobs found</div>`;
      return;
    }

    snap.forEach(async d => {

      const f = d.data();
      const isMine = f.currentDriverUID === currentUser.uid;

      const div = document.createElement("div");
      div.className = "fare-card";

      if (isMine && f.status === "waiting response") {
        jobSound.currentTime = 0;
        jobSound.play();
      }

      /* ===============================
         ✅ NEW: ETA DISPLAY
      =============================== */
      let etaHTML = "";

      if (isMine && f.pickupLat && f.pickupLng) {
        const userSnap = await getDoc(doc(db, "users", currentUser.uid));
        const driverLoc = userSnap.data()?.location;

        if (driverLoc) {
          const calc = calculateETA(
            driverLoc.lat,
            driverLoc.lng,
            f.pickupLat,
            f.pickupLng
          );

          etaHTML = `
            <div class="fare-row"><span>Distance:</span><b>${calc.distance}</b></div>
            <div class="fare-row"><span>ETA:</span><b>${calc.eta}</b></div>
          `;
        }
      }

      div.innerHTML = `
        <div class="fare-row"><span>Pickup:</span><b>${f.pickup}</b></div>
        <div class="fare-row"><span>Drop:</span><b>${f.drop}</b></div>
        <div class="fare-row"><span>Status:</span><b>${f.status}</b></div>
        <div class="fare-row"><span>Passenger:</span><b>${f.passengerName || "-"}</b></div>
        <div class="fare-row"><span>Original Driver:</span><b>${f.originalDriverName || "-"}</b></div>

        ${etaHTML}

        ${renderActions(d.id, f, isMine)}
      `;

      box.appendChild(div);
    });

  });
}

/* =========================================================
   VIEW ROUTE (UNCHANGED)
========================================================= */
window.viewRoute = (id) => {
  location.href = `mapView.html?id=${id}`;
};

/* =========================================================
   ACTIONS (UNCHANGED)
========================================================= */
function renderActions(id, f, isMine) {

  const viewBtn = `
    <button class="lux-btn" onclick="viewRoute('${id}')">View Route</button>
  `;

  if (["declined","completed","deleted"].includes(f.status)) {
    return viewBtn + `<div class="gold">Past Job</div>`;
  }

  if (isMine && f.status === "waiting response") {
    return `
      ${viewBtn}
      <div class="fare-actions">
        <button class="accept-btn" onclick="acceptJob('${id}')">Accept</button>
        <button class="cancel-btn" onclick="rejectJob('${id}')">Reject</button>
      </div>
    `;
  }

  if (isMine && f.status === "accepted") {
    return `
      ${viewBtn}
      <div class="fare-actions">
        <button class="lux-btn" onclick="markArrived('${id}')">Arrived</button>
        <button class="lux-btn" onclick="markStarted('${id}')">Start</button>
        <button class="lux-btn" onclick="markCompleted('${id}')">Complete</button>
      </div>
    `;
  }

  if (f.createdUid === currentUser.uid && f.status === "waiting response") {
    return `
      ${viewBtn}
      <div class="fare-actions">
        <button class="lux-btn" onclick="editJob('${id}')">Edit</button>
        <button class="lux-btn danger" onclick="deleteJob('${id}')">Cancel</button>
      </div>
    `;
  }

  return viewBtn;
}

/* =========================================================
   HANDLERS (UNCHANGED)
========================================================= */
window.acceptJob = async (id) => {
  await updateDoc(doc(db,"fares",id),{
    status:"accepted",
    currentDriverUID:currentUser.uid
  });
  acceptSound.play();
};

window.rejectJob = async (id) => {
  await updateDoc(doc(db,"fares",id),{
    status:"declined"
  });
  declineSound.play();
};

window.markArrived = async id => updateDoc(doc(db,"fares",id),{status:"arrived"});
window.markStarted = async id => updateDoc(doc(db,"fares",id),{status:"in progress"});
window.markCompleted = async id => updateDoc(doc(db,"fares",id),{status:"completed"});

window.editJob = id => location.href=`create.html?id=${id}`;

window.deleteJob = async id => {
  if(!confirm("Cancel this job?")) return;
  await updateDoc(doc(db,"fares",id),{status:"deleted"});
  alert("Job cancelled");
};