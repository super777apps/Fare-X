import { db, auth } from "./firebase.js";

import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;

/* ---------- AUTH ---------- */
onAuthStateChanged(auth, user => {

  if (!user) {
    location.href = "index.html";
    return;
  }

  currentUser = user;

  loadMyDrivers();
});

/* ---------- LOAD DRIVERS ---------- */
function loadMyDrivers() {

  const box = document.getElementById("driversList");

  const q = query(
    collection(db, "friends"),
    where("owner", "==", currentUser.uid)
  );

  onSnapshot(q, snap => {

    box.innerHTML = "";

    if (snap.empty) {
      box.innerHTML = `<div class="gold">No drivers added</div>`;
      return;
    }

    snap.forEach(docSnap => {

      const f = docSnap.data();

      const div = document.createElement("div");
      div.className = "fare-card";

      div.innerHTML = `
        <div class="fare-row">
          <span>Driver:</span>
          <b>${f.nickName || f.name || f.email}</b>
        </div>
      `;

      box.appendChild(div);
    });

  });
}

/* ---------- SEARCH DRIVER ---------- */
document.getElementById("searchBtn").onclick = async () => {

  const text = document.getElementById("searchInput").value.trim().toLowerCase();

  if (!text) return alert("Enter nickname");

  const box = document.getElementById("searchResults");
  box.innerHTML = "Searching...";

  const snap = await getDocs(collection(db, "users"));

  box.innerHTML = "";

  let found = false;

  snap.forEach(docSnap => {

    const u = docSnap.data();

    if (u.role === "driver" && u.nickName?.toLowerCase().includes(text)) {

      found = true;

      const div = document.createElement("div");
      div.className = "fare-card";

      div.innerHTML = `
        <div class="fare-row">
          <span>Driver:</span>
          <b>${u.nickName}</b>
        </div>

        <button class="lux-btn full" onclick="addDriver('${docSnap.id}','${u.nickName}')">
          Add Driver
        </button>
      `;

      box.appendChild(div);
    }

  });

  if (!found) {
    box.innerHTML = `<div class="gold">No driver found</div>`;
  }
};

/* ---------- ADD DRIVER ---------- */
window.addDriver = async (driverUID, name) => {

  await addDoc(collection(db, "friends"), {
    owner: currentUser.uid,
    friendUID: driverUID,
    nickName: name
  });

  alert("Driver added");
};