import { db, auth } from "./firebase.js";
import { collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) location.href = "index.html";
  currentUser = user;
  loadCurrentDrivers();
});

function loadCurrentDrivers() {
  const driversList = document.getElementById("driversList");
  const q = query(collection(db, "friends"), where("owner", "==", currentUser.uid));
  onSnapshot(q, snap => {
    driversList.innerHTML = "";
    snap.forEach(docSnap => {
      const f = docSnap.data();
      const div = document.createElement("div");
      div.className = "fare-card";
      div.textContent = f.nickName || f.name || f.email || "Driver";
      driversList.appendChild(div);
    });
  });
}

const searchInput = document.getElementById("driverSearch");
searchInput.addEventListener("input", async () => {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const driversList = document.getElementById("driversList");
  driversList.innerHTML = "";

  if (!searchTerm) return loadCurrentDrivers();

  const q = query(collection(db, "users"), where("role", "==", "driver"));
  const snap = await getDocs(q);

  snap.forEach(docSnap => {
    const d = docSnap.data();
    const nick = d.nickName || d.email;
    if (nick.toLowerCase().includes(searchTerm)) {
      const div = document.createElement("div");
      div.className = "fare-card";
      div.innerHTML = `${nick} <button onclick="addDriver('${docSnap.id}','${nick}')" class="lux-btn full">Add</button>`;
      driversList.appendChild(div);
    }
  });
});

window.addDriver = async (driverUID, driverName) => {
  await addDoc(collection(db, "friends"), {
    owner: currentUser.uid,
    friendUID: driverUID,
    nickName: driverName,
    createdAt: serverTimestamp()
  });
  alert(driverName + " added as driver");
  loadCurrentDrivers();
};