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
let myDrivers = []; // ✅ store already added drivers

/* ---------- AUTH ---------- */
onAuthStateChanged(auth, user => {

  if (!user) {
    location.href = "index.html";
    return;
  }

  currentUser = user;

  loadMyDrivers();
});

/* ---------- LOAD MY DRIVERS ---------- */
function loadMyDrivers() {

  const box = document.getElementById("driversList");

  const q = query(
    collection(db, "friends"),
    where("owner", "==", currentUser.uid)
  );

  onSnapshot(q, snap => {

    box.innerHTML = "";
    myDrivers = []; // ✅ reset list

    if (snap.empty) {
      box.innerHTML = `<div class="gold">No drivers added</div>`;
      return;
    }

    snap.forEach(docSnap => {

      const f = docSnap.data();

      myDrivers.push(f.friendUID); // ✅ store for filtering

      const div = document.createElement("div");
      div.className = "fare-card";

      div.innerHTML = `
        <div class="fare-row">
          <span>Driver:</span>
          <b>${f.nickName || f.name || f.email || "Driver"}</b>
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

    // ✅ SAFE FIELDS
    const nick = (u.nickName || "").toLowerCase();
    const name = (u.name || "").toLowerCase();
    const email = (u.email || "").toLowerCase();

    const match =
      nick.includes(text) ||
      name.includes(text) ||
      email.includes(text);

    // ✅ ONLY DRIVERS + NOT ALREADY ADDED
    if (u.role === "driver" && match && !myDrivers.includes(docSnap.id)) {

      found = true;

      const div = document.createElement("div");
      div.className = "fare-card";

      div.innerHTML = `
        <div class="fare-row">
          <span>Driver:</span>
          <b>${u.nickName || u.name || u.email || "Driver"}</b>
        </div>

        <button class="lux-btn full" onclick="addDriver('${docSnap.id}','${u.nickName || u.name || u.email}')">
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