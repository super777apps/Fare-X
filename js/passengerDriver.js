import { db, auth } from "./firebase.js";

import {
  collection,
  query,
  where,
  onSnapshot
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

/* ---------- LOAD DRIVERS ---------- */
function loadDrivers() {
  const q = query(
    collection(db, "friends"),
    where("owner", "==", currentUser.uid)
  );

  onSnapshot(q, snap => {
    allDrivers = [];

    snap.forEach(docSnap => {
      allDrivers.push(docSnap.data());
    });

    renderDrivers(allDrivers);
  });
}

/* ---------- RENDER ---------- */
function renderDrivers(data) {
  list.innerHTML = "";

  data.forEach(f => {
    const div = document.createElement("div");
    div.className = "fare-card";

    div.innerHTML = `
      <div class="fare-row"><span>Name:</span><b>${f.nickName || f.name || f.email}</b></div>
    `;

    list.appendChild(div);
  });
}

/* ---------- SEARCH ---------- */
searchInput.addEventListener("input", () => {
  const val = searchInput.value.toLowerCase();

  const filtered = allDrivers.filter(f =>
    (f.nickName || f.name || f.email || "").toLowerCase().includes(val)
  );

  renderDrivers(filtered);
});