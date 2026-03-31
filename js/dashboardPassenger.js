import { db, auth } from "./firebase.js";

import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;

/* =========================================================
   AUTH + ROLE FIX
========================================================= */
onAuthStateChanged(auth, async user => {

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
  if (u.role !== "passenger") {
    location.href = "dashboardDriver.html";
    return;
  }

  currentUser = user;

  document.getElementById("userName").textContent = user.email;
  document.getElementById("userRole").textContent = "Passenger";

  listenMyJobs();
});

/* =========================================================
   JOBS
========================================================= */
function listenMyJobs() {

  const box = document.getElementById("jobsList");

  const q = query(
    collection(db, "fares"),
    where("passengerUID", "==", currentUser.uid)
  );

  onSnapshot(q, snap => {

    box.innerHTML = "";

    if (snap.empty) {
      box.innerHTML = `<div class="gold">No jobs</div>`;
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
      `;

      box.appendChild(div);
    });

  });
}

/* =========================================================
   LOGOUT
========================================================= */
document.getElementById("logoutBtn").onclick = async () => {
  await signOut(auth);
  location.href = "index.html";
};