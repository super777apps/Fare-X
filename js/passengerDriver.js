import { db, auth } from "./firebase.js";

import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;
let myDrivers = [];

const list = document.getElementById("driversList");
const searchInput = document.getElementById("searchInput");

/* ---------- AUTH ---------- */
onAuthStateChanged(auth, user => {
  if (!user) {
    location.href = "index.html";
    return;
  }

  currentUser = user;
  loadMyDrivers();
});

/* ---------- LOAD MY DRIVERS (FRIENDS) ---------- */
function loadMyDrivers() {

  const q = query(
    collection(db, "friends"),
    where("owner", "==", currentUser.uid)
  );

  onSnapshot(q, snap => {

    myDrivers = [];

    snap.forEach(docSnap => {
      myDrivers.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    renderMyDrivers();
  });
}

/* ---------- RENDER MY DRIVERS ---------- */
function renderMyDrivers() {

  list.innerHTML = "";

  if (myDrivers.length === 0) {
    list.innerHTML = `<div class="gold">No drivers added yet</div>`;
    return;
  }

  myDrivers.forEach(d => {

    const div = document.createElement("div");
    div.className = "fare-card";

    div.innerHTML = `
      <div class="fare-row">
        <span>Driver:</span>
        <b>${d.nickName || d.name || d.email}</b>
      </div>
    `;

    list.appendChild(div);
  });
}

/* ---------- SEARCH ---------- */
searchInput.addEventListener("input", async () => {

  const val = searchInput.value.trim().toLowerCase();

  // If empty → show my drivers
  if (!val) {
    renderMyDrivers();
    return;
  }

  list.innerHTML = `<div class="gold">Searching...</div>`;

  /* 1️⃣ SEARCH IN MY DRIVERS */
  const localResults = myDrivers.filter(d =>
    (d.nickName || d.name || d.email || "")
      .toLowerCase()
      .includes(val)
  );

  /* 2️⃣ SEARCH IN ALL USERS (DRIVERS ONLY) */
  const usersSnap = await getDocs(collection(db, "users"));

  let globalResults = [];

  usersSnap.forEach(docSnap => {
    const u = docSnap.data();

    if (
      u.role === "driver" &&
      (u.nickName || "").toLowerCase().includes(val)
    ) {

      // avoid duplicates
      const exists = myDrivers.find(d => d.friendUID === docSnap.id);

      if (!exists) {
        globalResults.push({
          uid: docSnap.id,
          ...u
        });
      }
    }
  });

  /* ---------- SHOW RESULTS ---------- */
  list.innerHTML = "";

  // Show my drivers first
  localResults.forEach(d => {

    const div = document.createElement("div");
    div.className = "fare-card";

    div.innerHTML = `
      <div class="fare-row">
        <span>Driver:</span>
        <b>${d.nickName}</b>
      </div>
      <div class="gold">Already Added</div>
    `;

    list.appendChild(div);
  });

  // Show new drivers to add
  globalResults.forEach(u => {

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

  if (localResults.length === 0 && globalResults.length === 0) {
    list.innerHTML = `<div class="gold">No matching drivers</div>`;
  }

});

/* ---------- ADD DRIVER ---------- */
window.addDriver = async (uid, name) => {

  try {

    await addDoc(collection(db, "friends"), {
      owner: currentUser.uid,
      friendUID: uid,
      nickName: name
    });

    alert("Driver added");

  } catch (err) {
    console.error(err);
    alert("Error adding driver");
  }
};