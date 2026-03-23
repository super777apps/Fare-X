import { db, auth } from "./firebase.js";

import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;

const nameBox = document.getElementById("passengerName");
const roleBox = document.getElementById("passengerRole");
const jobsList = document.getElementById("jobsList");
const pageContainer = document.getElementById("pageContainer");

/* ---------- AUTH ---------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "index.html";
    return;
  }

  currentUser = user;

  const snap = await getDoc(doc(db, "users", user.uid));

  if (snap.exists()) {
    const u = snap.data();
    nameBox.textContent = u.nickName || user.email;
    roleBox.textContent = u.role || "passenger";
  } else {
    nameBox.textContent = user.email;
    roleBox.textContent = "passenger";
  }

  loadJobs();
});

/* ---------- LOGOUT ---------- */
document.getElementById("logoutBtn").onclick = async () => {
  await signOut(auth);
  location.href = "index.html";
};

/* ---------- NAVIGATION ---------- */
document.getElementById("createFareBtn").onclick = () => openPage("createPassenger.html");
document.getElementById("driversBtn").onclick = () => {
  window.location.href = "passengerDrivers.html";
};
document.getElementById("profileBtn").onclick = () => openPage("passengerProfile.html");
document.getElementById("helpBtn").onclick = () => openPage("help.html");

/* NEW JOB BUTTON */
document.getElementById("jobsBtn").onclick = () => {
  pageContainer.innerHTML = ""; // clear iframe
  loadJobs(); // refresh jobs
};

/* ---------- PAGE LOADER ---------- */
function openPage(url) {
  pageContainer.innerHTML = `
    <iframe src="${url}" 
      style="width:100%; height:600px; border:none; border-radius:12px;">
    </iframe>
  `;
}

/* ---------- LOAD JOBS ---------- */
function loadJobs() {
  const q = query(
    collection(db, "fares"),
    where("passengerUID", "==", currentUser.uid)
  );

  onSnapshot(q, (snap) => {
    jobsList.innerHTML = "";

    snap.forEach((docSnap) => {
      const f = docSnap.data();

      const div = document.createElement("div");
      div.className = "fare-card";

      div.innerHTML = `
        <div class="fare-row"><span>From:</span><b>${f.pickup}</b></div>
        <div class="fare-row"><span>To:</span><b>${f.drop}</b></div>
        <div class="fare-row"><span>Status:</span><b>${f.status}</b></div>
        <div class="fare-row"><span>Driver:</span><b>${f.originalDriverName || f.originalDriverUID || "N/A"}</b></div>

        <div class="fare-actions">
          <button class="lux-btn" onclick="editJob('${docSnap.id}')">Edit</button>
          <button class="lux-btn danger" onclick="deleteJob('${docSnap.id}')">Delete</button>
          <button class="lux-btn" onclick="resendJob('${docSnap.id}')">Resend</button>
        </div>
      `;

      jobsList.appendChild(div);
    });
  });
}

/* ---------- JOB ACTIONS ---------- */
window.editJob = (id) => {
  openPage(`createPassenger.html?id=${id}`);
};

window.deleteJob = async (id) => {
  if (!confirm("Delete this job?")) return;

  await updateDoc(doc(db, "fares", id), {
    status: "deleted"
  });

  alert("Job deleted");
};

window.resendJob = (id) => {
  openPage(`createPassenger.html?id=${id}`);
};