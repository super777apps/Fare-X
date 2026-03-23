import { db, auth } from "./firebase.js";
import {
  collection, doc, onSnapshot, getDoc, updateDoc, addDoc, query, where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;
const content = document.getElementById("passengerContent");
const passengerName = document.getElementById("passengerName");
const passengerRole = document.getElementById("passengerRole");

/* AUTH */
onAuthStateChanged(auth, async user => {
  if (!user) { location.href = "index.html"; return; }
  currentUser = user;

  // Load user info
  const userSnap = await getDoc(doc(db, "users", user.uid));
  if (userSnap.exists()) {
    const u = userSnap.data();
    passengerName.textContent = u.nickName || u.email;
    passengerRole.textContent = u.role || "passenger";
  }
});

/* LOGOUT */
document.getElementById("logoutBtn").onclick = async () => {
  await signOut(auth);
  location.href = "index.html";
};

/* NAVIGATION */
document.getElementById("createFareBtn").onclick = showCreateFare;
document.getElementById("driversBtn").onclick = showDrivers;
document.getElementById("profileBtn").onclick = showProfile;

/* ---------- CREATE FARE ---------- */
function showCreateFare() {
  content.innerHTML = `
    <h2 class="section-title">Create Fare</h2>
    <button onclick="backToDashboard()" class="lux-btn">Back to Dashboard</button>
    <input id="pickup" placeholder="Pickup location">
    <input id="drop" placeholder="Drop location">
    <input id="datetime" type="datetime-local">
    <input id="price" placeholder="Price">
    <select id="driverSelect"><option value="">Select Driver</option></select>
    <button id="sendFareBtn" class="lux-btn">Send to Driver</button>
  `;

  loadDrivers();

  document.getElementById("sendFareBtn").onclick = async () => {
    const pickup = document.getElementById("pickup").value.trim();
    const drop = document.getElementById("drop").value.trim();
    const datetime = document.getElementById("datetime").value;
    const price = document.getElementById("price").value.trim();
    const driverUID = document.getElementById("driverSelect").value;

    if (!pickup || !drop || !datetime || !price || !driverUID) {
      alert("Fill all fields and select driver");
      return;
    }

    const data = {
      pickup, drop, time: datetime, price,
      createdBy: currentUser.email,
      createdUid: currentUser.uid,
      originalDriverUID: driverUID, // driver assigned
      currentDriverUID: driverUID,
      passengerUID: currentUser.uid,
      role: "driver",
      chain: [],
      createdAt: new Date(),
      status: "requested",
      dispatchType: "friend"
    };

    await addDoc(collection(db, "fares"), data);
    alert("Fare sent to driver successfully");
    backToDashboard();
  };
}

/* Load drivers (friends collection) */
async function loadDrivers() {
  const select = document.getElementById("driverSelect");
  select.innerHTML = `<option value="">Select Driver</option>`;
  const q = query(collection(db, "friends"), where("owner", "==", currentUser.uid));
  onSnapshot(q, snap => {
    snap.forEach(docSnap => {
      const f = docSnap.data();
      const opt = document.createElement("option");
      opt.value = f.friendUID;
      opt.textContent = f.nickName || f.name || f.email;
      select.appendChild(opt);
    });
  });
}

/* ---------- DRIVERS LIST ---------- */
function showDrivers() {
  content.innerHTML = `<h2 class="section-title">Drivers</h2>
    <button onclick="backToDashboard()" class="lux-btn">Back to Dashboard</button>
    <div id="driversList"></div>
  `;
  const list = document.getElementById("driversList");

  const q = query(collection(db, "friends"), where("owner", "==", currentUser.uid));
  onSnapshot(q, snap => {
    list.innerHTML = "";
    snap.forEach(docSnap => {
      const f = docSnap.data();
      const div = document.createElement("div");
      div.className = "fare-card";
      div.innerHTML = `
        <b>${f.nickName || f.name || f.email}</b>
        <button onclick="removeDriver('${docSnap.id}')" class="lux-btn danger">Remove</button>
      `;
      list.appendChild(div);
    });
  });
}

/* ---------- PROFILE ---------- */
function showProfile() {
  content.innerHTML = `<h2 class="section-title">Profile</h2>
    <button onclick="backToDashboard()" class="lux-btn">Back to Dashboard</button>
    <input id="firstName" placeholder="First Name">
    <input id="middleName" placeholder="Middle Name">
    <input id="lastName" placeholder="Last Name">
    <input id="nickName" placeholder="Nick Name">
    <input id="phone" placeholder="Phone">
    <input id="address" placeholder="Address">
    <input id="photo" placeholder="Photo URL">
    <input id="dob" type="date" placeholder="Date of Birth">
    <button id="saveProfileBtn" class="lux-btn">Save Profile</button>
  `;

  // Load current profile
  getDoc(doc(db, "users", currentUser.uid)).then(snap => {
    if (snap.exists()) {
      const u = snap.data();
      document.getElementById("firstName").value = u.firstName || "";
      document.getElementById("middleName").value = u.middleName || "";
      document.getElementById("lastName").value = u.lastName || "";
      document.getElementById("nickName").value = u.nickName || "";
      document.getElementById("phone").value = u.phone || "";
      document.getElementById("address").value = u.address || "";
      document.getElementById("photo").value = u.photo || "";
      document.getElementById("dob").value = u.dob || "";
    }
  });

  document.getElementById("saveProfileBtn").onclick = async () => {
    const data = {
      firstName: document.getElementById("firstName").value.trim(),
      middleName: document.getElementById("middleName").value.trim(),
      lastName: document.getElementById("lastName").value.trim(),
      nickName: document.getElementById("nickName").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      address: document.getElementById("address").value.trim(),
      photo: document.getElementById("photo").value.trim(),
      dob: document.getElementById("dob").value
    };
    await updateDoc(doc(db, "users", currentUser.uid), data);
    alert("Profile updated successfully!");
    passengerName.textContent = data.nickName || currentUser.email;
  };
}

/* ---------- BACK TO DASHBOARD ---------- */
window.backToDashboard = () => {
  content.innerHTML = `<h2 class="section-title">Jobs</h2>
    <div id="jobsList"></div>
  `;
  loadJobs();
};

/* ---------- LOAD JOBS ---------- */
function loadJobs() {
  const list = document.getElementById("jobsList");
  const q = query(collection(db, "fares"), where("passengerUID", "==", currentUser.uid));
  onSnapshot(q, snap => {
    list.innerHTML = "";
    snap.forEach(docSnap => {
      const f = docSnap.data();
      const div = document.createElement("div");
      div.className = "fare-card";
      div.innerHTML = `
        <b>${f.pickup}</b> → ${f.drop}<br>
        Status: ${f.status}<br>
        Driver: ${f.originalDriverUID || "N/A"}<br>
        <button onclick="editJob('${docSnap.id}')" class="lux-btn">Edit</button>
        <button onclick="deleteJob('${docSnap.id}')" class="lux-btn danger">Delete</button>
        <button onclick="resendJob('${docSnap.id}')" class="lux-btn">Resend</button>
      `;
      list.appendChild(div);
    });
  });
}

window.editJob = id => { alert("Edit job feature"); };
window.deleteJob = async id => { await updateDoc(doc(db,"fares",id),{status:"deleted"}); };
window.resendJob = id => { alert("Resend job feature"); };