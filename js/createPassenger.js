import { db, auth } from "./firebase.js";

import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;
let editJobId = null;

/* ---------- AUTH ---------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "index.html";
    return;
  }

  currentUser = user;

  loadDrivers();

  // Check if editing existing job
  const urlParams = new URLSearchParams(window.location.search);
  editJobId = urlParams.get("id");

  if (editJobId) {
    loadJobForEdit(editJobId);
  }
});

/* ---------- LOAD DRIVERS (FRIENDS) ---------- */
function loadDrivers() {
  const select = document.getElementById("driverSelect");

  const q = query(
    collection(db, "friends"),
    where("owner", "==", currentUser.uid)
  );

  onSnapshot(q, (snap) => {
    select.innerHTML = `<option value="">Select Driver</option>`;

    snap.forEach((docSnap) => {
      const f = docSnap.data();

      const opt = document.createElement("option");
      opt.value = f.friendUID;
      opt.textContent = f.nickName || f.name || f.email || "Driver";

      select.appendChild(opt);
    });
  });
}

/* ---------- LOAD JOB FOR EDIT ---------- */
async function loadJobForEdit(id) {
  const ref = doc(db, "fares", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const f = snap.data();

  document.getElementById("pickup").value = f.pickup || "";
  document.getElementById("drop").value = f.drop || "";
  document.getElementById("datetime").value = f.time || "";
  document.getElementById("price").value = f.price || "";
  document.getElementById("driverSelect").value = f.originalDriverUID || "";
}

/* ---------- CREATE / UPDATE JOB ---------- */
document.getElementById("createFareBtn").onclick = async () => {

  const pickup = document.getElementById("pickup").value.trim();
  const drop = document.getElementById("drop").value.trim();
  const datetime = document.getElementById("datetime").value;
  const price = document.getElementById("price").value.trim();
  const driverUID = document.getElementById("driverSelect").value;

  if (!pickup || !drop || !datetime || !price || !driverUID) {
    alert("Please fill all fields and select driver");
    return;
  }

  // Get passenger nickname
  const userSnap = await getDoc(doc(db, "users", currentUser.uid));
  const passengerName = userSnap.exists()
    ? userSnap.data().nickName || currentUser.email
    : currentUser.email;

  const data = {
    pickup,
    drop,
    time: datetime,
    price,

    createdBy: currentUser.email,
    createdUid: currentUser.uid,

    passengerUID: currentUser.uid,
    passengerName: passengerName,

    originalDriverUID: driverUID,
    currentDriverUID: driverUID,

    role: "driver",
    chain: [],

    createdAt: serverTimestamp(),

    status: "requested",
    dispatchType: "passenger"
  };

  try {

    if (editJobId) {
      // UPDATE
      await updateDoc(doc(db, "fares", editJobId), data);
      alert("Job updated successfully");
    } else {
      // CREATE
      await addDoc(collection(db, "fares"), data);
      alert("Job sent to driver");
    }

    // Go back to dashboard
    window.location.href = "dashboardPassenger.html";

  } catch (err) {
    console.error(err);
    alert("Error saving job");
  }
};