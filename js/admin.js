import { db, auth } from "./firebase.js";

import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ---------- AUTH ---------- */
onAuthStateChanged(auth, async (user) => {

  if (!user) {
    location.href = "index.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));

  if (!snap.exists() || snap.data().role !== "admin") {
    alert("Access denied");
    location.href = "dashboardDriver.html";
    return;
  }

  loadUsers();
  loadJobs();
});

/* ---------- LOAD USERS ---------- */
function loadUsers() {

  const box = document.getElementById("usersList");

  onSnapshot(collection(db, "users"), snap => {

    box.innerHTML = "";

    snap.forEach(docSnap => {

      const u = docSnap.data();

      const div = document.createElement("div");
      div.className = "fare-card";

      div.innerHTML = `
        <div class="fare-row"><span>Email:</span><b>${u.email}</b></div>
        <div class="fare-row"><span>Role:</span><b>${u.role}</b></div>
        <div class="fare-row"><span>Status:</span>
          <b style="color:${u.online ? '#00e676' : '#ff5252'}">
            ${u.online ? "Online" : "Offline"}
          </b>
        </div>

        <div class="fare-actions">
          <button class="lux-btn" onclick="blockUser('${docSnap.id}')">Block</button>
          <button class="lux-btn" onclick="unblockUser('${docSnap.id}')">Unblock</button>
        </div>
      `;

      box.appendChild(div);
    });

  });
}

/* ---------- LOAD JOBS ---------- */
function loadJobs() {

  const box = document.getElementById("jobsList");

  onSnapshot(collection(db, "fares"), snap => {

    box.innerHTML = "";

    snap.forEach(docSnap => {

      const f = docSnap.data();

      const div = document.createElement("div");
      div.className = "fare-card";

      div.innerHTML = `
        <div class="fare-row"><span>Pickup:</span><b>${f.pickup}</b></div>
        <div class="fare-row"><span>Drop:</span><b>${f.drop}</b></div>
        <div class="fare-row"><span>Status:</span><b>${f.status}</b></div>

        <div class="fare-actions">
          <button class="lux-btn danger" onclick="cancelJob('${docSnap.id}')">
            Force Cancel
          </button>
        </div>
      `;

      box.appendChild(div);
    });

  });
}

/* ---------- ACTIONS ---------- */
window.blockUser = async (uid) => {
  await updateDoc(doc(db, "users", uid), {
    blocked: true
  });
  alert("User blocked");
};

window.unblockUser = async (uid) => {
  await updateDoc(doc(db, "users", uid), {
    blocked: false
  });
  alert("User unblocked");
};

window.cancelJob = async (id) => {
  await updateDoc(doc(db, "fares", id), {
    status: "deleted"
  });
  alert("Job cancelled by admin");
};