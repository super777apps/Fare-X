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

const jobSound = new Audio("assets/job.mp3");

/* ---------- HELPER ---------- */
function getSuburb(text){
  if(!text) return "";
  return text.split(",")[0];
}

/* ---------- ETA ---------- */
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

/* ---------- AUTH ---------- */
onAuthStateChanged(auth, async (user) => {

  if (!user) return location.href = "index.html";

  const snap = await getDoc(doc(db, "users", user.uid));
  const u = snap.data();

  if (u.role !== "driver") {
    location.href = "dashboardPassenger.html";
    return;
  }

  currentUser = user;

  isOnline = u.online || false;
  updateOnlineUI();

  document.getElementById("userName").textContent = u.nickName || user.email;
  document.getElementById("userRole").textContent = "Driver";

  listenJobs();
});

/* ---------- JOB LIST ---------- */
function listenJobs() {

  const box = document.getElementById("jobList");

  const q = query(
    collection(db, "fares"),
    where("status", "in", ["accepted","assigned"])
  );

  onSnapshot(q, snap => {

    box.innerHTML = "";

    snap.forEach(async d => {

      const f = d.data();
      const isMine = f.currentDriverUID === currentUser.uid;

      /* 🔊 PLAY SOUND ONCE */
      if (isMine && f.status === "accepted" && !f.soundPlayed) {

        jobSound.play();

        await updateDoc(doc(db,"fares", d.id),{
          soundPlayed:true
        });
      }

      let etaHTML = "";

      if (f.pickupLat && f.dropLat) {

        const calc = calculateETA(
          f.pickupLat,
          f.pickupLng,
          f.dropLat,
          f.dropLng
        );

        etaHTML = `
          <div class="fare-row"><span>Trip:</span><b>${calc.distance}</b></div>
          <div class="fare-row"><span>ETA:</span><b>${calc.eta}</b></div>
        `;
      }

      const div = document.createElement("div");
      div.className = "fare-card";

      div.innerHTML = `
        <div class="fare-row"><span>Pickup:</span><b>${f.pickupSuburb || getSuburb(f.pickup)}</b></div>
        <div class="fare-row"><span>Drop:</span><b>${f.dropSuburb || getSuburb(f.drop)}</b></div>

        <div class="fare-row"><span>Status:</span><b>${f.status}</b></div>

        <div class="fare-row"><span>Passenger:</span><b>${f.passengerName || "-"}</b></div>
        <div class="fare-row"><span>Original Driver:</span><b>${f.originalDriverName || "-"}</b></div>
        <div class="fare-row"><span>Current Driver:</span><b>${f.currentDriverName || "-"}</b></div>

        <div class="fare-row"><span>Fare:</span><b>${f.price || "-"}</b></div>
        <div class="fare-row"><span>Pickup Time:</span><b>${f.time || "-"}</b></div>

        ${etaHTML}
      `;

      box.appendChild(div);
    });

  });
}

/* ---------- ONLINE UI ---------- */
const toggleBtn = document.getElementById("toggleOnlineBtn");

toggleBtn.onclick = async () => {

  isOnline = !isOnline;

  await updateDoc(doc(db, "users", currentUser.uid), {
    online: isOnline,
    lastActive: serverTimestamp()
  });

  updateOnlineUI();
};

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

/* ---------- LOGOUT ---------- */
document.getElementById("logoutBtn").onclick = async () => {
  await signOut(auth);
  location.href = "index.html";
};