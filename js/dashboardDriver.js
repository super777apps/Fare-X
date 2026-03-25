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
let watchId = null; // ✅ GPS tracker

// 🔊 Sounds
const jobSound = new Audio("assets/job.mp3");
const acceptSound = new Audio("assets/accept.mp3");
const declineSound = new Audio("assets/decline.mp3");

/* ---------- GPS TRACKING ---------- */
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

/* ---------- AUTH ---------- */
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

    // ✅ resume GPS if already online
    if (isOnline) startLocationTracking();
  }

  document.getElementById("userName").textContent = name;
  document.getElementById("userRole").textContent = role;

  listenJobs();
});

/* ---------- ONLINE TOGGLE ---------- */
const toggleBtn = document.getElementById("toggleOnlineBtn");

toggleBtn.onclick = async () => {

  isOnline = !isOnline;

  await updateDoc(doc(db, "users", currentUser.uid), {
    online: isOnline,
    lastActive: serverTimestamp()
  });

  if (isOnline) {
    startLocationTracking();   // ✅ START GPS
  } else {
    stopLocationTracking();    // ❌ STOP GPS
  }

  updateOnlineUI();
};

/* ---------- UPDATE UI ---------- */
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

  await updateDoc(doc(db, "users", currentUser.uid), {
    online: false
  });

  stopLocationTracking(); // ✅ stop GPS

  await signOut(auth);
  location.href = "index.html";
};

/* ---------- BUTTONS ---------- */
document.getElementById("currentJobsBtn").onclick = () => {
  currentMode = "current";
  listenJobs();
};

document.getElementById("pastJobsBtn").onclick = () => {
  currentMode = "past";
  listenJobs();
};

/* ---------- JOB LISTENER ---------- */
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

    snap.forEach(d => {

      const f = d.data();
      const isMine = f.currentDriverUID === currentUser.uid;

      const div = document.createElement("div");
      div.className = "fare-card";

      if (isMine && f.status === "waiting response") {
        jobSound.currentTime = 0;
        jobSound.play();
      }

      div.innerHTML = `
        <div class="fare-row"><span>Pickup:</span><b>${f.pickup}</b></div>
        <div class="fare-row"><span>Drop:</span><b>${f.drop}</b></div>
        <div class="fare-row"><span>Status:</span><b>${f.status}</b></div>
        <div class="fare-row"><span>Passenger:</span><b>${f.passengerName || "-"}</b></div>
        <div class="fare-row"><span>Original Driver:</span><b>${f.originalDriverName || "-"}</b></div>

        ${renderActions(d.id, f, isMine)}
      `;

      box.appendChild(div);
    });

  });
}

/* ---------- ACTIONS ---------- */
function renderActions(id, f, isMine) {

  if (["declined","completed","deleted"].includes(f.status)) {
    return `<div class="gold">Past Job</div>`;
  }

  if (isMine && f.status === "waiting response") {
    return `
      <div class="fare-actions">
        <button class="accept-btn" onclick="acceptJob('${id}')">Accept</button>
        <button class="cancel-btn" onclick="rejectJob('${id}')">Reject</button>
      </div>
    `;
  }

  if (isMine && f.status === "accepted") {
    return `
      <div class="fare-actions">
        <button class="lux-btn" onclick="markArrived('${id}')">Arrived</button>
        <button class="lux-btn" onclick="markStarted('${id}')">Start</button>
        <button class="lux-btn" onclick="markCompleted('${id}')">Complete</button>
      </div>
    `;
  }

  if (f.createdUid === currentUser.uid && f.status === "waiting response") {
    return `
      <div class="fare-actions">
        <button class="lux-btn" onclick="editJob('${id}')">Edit</button>
        <button class="lux-btn danger" onclick="deleteJob('${id}')">Cancel</button>
      </div>
    `;
  }

  return "";
}

/* ---------- HANDLERS ---------- */
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