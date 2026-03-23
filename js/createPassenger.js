import { db, auth } from "./firebase.js";
import { collection, addDoc, updateDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;
let editingId = null;

const pickupInput = document.getElementById("pickup");
const dropInput = document.getElementById("drop");
const datetimeInput = document.getElementById("datetime");
const priceInput = document.getElementById("price");
const driverSelect = document.getElementById("driverSelect");
const btn = document.getElementById("createFareBtn");

onAuthStateChanged(auth, user => {
  if (!user) location.href = "index.html";
  currentUser = user;
  loadDrivers();
});

// Load drivers for select dropdown
async function loadDrivers() {
  const q = query(collection(db,"users"), where("role","==","driver"));
  onSnapshot(q, snap => {
    driverSelect.innerHTML = "<option value=''>Select Driver</option>";
    snap.forEach(d => {
      const data = d.data();
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = data.nickname || data.email;
      driverSelect.appendChild(opt);
    });
  });
}

btn.onclick = async () => {
  const pickup = pickupInput.value.trim();
  const drop = dropInput.value.trim();
  const datetime = datetimeInput.value;
  const price = priceInput.value.trim();
  const driverUID = driverSelect.value;

  if (!pickup || !drop || !datetime || !price || !driverUID) return alert("Fill all fields");

  const data = {
    pickup, drop, time: datetime, price,
    createdBy: currentUser.email,
    createdUid: currentUser.uid,
    currentDriverUID: driverUID,
    role: "passenger",
    status: "assigned",
    chain: [],
    createdAt: serverTimestamp()
  };

  if (editingId) {
    await updateDoc(doc(db,"fares",editingId), data);
    alert("Job updated");
  } else {
    await addDoc(collection(db,"fares"), data);
    alert("Fare created");
  }

  location.href = "dashboardPassenger.html";
}