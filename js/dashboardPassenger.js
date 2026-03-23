import { db, auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, where, onSnapshot, getDocs, serverTimestamp, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "index.html";
    return;
  }
  currentUser = user;

  // Show logged in nickname and role
  const userSnap = await getDocs(query(collection(db, "users"), where("uid", "==", currentUser.uid)));
  let nick = currentUser.email;
  let role = "";
  userSnap.forEach(d => {
    nick = d.data().nickName || currentUser.email;
    role = d.data().role || "passenger";
  });
  document.getElementById("nickNameDisplay").textContent = nick;
  document.getElementById("roleDisplay").textContent = role;

  loadJobs();
});

function loadJobs() {
  const jobsContainer = document.getElementById("jobsContainer");
  jobsContainer.innerHTML = "<h3>Loading Jobs...</h3>";
  const q = query(collection(db, "fares"), where("passengerUID", "==", currentUser.uid));
  onSnapshot(q, snap => {
    jobsContainer.innerHTML = "<h3>Your Jobs:</h3>";
    snap.forEach(docSnap => {
      const j = docSnap.data();
      const div = document.createElement("div");
      div.className = "fare-card";
      div.innerHTML = `
        <div class="fare-row"><span>Pickup:</span> <b>${j.pickup}</b></div>
        <div class="fare-row"><span>Drop:</span> <b>${j.drop}</b></div>
        <div class="fare-row"><span>Driver:</span> <b>${j.passengerName}</b></div>
        <div class="fare-row"><span>Status:</span> <b>${j.status}</b></div>
      `;
      jobsContainer.appendChild(div);
    });
  });
}

// Button events
document.getElementById("createFareBtn").onclick = () => location.href = "createPassenger.html";
document.getElementById("driversBtn").onclick = () => location.href = "passengerDriver.html";
document.getElementById("profileBtn").onclick = () => location.href = "passengerProfile.html";
document.getElementById("jobsBtn").onclick = loadJobs;
document.getElementById("helpBtn").onclick = () => location.href = "help.html";
document.getElementById("logoutBtn").onclick = async () => {
  await auth.signOut();
  location.href = "index.html";
};