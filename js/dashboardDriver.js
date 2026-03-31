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
   ETA CALCULATION
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
  const timeMinutes = Math.round((distance / 40) * 60);

  return {
    distance: distance.toFixed(2) + " km",
    eta: timeMinutes + " min"
  };
}

/* =========================================================
   GPS TRACKING
========================================================= */
function startLocationTracking() {
  if (!navigator.geolocation) return;

  watchId = navigator.geolocation.watchPosition(async (pos) => {
    await updateDoc(doc(db, "users", currentUser.uid), {
      location: {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      },
      lastActive: serverTimestamp()
    });
  });
}

function stopLocationTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

/* =========================================================
   AUTH + ROLE PROTECTION (FIXED)
========================================================= */
onAuthStateChanged(auth, async (user) => {

  if (!user) {
    location.href = "index.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));

  if (!snap.exists()) {
    location.href = "index.html";
    return;
  }

  const u = snap.data();

  // ✅ STRICT ROLE CHECK
  if (u.role !== "driver") {
    location.href = "dashboardPassenger.html";
    return;
  }

  currentUser = user;

  const name = u.nickName || user.email;
  isOnline = u.online || false;

  updateOnlineUI();

  if (isOnline) startLocationTracking();

  document.getElementById("userName").textContent = name;
  document.getElementById("userRole").textContent = "Driver";

  listenJobs();
});

/* =========================================================
   ONLINE TOGGLE
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
   UI
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
   LOGOUT
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
   BUTTONS
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
   JOB LISTENER
========================================================= */
function listenJobs() {

  const box = document.getElementById("jobList");

  let q;

  if (currentMode === "current") {
    q = query(collection(db, "fares"),
      where("status", "in", ["assigned","waiting response","accepted"])
    );
  } else {
    q = query(collection(db, "fares"),
      where("status", "in", ["declined","completed","deleted"])
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

      let etaHTML = "";

      if (isMine && f.pickupLat && f.pickupLng) {
        const userSnap = await getDoc(doc(db, "users", currentUser.uid));
        const loc = userSnap.data()?.location;

        if (loc) {
          const calc = calculateETA(loc.lat, loc.lng, f.pickupLat, f.pickupLng);

          etaHTML = `
            <div class="fare-row"><span>Distance:</span><b>${calc.distance}</b></div>
            <div class="fare-row"><span>ETA:</span><b>${calc.eta}</b></div>
          `;
        }
      }

      const div = document.createElement("div");
      div.className = "fare-card";

      div.innerHTML = `
        <div class="fare-row"><span>Pickup:</span><b>${f.pickup}</b></div>
        <div class="fare-row"><span>Drop:</span><b>${f.drop}</b></div>
        <div class="fare-row"><span>Status:</span><b>${f.status}</b></div>
        <div class="fare-row"><span>Passenger:</span><b>${f.passengerName || "-"}</b></div>
        ${etaHTML}
        ${renderActions(d.id, f, isMine)}
      `;

      box.appendChild(div);
    });

  });
}

/* =========================================================
   ACTIONS
========================================================= */
function renderActions(id, f, isMine) {

  const viewBtn = `<button class="lux-btn" onclick="viewRoute('${id}')">View Route</button>`;

  if (isMine && f.status === "waiting response") {
    return `
      ${viewBtn}
      <button onclick="acceptJob('${id}')">Accept</button>
      <button onclick="rejectJob('${id}')">Reject</button>
    `;
  }

  return viewBtn;
}

window.viewRoute = id => location.href = `mapView.html?id=${id}`;

window.acceptJob = async id => {
  await updateDoc(doc(db,"fares",id),{status:"accepted"});
  acceptSound.play();
};

window.rejectJob = async id => {
  await updateDoc(doc(db,"fares",id),{status:"declined"});
  declineSound.play();
};