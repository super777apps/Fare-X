import { db, auth } from "./firebase.js";
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;

onAuthStateChanged(auth, async user => {
  if (!user) { location.href = "index.html"; return; }
  currentUser = user;

  const userDoc = await (await doc(db,"users",currentUser.uid).get()).data();
  document.getElementById("userInfo").textContent = `${userDoc.nickname || currentUser.email} | ${userDoc.role}`;

  listenJobs();
});

document.getElementById("logoutBtn").onclick = async () => {
  await signOut(auth);
  location.href = "index.html";
};

function listenJobs() {
  const q = query(collection(db,"fares"),
    where("createdUid","==",currentUser.uid));
  const box = document.getElementById("jobList");
  onSnapshot(q, snap => {
    box.innerHTML = "";
    snap.forEach(d => {
      const f = d.data();
      const div = document.createElement("div");
      div.className = "fare-card";

      div.innerHTML = `
        <div class="fare-row"><span>Pickup:</span> <b>${f.pickup}</b></div>
        <div class="fare-row"><span>Drop:</span> <b>${f.drop}</b></div>
        <div class="fare-row"><span>Status:</span> <b>${f.status}</b></div>
        <div class="fare-row"><span>Driver:</span> <b>${f.currentDriverUID}</b></div>
        <div class="fare-actions">
          <button class="lux-btn" onclick="editJob('${d.id}')">Edit</button>
          <button class="lux-btn danger" onclick="deleteJob('${d.id}')">Delete</button>
        </div>
      `;
      box.appendChild(div);
    });
  });
}

window.editJob = async (id) => {
  location.href = `createPassenger.html?id=${id}`;
}

window.deleteJob = async (id) => {
  if (!confirm("Delete this job?")) return;
  await updateDoc(doc(db,"fares",id), { status:"deleted" });
  alert("Job deleted");
}