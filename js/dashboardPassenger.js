import { db, auth } from "./firebase.js";
import { collection, query, where, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;

const passengerInfo = document.getElementById("passengerInfo");
const jobsList = document.getElementById("jobsList");

/* ---------- AUTH ---------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "index.html";
    return;
  }
  currentUser = user;

  // Show nickname and role
  const userSnap = await getDocs(collection(db, "users"));
  const docRef = userSnap.docs.find(d => d.id === currentUser.uid);
  const u = docRef ? docRef.data() : null;
  const nick = u?.nickName || currentUser.email;
  passengerInfo.textContent = `${nick} – Passenger`;

  loadJobs();
});

/* ---------- BUTTONS ---------- */
document.getElementById("createFareBtn").onclick = () => {
  window.location.href = "createPassenger.html";
};

document.getElementById("driversBtn").onclick = () => {
  window.location.href = "passengerDriver.html";
};

document.getElementById("profileBtn").onclick = () => {
  window.location.href = "passengerProfile.html";
};

document.getElementById("helpBtn").onclick = () => {
  window.location.href = "help.html";
};

document.getElementById("jobsBtn").onclick = () => {
  loadJobs();
};

/* ---------- LOAD JOBS ---------- */
async function loadJobs() {
  const q = query(collection(db, "fares"), where("passengerUID", "==", currentUser.uid));
  onSnapshot(q, snap => {
    jobsList.innerHTML = "";
    if (snap.empty) {
      jobsList.innerHTML = `<div class="gold">No jobs yet</div>`;
      return;
    }

    snap.forEach(docSnap => {
      const f = docSnap.data();
      const div = document.createElement("div");
      div.className = "fare-card";
      div.innerHTML = `
        <div class="fare-row"><span>Pickup:</span><b>${f.pickup}</b></div>
        <div class="fare-row"><span>Drop:</span><b>${f.drop}</b></div>
        <div class="fare-row"><span>Date/Time:</span><b>${f.time}</b></div>
        <div class="fare-row"><span>Price:</span><b>${f.price}</b></div>
        <div class="fare-row"><span>Status:</span><b>${f.status}</b></div>
      `;
      jobsList.appendChild(div);
    });
  });
}