import { db, auth } from "./firebase.js";

import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;

const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");
const passengerList = document.getElementById("passengerList");

/* =========================
   AUTH
========================= */
onAuthStateChanged(auth, user => {

  if (!user) {
    location.href = "index.html";
    return;
  }

  currentUser = user;

  loadPassengers();
});

/* =========================
   SEARCH USERS (ONLY PASSENGERS)
========================= */
searchInput.addEventListener("input", async () => {

  const qText = searchInput.value.trim().toLowerCase();

  if (qText.length < 3) {
    searchResults.innerHTML = "";
    return;
  }

  const snap = await getDocs(collection(db, "users"));

  searchResults.innerHTML = "";

  snap.forEach(d => {

    const u = d.data();

    if (u.role !== "passenger") return;

    if ((u.email || "").toLowerCase().includes(qText)) {

      const div = document.createElement("div");
      div.className = "result-item";

      div.textContent = `${u.nickName || "NoName"} (${u.email})`;

      div.onclick = () => addPassenger(d.id, u);

      searchResults.appendChild(div);
    }

  });

});

/* =========================
   ADD PASSENGER
========================= */
async function addPassenger(uid, u) {

  await addDoc(collection(db, "passengers"), {
    owner: currentUser.uid,
    passengerUID: uid,
    name: u.nickName || u.email,
    email: u.email || ""
  });

  alert("Passenger added");

  searchResults.innerHTML = "";
  searchInput.value = "";
}

/* =========================
   LOAD MY PASSENGERS
========================= */
function loadPassengers() {

  const q = query(
    collection(db, "passengers"),
    where("owner", "==", currentUser.uid)
  );

  onSnapshot(q, snap => {

    passengerList.innerHTML = "";

    if (snap.empty) {
      passengerList.innerHTML = `<div class="gold">No passengers added</div>`;
      return;
    }

    snap.forEach(d => {

      const p = d.data();

      const div = document.createElement("div");
      div.className = "fare-card";

      div.innerHTML = `
        <div class="fare-row"><span>Name:</span><b>${p.name}</b></div>
        <div class="fare-row"><span>Email:</span><b>${p.email || "-"}</b></div>

        <button class="lux-btn danger full" onclick="removePassenger('${d.id}')">
          Remove
        </button>
      `;

      passengerList.appendChild(div);
    });

  });
}

/* =========================
   REMOVE PASSENGER
========================= */
window.removePassenger = async (id) => {

  if (!confirm("Remove passenger?")) return;

  await deleteDoc(doc(db, "passengers", id));

  alert("Removed");
};