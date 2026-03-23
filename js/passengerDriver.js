import { db, auth } from "./firebase.js";
import { collection, query, where, onSnapshot, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;
let myDrivers = [];

const list = document.getElementById("driversList");
const searchInput = document.getElementById("searchInput");

onAuthStateChanged(auth, user => {
  if (!user) {
    location.href = "index.html";
    return;
  }
  currentUser = user;
  loadDrivers();
});

/* ---------- LOAD FRIENDS AS DRIVERS ---------- */
function loadDrivers() {
  const q = query(collection(db, "friends"), where("owner", "==", currentUser.uid));
  onSnapshot(q, snap => {
    myDrivers = [];
    snap.forEach(docSnap => myDrivers.push(docSnap.data()));
    renderDrivers(myDrivers);
  });
}

function renderDrivers(data) {
  list.innerHTML = "";
  if (!data.length) {
    list.innerHTML = `<div class="gold">No drivers added</div>`;
    return;
  }
  data.forEach(d => {
    const div = document.createElement("div");
    div.className = "fare-card";
    div.innerHTML = `
      <div class="fare-row"><span>Driver:</span><b>${d.nickName || d.email}</b></div>
    `;
    list.appendChild(div);
  });
}

/* ---------- SEARCH AND ADD DRIVER ---------- */
searchInput.addEventListener("input", async () => {
  const val = searchInput.value.trim().toLowerCase();
  if (!val) {
    renderDrivers(myDrivers);
    return;
  }

  list.innerHTML = `<div class="gold">Searching...</div>`;
  const usersSnap = await getDocs(collection(db, "users"));

  let results = [];
  usersSnap.forEach(docSnap => {
    const u = docSnap.data();
    if (u.role === "driver" && (u.nickName || "").toLowerCase().includes(val)) {
      const exists = myDrivers.find(d => d.friendUID === docSnap.id);
      results.push({ uid: docSnap.id, nickName: u.nickName, exists });
    }
  });

  list.innerHTML = "";
  if (!results.length) list.innerHTML = `<div class="gold">No drivers found</div>`;

  results.forEach(u => {
    const div = document.createElement("div");
    div.className = "fare-card";
    div.innerHTML = `
      <div class="fare-row"><span>Driver:</span><b>${u.nickName}</b></div>
      ${
        u.exists
          ? `<div class="gold">Already Added</div>`
          : `<div class="fare-actions">
              <button class="lux-btn" onclick="addDriver('${u.uid}','${u.nickName}')">Add Driver</button>
            </div>`
      }
    `;
    list.appendChild(div);
  });
});

window.addDriver = async (uid, name) => {
  await addDoc(collection(db, "friends"), {
    owner: currentUser.uid,
    friendUID: uid,
    nickName: name
  });
  alert("Driver added successfully");
};