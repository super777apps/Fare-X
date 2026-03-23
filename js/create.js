import { db, auth } from "./firebase.js";
import { sendToFriend } from "./dispatchEngine.js";

import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;
let currentUserData = null;

const sendType = document.getElementById("sendType");
const friendSelect = document.getElementById("friendSelect");
const btn = document.getElementById("createFareBtn");

/* AUTH */
onAuthStateChanged(auth, async user => {
  if (!user) return location.href = "index.html";

  currentUser = user;

  const snap = await getDoc(doc(db, "users", user.uid));
  currentUserData = snap.data();

  loadFriends(user.uid);

  // Passenger restriction
  if (currentUserData.role === "passenger") {
    sendType.value = "friend";
    sendType.disabled = true;
    friendSelect.style.display = "block";
  }
});

/* SHOW FRIEND SELECT */
sendType.addEventListener("change", () => {
  friendSelect.style.display = sendType.value === "friend" ? "block" : "none";
});

/* LOAD FRIENDS / DRIVERS */
function loadFriends(uid) {

  const q = query(collection(db, "friends"), where("owner", "==", uid));

  onSnapshot(q, snap => {

    friendSelect.innerHTML = '<option value="">Select Driver</option>';

    snap.forEach(d => {
      const f = d.data();

      const opt = document.createElement("option");
      opt.value = f.friendUID;
      opt.textContent = f.name || f.email;

      friendSelect.appendChild(opt);
    });

  });
}

/* CREATE JOB */
btn.onclick = async () => {

  if (!currentUserData) return alert("User not ready");

  const pickup = document.getElementById("pickup").value.trim();
  const drop = document.getElementById("drop").value.trim();
  const time = document.getElementById("datetime").value;
  const price = document.getElementById("price").value.trim();

  if (!pickup || !drop || !time || !price) {
    return alert("Fill all fields");
  }

  const data = {
    pickup,
    drop,
    time,
    price,

    createdUid: currentUser.uid,
    createdBy: currentUser.email,

    originalDriverUID: currentUser.uid,
    originalDriverName: currentUserData.nickname,

    currentDriverUID: currentUser.uid,
    currentDriverName: currentUserData.nickname,

    role: currentUserData.role,

    status: "broadcast",
    dispatchType: "pool",

    assignedTo: "",
    returnReason: "",

    createdAt: serverTimestamp()
  };

  /* SEND TO FRIEND */
  if (sendType.value === "friend") {

    const friendUID = friendSelect.value;
    if (!friendUID) return alert("Select driver");

    const ref = await addDoc(collection(db, "fares"), data);

    await sendToFriend(ref.id, friendUID, currentUser.uid);

    alert("Sent to driver");
    location.href = "dashboard.html";
    return;
  }

  /* DRIVER ONLY → POOL */
  if (currentUserData.role === "driver") {

    await addDoc(collection(db, "fares"), data);

    alert("Broadcast created");
    location.href = "dashboard.html";
  }

};