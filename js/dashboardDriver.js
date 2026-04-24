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



import {
  addDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";



let activeJobId = null;
let currentUser = null;
let currentMode = "current";
let isOnline = false;
let watchId = null;
let unsubscribe = null;
let popupAudio = new Audio("assets/job.mp3");
let popupInterval = null;

// 🔊 Sounds
const jobSound = new Audio("assets/job.mp3");
const acceptSound = new Audio("assets/accept.mp3");
const declineSound = new Audio("assets/decline.mp3");
let uiReady = false;

function setInstantUI(){
  const statusText = document.getElementById("onlineStatus");
  const toggleBtn = document.getElementById("toggleOnlineBtn");

  if(statusText) statusText.textContent = "● Loading...";
  if(toggleBtn) toggleBtn.textContent = "Loading...";
}
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
onAuthStateChanged(auth, (user) => {

  if (!user) {
    location.href = "index.html";
    return;
  }

  currentUser = user;

  setInstantUI(); // 🔥 UI instantly shows loading state

  getDoc(doc(db, "users", user.uid)).then((snap) => {

    const u = snap.data();
    isOnline = u?.online || false;

    document.getElementById("userName").textContent = u?.nickName || user.email;
    document.getElementById("userRole").textContent = u?.role || "driver";

    updateOnlineUI();

    if (isOnline) startLocationTracking();

    listenJobs(); // async but does NOT block UI

    loadFriends(user.uid);
    loadPassengers(user.uid);
    updateHeading()

    uiReady = true;
  });
});

/* ---------- /* ---------- SAFE BUTTON BINDING ---------- */
// ⚡ INSTANT UI LOAD (no waiting for Firebase)
document.addEventListener("DOMContentLoaded", () => {

  const toggleBtn = document.getElementById("toggleOnlineBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const currentBtn = document.getElementById("currentJobsBtn");
  
  const poolBtn = document.getElementById("poolJobsBtn");
  
  const pastBtn = document.getElementById("pastJobsBtn");

  if (toggleBtn) {
    toggleBtn.onclick = async () => {
      if (!currentUser) return;

      isOnline = !isOnline;

      updateOnlineUI(); // ⚡ instant UI

      await updateDoc(doc(db, "users", currentUser.uid), {
        online: isOnline,
        lastActive: serverTimestamp()
      });

      if (isOnline) startLocationTracking();
      else stopLocationTracking();
    };
  }

  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      if (!currentUser) return;

      stopLocationTracking();

      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }

      try {
        await updateDoc(doc(db, "users", currentUser.uid), {
          online: false,
          lastActive: serverTimestamp()
        });
      } catch (e) {}

      await signOut(auth);

      location.href = "index.html";
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

if (poolBtn) {
  poolBtn.onclick = () => {
    currentMode = "broadcast";
    updateHeading();
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

  if (unsubscribe) unsubscribe();

unsubscribe = onSnapshot(q, snap => {
    box.innerHTML = "";

    if (snap.empty) {
      box.innerHTML = `<div class="gold">No jobs found</div>`;
      return;
    }

    snap.forEach(d => {

      const f = d.data();
      
      if (
  f.status === "waiting response" &&
  f.assignedTo === currentUser.uid &&
  !f.popupShown
) {
  showPopup(`Pickup: ${f.pickupSuburb} → ${f.dropSuburb}`);

  updateDoc(doc(db, "fares", d.id), {
    popupShown: true
  });
}

const isBroadcast = f.broadcast === true;
const declinedByMe = (f.declinedBy || []).includes(currentUser.uid);

// 🔥 BROADCAST MODE (STRICT — ONLY POOL JOBS)
if (currentMode === "broadcast") {
  if (!(isBroadcast && f.status === "waiting response")) {
    return;
  }
}

// 🔥 CURRENT MODE
else if (currentMode === "current") {

  if (declinedByMe) return;

  if (!["waiting response","accepted","assigned","returned","arrived","in progress"].includes(f.status)) return;

  // Only my jobs (NOT broadcast ones)
  const isAssignedToMe = f.assignedTo === currentUser.uid;
const isMine = f.currentDriverUID === currentUser.uid;
const isCreator = f.originalDriverUID === currentUser.uid;

if (!(isAssignedToMe || isMine || isCreator)) return;
}

// 🔥 PAST MODE
else if (currentMode === "past") {

  if (
    !declinedByMe &&
    !["completed","deleted"].includes(f.status)
  ) return;
}
      const isAssigned = f.assignedTo === currentUser.uid;
      const isMine = (f.currentDriverUID || "") === currentUser.uid;      const isCreator = f.originalDriverUID === currentUser.uid;
      const isDeclinedByMe = (f.declinedBy || []).includes(currentUser.uid);

  

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

  // If I am ORIGINAL driver (A)
  if (f.originalDriverUID === currentUser.uid) {
    displayStatus = `Completed by ${f.currentDriverName || "driver"}`;
  }

  // If I am CURRENT driver (B)
  else {
    displayStatus = "Completed";
  }
}

// ✅ If accepted and I am ORIGINAL driver (A)
else if (f.status === "accepted" && f.originalDriverUID === currentUser.uid) {
  displayStatus = `accepted by ${f.currentDriverName || "driver"}`;
}

      div.innerHTML = `
  <div class="fare-row"><span>Pickup:</span><b>${f.pickupSuburb || f.pickup}</b></div>
  <div class="fare-row"><span>Drop:</span><b>${f.dropSuburb || f.drop}</b></div>
  
  <div class="fare-row">
  <span>Job ID:</span>
  <b>${f.jobId || "N/A"}</b>
</div>






  <div class="fare-row"><span>Status:</span><b class="status-text">${displayStatus}</b></div>
  <div class="fare-row"><span>Passenger:</span><b>${f.passengerName || "-"}</b></div>
  <div class="fare-row"><span>Original Driver:</span><b>${f.originalDriverName || "-"}</b></div>
  <div class="fare-row"><span>Current Driver:</span><b>${f.currentDriverName || "-"}</b></div>
  <div class="fare-row"><span>Price:</span><b>${f.priceType || ""} ${f.price || "-"}</b></div>
 <div class="fare-row"><span>Notes:</span><b>${(f.notes || "").toString()}</b>
 
 </div>


${renderContactBar(d.id, f, displayStatus)}

  ${renderActions(d.id, f, isMine, isAssigned, isCreator)}
`;

      box.appendChild(div);
      
      const statusEl = div.querySelector(".status-text");

if (statusEl) {
  // 🔥 FORCE GOLD COLOR
  statusEl.style.color = "#FFD700";

  // 🔥 ADD BLINK
  statusEl.classList.add("blink");

  setTimeout(() => {
    statusEl.classList.remove("blink");
  }, 4000);
}
      
    });

  });
}

function renderContactBar(id, f, displayStatus) {

  const s = (displayStatus || "").toLowerCase();

  const allow =
    s.includes("accepted") ||
    s.includes("arrived") ||
    s.includes("trip started") ||
    s.includes("in progress");

  if (!allow) return "";

  const phone = f.passengerPhone || f.originalDriverPhone || "";

  return `
    <div class="mini-bar">

      <button class="mini-btn" title="Chat"
        onclick='openChat("${id}", ${JSON.stringify(f)})'>💬</button>

      <button class="mini-btn" title="Call"
        onclick="callPhone('${phone}')">📞</button>

      <button class="mini-btn" title="WhatsApp"
        onclick="callWhatsApp('${phone}')">🟢</button>

    </div>
  `;
}

/* ---------- ACTION BUTTONS ---------- */
function renderActions(id, f, isMine, isAssigned, isCreator) {

  const viewBtn = `<button class="lux-btn" onclick="viewRoute('${id}')">View Route</button>`;


// ✅ POOL JOB LOGIC (ADD THIS BLOCK HERE)
if (f.broadcast === true && f.status === "waiting response") {

  // 🔹 CREATOR (A)
  if (f.originalDriverUID === currentUser.uid) {
    return `
      ${viewBtn}
      <div class="fare-actions">
        <button class="lux-btn danger" onclick="deleteJob('${id}')">Cancel</button>
      </div>
    `;
  }

  // 🔹 OTHER DRIVERS (B, C...)
  else {
    return `
      ${viewBtn}
      <div class="fare-actions">
        <button class="accept-btn" onclick="acceptJob('${id}')">Accept</button>
      </div>
    `;
  }
}

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
// CURRENT DRIVER
if (
  f.currentDriverUID === currentUser.uid &&
  ["accepted", "arrived", "in progress"].includes(f.status)
) {

  let extraBtns = "";

  // Passenger-created job
  if (f.passengerUID) {
    extraBtns = `
      <button class="lux-btn" onclick="editJob('${id}')">Resend</button>
    `;
  }

  return `
    ${viewBtn}
    <div class="fare-actions">
      ${extraBtns}
      <button class="lux-btn" onclick="markArrived('${id}')">Arrived</button>
      <button class="lux-btn" onclick="markStarted('${id}')">Start</button>
      <button class="lux-btn" onclick="markCompleted('${id}')">Complete</button>
      <button class="lux-btn danger" onclick="cancelAfterAccept('${id}')">Cancel</button>
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

  const jobRef = doc(db, "fares", id);

  const snap = await getDoc(jobRef);
  if (!snap.exists()) return;

  const f = snap.data();

  // ❌ STOP if already taken
  if (f.currentDriverUID && f.currentDriverUID !== currentUser.uid) {
    alert("Job already taken");
    return;
  }

  const userSnap = await getDoc(doc(db,"users",currentUser.uid));
  const myName = userSnap.data().nickName || currentUser.email;

  await updateDoc(jobRef,{
    status: "accepted",
    currentDriverUID: currentUser.uid,
    currentDriverName: myName,
    assignedTo: null
  });

  acceptSound.play();
};

window.rejectJob = async (id) => {

  const jobRef = doc(db, "fares", id);
  const snap = await getDoc(jobRef);

  if (!snap.exists()) return;

  const f = snap.data();

  const declinedList = f.declinedBy || [];

  const isPassengerJob = !!f.passengerUID;
  const amOriginalDriver =
    f.originalDriverUID === currentUser.uid;

  // ---------------------------------
  // CASE 1:
  // Passenger job and A rejects
  // Return to passenger
  // ---------------------------------
  if (isPassengerJob && amOriginalDriver) {

    await updateDoc(jobRef, {
      status: "waiting response",

      currentDriverUID: null,
      currentDriverName: null,

      assignedTo: null,
      soundPlayed: false,

      declinedBy: [...declinedList, currentUser.uid]
    });

    jobSound.pause();
    jobSound.currentTime = 0;
    declineSound.play();
    return;
  }

  // ---------------------------------
  // CASE 2:
  // B / C rejects -> return to A
  // ---------------------------------
  await updateDoc(jobRef, {
    status: "returned",

    currentDriverUID: f.originalDriverUID || null,
    currentDriverName: f.originalDriverName || "Driver",

    assignedTo: null,
    soundPlayed: false,

    declinedBy: [...declinedList, currentUser.uid]
  });

  jobSound.pause();
  jobSound.currentTime = 0;
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



window.cancelAfterAccept = async (id) => {

  const jobRef = doc(db, "fares", id);
  const snap = await getDoc(jobRef);

  if (!snap.exists()) return;

  const f = snap.data();

  acceptSound.play();

  // =========================
  // 🔵 POOL JOB
  // =========================
  if (f.broadcast === true) {

    await updateDoc(jobRef, {
      status: "waiting response",
      currentDriverUID: null,
      currentDriverName: null,
      assignedTo: null,
      updatedAt: serverTimestamp()
    });

    return;
  }

  // =========================
  // 🟡 FRIEND JOB (RETURN TO A)
  // =========================
  if (!f.broadcast && !f.autoDispatch) {

    await updateDoc(jobRef, {
      status: "returned",

      currentDriverUID: null,
      currentDriverName: null,
      assignedTo: null,

      // 👇 IMPORTANT: mark it back for creator view
      returnedToUID: f.originalDriverUID,

      updatedAt: serverTimestamp()
    });

    return;
  }

  // =========================
  // 🚀 AUTO DISPATCH JOB
  // =========================
  if (f.autoDispatch === true) {

    await updateDoc(jobRef, {
      status: "waiting response",

      currentDriverUID: null,
      currentDriverName: null,
      assignedTo: null,

      // 🔥 re-trigger dispatch flag
      dispatchReset: true,

      updatedAt: serverTimestamp()
    });

    // 🔥 RESTART DISPATCH ENGINE
    // (important)
    autoDispatch(
      id,
      f.pickupLat,
      f.pickupLng
    );

    return;
  }
};

function loadFriends(uid){

  const q = query(
    collection(db,"friends"),
    where("owner","==",uid)
  );

  onSnapshot(q, snap => {

    const select = document.getElementById("friendSelect");
    if (!select) return;

    select.innerHTML = '<option value="">Select Driver</option>';

    snap.forEach(d => {
      const f = d.data();

      const friendUID = f.friendUID || f.uid || f.driverUID;
      const name = f.name || f.nickName || f.email || "Driver";

      if (!friendUID) return;

      const opt = document.createElement("option");
      opt.value = friendUID;
      opt.textContent = name;

      select.appendChild(opt);
    });

  });

}

function loadPassengers(uid){

  const q = query(
    collection(db,"passengers"),
    where("owner","==",uid)
  );

  onSnapshot(q, snap => {

    const select = document.getElementById("passengerSelect");
    if (!select) return;

    select.innerHTML = '<option value="">Select Passenger</option>';

    snap.forEach(d => {
      const p = d.data();

      const passengerUID = p.passengerUID || p.uid;
      const name = p.nickName || p.name || p.email || "Passenger";

      if (!passengerUID) return;

      const opt = document.createElement("option");
      opt.value = passengerUID;
      opt.textContent = name;

      select.appendChild(opt);
    });

  });

}

function updateHeading() {
  const h = document.getElementById("jobHeading");

  console.log("Heading function called. Mode:", currentMode);
  console.log("Heading element:", h);

  if (!h) return;

  if (currentMode === "current") {
    h.textContent = "Current Jobs";
  } 
  else if (currentMode === "past") {
    h.textContent = "Past Jobs";
  } 
  else if (currentMode === "broadcast") {
    h.textContent = "Pool Broadcast Jobs";
  }
}

let popupSoundInterval = null;
let popupPlayCount = 0;

function showPopup(text) {
  const popup = document.getElementById("jobPopup");
  const txt = document.getElementById("popupText");

  if (!popup || !txt) return;
  currentMode = "current";
updateHeading();
listenJobs();

  txt.textContent = text;

  // ✅ CENTER FIX
  popup.style.left = "50%";
  popup.style.top = "20px";
  popup.style.transform = "translateX(-50%)";

  popup.classList.remove("hidden");

  // 🔊 PLAY SOUND MAX 4 TIMES
  popupPlayCount = 0;

  if (popupSoundInterval) clearInterval(popupSoundInterval);

  popupSoundInterval = setInterval(() => {
    if (popupPlayCount >= 4) {
      clearInterval(popupSoundInterval);
      return;
    }

    jobSound.currentTime = 0;
    jobSound.play();

    popupPlayCount++;
  }, 3000);
}

window.closePopup = function () {
  const popup = document.getElementById("jobPopup");

  if (popup) popup.classList.add("hidden");

  // 🔇 STOP SOUND
  if (popupSoundInterval) clearInterval(popupSoundInterval);
  jobSound.pause();
  jobSound.currentTime = 0;
};




function getChatRole(f) {

  const isOriginal = f.originalDriverUID === currentUser.uid;
  const isCurrent = f.currentDriverUID === currentUser.uid;

  if (isOriginal) return "original";
  if (isCurrent) return "current";

  return "none";
}


let chatUnsub = null;

let chatUnsub = null;

window.openChat = async (jobId, jobData) => {

  activeJobId = jobId;

  const modal = document.getElementById("chatModal");
  const box = document.getElementById("chatBox");
  const input = document.getElementById("chatInput");

  modal.style.display = "block";
  input.value = "";
  input.focus();

  // stop old listener
  if (chatUnsub) chatUnsub();

  const q = query(
    collection(db, "fares", jobId, "messages"),
    orderBy("timestamp")
  );

  chatUnsub = onSnapshot(q, snap => {

    box.innerHTML = "";

    snap.forEach(doc => {
      const m = doc.data();

      const div = document.createElement("div");

      div.style.margin = "5px 0";
      div.style.padding = "6px";
      div.style.borderRadius = "8px";
      div.style.background = m.senderId === currentUser.uid ? "#222" : "#333";

      div.innerHTML = `
        <b>${m.senderName}</b><br>
        ${m.text}
      `;

      box.appendChild(div);
    });

    box.scrollTop = box.scrollHeight;
  });
};



window.sendChat = async () => {

  const input = document.getElementById("chatInput");
  const text = input.value.trim();

  if (!text || !activeJobId) return;

  try {

    const userSnap = await getDoc(doc(db, "users", currentUser.uid));
    const name = userSnap.data()?.nickName || currentUser.email;

    await addDoc(collection(db, "fares", activeJobId, "messages"), {
      text,
      senderId: currentUser.uid,
      senderName: name,
      timestamp: serverTimestamp()
    });

    input.value = "";

  } catch (e) {
    console.error("Chat error:", e);
    alert("Chat failed");
  }
};



window.closeChat = () => {
  document.getElementById("chatModal").style.display = "none";

  if (chatUnsub) {
    chatUnsub();
    chatUnsub = null;
  }
};