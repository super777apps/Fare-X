import { db, auth } from "./firebase.js";

import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;
let currentMode = "current"; // current or past

/* ---------- AUTH ---------- */
onAuthStateChanged(auth, async (user) => {

  if (!user) {
    location.href = "index.html";
    return;
  }

  currentUser = user;

  /* LOAD USER INFO */
  const snap = await getDoc(doc(db, "users", user.uid));

  let name = user.email;
  let role = "driver";

  if (snap.exists()) {
    const u = snap.data();
    name = u.nickName || user.email;
    role = u.role || "driver";
  }

  document.getElementById("userName").textContent = name;
  document.getElementById("userRole").textContent = role;

  listenJobs(); // default load
});

/* ---------- LOGOUT ---------- */
document.getElementById("logoutBtn").onclick = async () => {
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
      where("status", "in", ["requested", "assigned", "accepted", "returned"])
    );
  } else {
    q = query(
      collection(db, "fares"),
      where("status", "in", ["completed", "deleted"])
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

      const div = document.createElement("div");
      div.className = "fare-card";

      div.innerHTML = `
        <div class="fare-row"><span>Pickup:</span><b>${f.pickup}</b></div>
        <div class="fare-row"><span>Drop:</span><b>${f.drop}</b></div>
        <div class="fare-row"><span>Status:</span><b>${f.status}</b></div>
        <div class="fare-row"><span>Passenger:</span><b>${f.passengerName || "-"}</b></div>
        <div class="fare-row"><span>Original Driver:</span><b>${f.createdBy || "-"}</b></div>

        <div class="fare-actions">
          <button class="lux-btn" onclick="editJob('${d.id}')">Edit</button>
          <button class="lux-btn danger" onclick="deleteJob('${d.id}')">Delete</button>
        </div>
      `;

      box.appendChild(div);
    });

  });
}

/* ---------- EDIT ---------- */
window.editJob = (id) => {
  location.href = `create.html?id=${id}`;
};

/* ---------- DELETE ---------- */
window.deleteJob = async (id) => {

  if (!confirm("Delete this job?")) return;

  await updateDoc(doc(db, "fares", id), {
    status: "deleted"
  });

  alert("Job deleted");
};