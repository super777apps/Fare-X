import { db, auth } from "./firebase.js";

import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  serverTimestamp,
  orderBy
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

/* ---------- GPS TRACKING ---------- */
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

/* ---------- AUTH ---------- */
onAuthStateChanged(auth, async (user) => {

  if (!user) {
    location.href = "index.html";
    return;
  }

  currentUser = user;

  const snap = await getDoc(doc(db, "users", user.uid));
  const u = snap.data();

  isOnline = u?.online || false;

  document.getElementById("userName").textContent = u?.nickName || user.email;
  document.getElementById("userRole").textContent = u?.role || "driver";

  updateOnlineUI();

  if (isOnline) startLocationTracking();

  listenJobs();
});

/* ---------- SAFE BUTTON BINDING ---------- */
document.addEventListener("DOMContentLoaded", () => {

  const toggleBtn = document.getElementById("toggleOnlineBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const currentBtn = document.getElementById("currentJobsBtn");
  const pastBtn = document.getElementById("pastJobsBtn");

  if (toggleBtn) {
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
  }

  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await updateDoc(doc(db, "users", currentUser.uid), {
        online: false
      });

      stopLocationTracking();

      await signOut(auth);
      location.href = "index.html";
    };
  }

  if (currentBtn) {
    currentBtn.onclick = () => {
      currentMode = "current";
      listenJobs();
    };
  }

  if (pastBtn) {
    pastBtn.onclick = () => {
      currentMode = "past";
      listenJobs();
    };
  }

});

/* ---------- UPDATE UI ---------- */
function updateOnlineUI() {

  const statusText = document.getElementById("onlineStatus");
  const toggleBtn = document.getElementById("toggleOnlineBtn");

  if (!toggleBtn || !statusText) return;

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
   🚀 MAIN JOB LISTENER (UPDATED)
========================================================= */
function listenJobs() {

  const box = document.getElementById("jobList");

  const q = query(
    collection(db, "fares"),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, snap => {

    box.innerHTML = "";

    if (snap.empty) {
      box.innerHTML = `<div class="gold">No jobs found</div>`;
      return;
    }

    snap.forEach(d => {

      const f = d.data();

      const isAssigned = f.assignedTo === currentUser.uid;
      const isMine = (f.currentDriverUID || "") === currentUser.uid;      const isCreator = f.originalDriverUID === currentUser.uid;
      const isDeclinedByMe = (f.declinedBy || []).includes(currentUser.uid);

      // ❗ // ❗ SHOW ONLY RELATED JOBS (FIXED - KEEP ACTIVE JOBS SAFE)
const isActiveStatus = [
  "waiting response",
  "accepted",
  "assigned",
  "returned",
  "arrived",
  "in progress"
].includes(f.status);

// allow if user is related OR job is active and was mine before
if (!isAssigned && !isMine && !isCreator && !isDeclinedByMe) return;

      // ✅ CURRENT MODE
     if (currentMode === "current") {

  // ❌ Hide jobs declined by THIS driver (B)
  if ((f.declinedBy || []).includes(currentUser.uid)) return;

  // Normal current jobs
  if (!["waiting response","accepted","assigned","returned","arrived","in progress"].includes(f.status)) return;
}

      // ✅ PAST MODE
  if (currentMode === "past") {

  const declinedByMe = (f.declinedBy || []).includes(currentUser.uid);

  // ✅ Show declined jobs (for B)
  if (declinedByMe) {
    // allow showing
  }
  // ✅ Show completed/deleted
  else if (["completed","deleted"].includes(f.status)) {
    // allow showing
  }
  else {
    return;
  }
}
      const div = document.createElement("div");
      div.className = "fare-card";

      /* 🔊 SOUND */
      if (isAssigned && f.status === "waiting response" && !f.soundPlayed) {

        jobSound.loop = true;
        jobSound.play();

        setTimeout(()=>{
          jobSound.pause();
          jobSound.currentTime = 0;
        },12000);

        updateDoc(doc(db,"fares",d.id),{
          soundPlayed:true
        });
      }

     let displayStatus = f.status;

// Declined (for B)
if ((f.declinedBy || []).includes(currentUser.uid)) {
  displayStatus = "declined";
}

// Accepted by (for A)
else if (f.status === "accepted" && f.originalDriverUID === currentUser.uid) {
  displayStatus = `accepted by ${f.currentDriverName || "driver"}`;
}

// Arrived
else if (f.status === "arrived") {
  displayStatus = "Driver arrived";
}

// Started
else if (f.status === "in progress") {
  displayStatus = "Trip Started";
}

// Completed
else if (f.status === "completed") {
  displayStatus = "Completed";
}

// ✅ If accepted and I am ORIGINAL driver (A)
else if (f.status === "accepted" && f.originalDriverUID === currentUser.uid) {
  displayStatus = `accepted by ${f.currentDriverName || "driver"}`;
}

      div.innerHTML = `
  <div class="fare-row"><span>Pickup:</span><b>${f.pickupSuburb || f.pickup}</b></div>
  <div class="fare-row"><span>Drop:</span><b>${f.dropSuburb || f.drop}</b></div>
  <div class="fare-row"><span>Status:</span><b class="status-text">${displayStatus}</b></div>
  <div class="fare-row"><span>Passenger:</span><b>${f.passengerName || "-"}</b></div>
  <div class="fare-row"><span>Original Driver:</span><b>${f.originalDriverName || "-"}</b></div>
  <div class="fare-row"><span>Current Driver:</span><b>${f.currentDriverName || "-"}</b></div>
  <div class="fare-row"><span>Price:</span><b>${f.price || "-"}</b></div>
 <div class="fare-row"><span>Notes:</span><b>${(f.notes || "").toString()}</b></div>

  ${renderActions(d.id, f, isMine, isAssigned, isCreator)}
`;

      box.appendChild(div);
    });

  });
}

/* ---------- ACTION BUTTONS ---------- */
function renderActions(id, f, isMine, isAssigned, isCreator) {

  const viewBtn = `<button class="lux-btn" onclick="viewRoute('${id}')">View Route</button>`;

  // DRIVER RECEIVING
  if (isAssigned && f.status === "waiting response") {
    return `
      ${viewBtn}
      <div class="fare-actions">
        <button class="accept-btn" onclick="acceptJob('${id}')">Accept</button>
        <button class="cancel-btn" onclick="rejectJob('${id}')">Reject</button>
      </div>
    `;
  }

  // CURRENT DRIVER
  if (isMine && ["accepted","arrived","in progress"].includes(f.status)) {
  return `
    ${viewBtn}
    <div class="fare-actions">
      <button class="lux-btn" onclick="markArrived('${id}')">Arrived</button>
      <button class="lux-btn" onclick="markStarted('${id}')">Start</button>
      <button class="lux-btn" onclick="markCompleted('${id}')">Complete</button>
    </div>
  `;
}
  // ✅ ORIGINAL DRIVER (FIXED: RETURNED NOW HAS RESEND + CANCEL TOGETHER)
  if (isCreator && ["waiting response","accepted","returned"].includes(f.status)) {

    let extraBtn = "";

    if (f.status === "returned") {
      extraBtn = `<button class="lux-btn" onclick="editJob('${id}')">Resend</button>`;
    }

    return `
      ${viewBtn}
      <div class="fare-actions">
        ${extraBtn}
        <button class="lux-btn danger" onclick="deleteJob('${id}')">Cancel</button>
      </div>
    `;
  }

  return viewBtn;
}
/* ---------- HANDLERS ---------- */
window.acceptJob = async (id) => {

  const userSnap = await getDoc(doc(db,"users",currentUser.uid));
  const myName = userSnap.data().nickName || currentUser.email;

  await updateDoc(doc(db,"fares",id),{
    status:"accepted",
    currentDriverUID: currentUser.uid,
    currentDriverName: myName,
    assignedTo:null
  });

  jobSound.pause();
  acceptSound.play();
};

window.rejectJob = async (id) => {

  const snap = await getDoc(doc(db,"fares",id));
  const f = snap.data();

  const declinedList = f.declinedBy || [];

  await updateDoc(doc(db,"fares",id),{
    status:"returned",
    currentDriverUID: f.originalDriverUID,
    currentDriverName: f.originalDriverName,
    assignedTo:null,
    soundPlayed:false,
    declinedBy: [...declinedList, currentUser.uid] // ✅ KEY FIX
  });

  jobSound.pause();
  declineSound.play();
};

window.markArrived = async (id) => {
  await updateDoc(doc(db,"fares",id),{
    status:"arrived"
  });
  acceptSound.play();
};

window.markStarted = async (id) => {
  await updateDoc(doc(db,"fares",id),{
    status:"in progress"
  });
  acceptSound.play();
};

window.markCompleted = async (id) => {
  await updateDoc(doc(db,"fares",id),{
    status:"completed"
  });
  acceptSound.play();
};

window.viewRoute = id => location.href = `mapView.html?id=${id}`;
window.editJob = id => location.href = `create.html?id=${id}`;

window.deleteJob = async id => {
  if(!confirm("Cancel this job?")) return;
  await updateDoc(doc(db,"fares",id),{status:"deleted"});
};