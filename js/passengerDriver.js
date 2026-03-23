import { db, auth } from "./firebase.js";

import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;
let allDrivers = [];

const list = document.getElementById("driversList");
const searchInput = document.getElementById("searchInput");

/* ---------- AUTH ---------- */
onAuthStateChanged(auth, user => {
  if (!user) {
    location.href = "index.html";
    return;
  }

  currentUser = user;
  loadDrivers();
});

/* ---------- LOAD EXISTING DRIVERS ---------- */
function loadDrivers() {
  const q = query(
    collection(db, "friends"),
    where("owner", "==", currentUser.uid)
  );

  onSnapshot(q, snap => {
    allDrivers = [];

    snap.forEach(docSnap => {
      allDrivers.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    renderDrivers(allDrivers);
  });
}

/* ---------- RENDER DRIVER LIST ---------- */
function renderDrivers(data) {
  list.innerHTML = "";

  if (data.length === 0) {
    list.innerHTML = `<div class="gold">No drivers found</div>`;
    return;
  }

  data.forEach(f => {
    const div = document.createElement("div");
    div.className = "fare-card";

    div.innerHTML = `
      <div class="fare-row">
        <span>Driver:</span>
        <b>${f.nickName || f.name || f.email}</b>
      </div>
    `;

    list.appendChild(div);
  });
}

/* ---------- SEARCH + ADD DRIVER ---------- */
searchInput.addEventListener("input", async () => {

  const val = searchInput.value.trim().toLowerCase();

  // If empty → show all
  if (!val) {
    renderDrivers(allDrivers);
    return;
  }

  /* 🔍 SEARCH IN USERS COLLECTION */
  const usersSnap = await getDocs(collection(db, "users"));

  let results = [];

  usersSnap.forEach(docSnap => {
    const u = docSnap.data();

    if (
      u.role === "driver" &&
      (u.nickName || "").toLowerCase().includes(val)
    ) {
      results.push({
        uid: docSnap.id,
        ...u
      });
    }
  });

  /* SHOW SEARCH RESULTS */
  list.innerHTML = "";

  if (results.length === 0) {
    list.innerHTML = `<div class="gold">No matching drivers</div>`;
    return;
  }

  results.forEach(u => {
    const div = document.createElement("div");
    div.className = "fare-card";

    div.innerHTML = `
      <div class="fare-row">
        <span>Driver:</span>
        <b>${u.nickName}</b>
      </div>

      <div class="fare-actions">
        <button class="lux-btn" onclick="addDriver('${u.uid}','${u.nickName}')">
          Add Driver
        </button>
      </div>
    `;

    list.appendChild(div);
  });

});

/* ---------- ADD DRIVER ---------- */
window.addDriver = async (uid, name) => {

  // Check duplicate
  const exists = allDrivers.find(d => d.friendUID === uid);
  if (exists) {
    alert("Driver already added");
    return;
  }

  await addDoc(collection(db, "friends"), {
    owner: currentUser.uid,
    friendUID: uid,
    nickName: name
  });

  alert("Driver added successfully");
};