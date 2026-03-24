import { db, auth } from "./firebase.js";

import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;

/* ---------- AUTH ---------- */
onAuthStateChanged(auth, async (user) => {

  if (!user) {
    location.href = "index.html";
    return;
  }

  currentUser = user;

  /* LOAD USER PROFILE */
  const snap = await getDoc(doc(db, "users", user.uid));

  let name = user.email;
  let role = "Passenger";

  if (snap.exists()) {
    const u = snap.data();
    name = u.nickName || user.email;
    role = u.role || "passenger";
  }

  document.getElementById("userName").textContent = name;
  document.getElementById("userRole").textContent = role;

  /* LOAD JOBS AUTOMATICALLY */
  listenJobs();
});

/* ---------- BUTTONS ---------- */

document.getElementById("createFareBtn").onclick = () => {
  location.href = "createPassenger.html";
};

document.getElementById("driversBtn").onclick = () => {
  location.href = "passengerDriver.html";
};

document.getElementById("profileBtn").onclick = () => {
  location.href = "passengerProfile.html";
};

document.getElementById("helpBtn").onclick = () => {
  location.href = "help.html";
};

document.getElementById("jobsBtn").onclick = () => {
  listenJobs();
};

/* LOGOUT */
document.getElementById("logoutBtn").onclick = async () => {
  await signOut(auth);
  location.href = "index.html";
};

/* ---------- JOBS (LIVE AUTO LOAD) ---------- */

function listenJobs() {

  const q = query(
    collection(db, "fares"),
    where("passengerUID", "==", currentUser.uid)
  );

  const box = document.getElementById("jobsList");

  onSnapshot(q, snap => {

    box.innerHTML = "";

    if (snap.empty) {
      box.innerHTML = `<div class="gold">No jobs yet</div>`;
      return;
    }

    snap.forEach(d => {

      const f = d.data();

      const div = document.createElement("div");
      div.className = "fare-card";

      div.innerHTML = `
        <div class="fare-row"><span>Pickup:</span><b>${f.pickup}</b></div>
        <div class="fare-row"><span>Drop:</span><b>${f.drop}</b></div>
        <div class="fare-row"><span>Time:</span><b>${f.time}</b></div>
        <div class="fare-row"><span>Price:</span><b>${f.price}</b></div>
        <div class="fare-row"><span>Status:</span><b>${f.status}</b></div>
      `;

      box.appendChild(div);
    });

  });
}