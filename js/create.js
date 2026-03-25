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
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;
let currentUserData = null;

const sendType = document.getElementById("sendType");
const friendSelect = document.getElementById("friendSelect");
const btn = document.getElementById("createFareBtn");
const longBtn = document.getElementById("longSendBtn");

/* ---------- AUTH ---------- */
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

/* ---------- SHOW FRIEND SELECT + LONG BUTTON ---------- */
sendType.addEventListener("change", () => {

  const isFriend = sendType.value === "friend";

  friendSelect.style.display = isFriend ? "block" : "none";
  longBtn.style.display = isFriend ? "block" : "none";

});

/* ---------- LOAD FRIENDS ---------- */
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

/* ---------- COMMON JOB DATA ---------- */
function getJobData() {

  const pickup = document.getElementById("pickup").value.trim();
  const drop = document.getElementById("drop").value.trim();
  const time = document.getElementById("datetime").value;
  const price = document.getElementById("price").value.trim();

  if (!pickup || !drop || !time || !price) {
    alert("Fill all fields");
    return null;
  }

  return {
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

    assignedTo: "",
    returnReason: "",

    createdAt: serverTimestamp()
  };
}

/* ---------- NORMAL SEND ---------- */
btn.onclick = async () => {

  if (!currentUserData) return alert("User not ready");

  const data = getJobData();
  if (!data) return;

  /* SEND TO FRIEND */
  if (sendType.value === "friend") {

    const friendUID = friendSelect.value;
    if (!friendUID) return alert("Select driver");

    data.status = "assigned";
    data.dispatchType = "normal";

    const ref = await addDoc(collection(db, "fares"), data);

    await sendToFriend(ref.id, friendUID, currentUser.uid);

    alert("Sent to driver");
    location.href = "dashboardDriver.html";
    return;
  }

  /* POOL */
  if (currentUserData.role === "driver") {

    data.status = "broadcast";
    data.dispatchType = "pool";

    await addDoc(collection(db, "fares"), data);

    alert("Broadcast created");
    location.href = "dashboardDriver.html";
  }

};

/* ---------- LONG SEND (NEW FEATURE) ---------- */
longBtn.onclick = async () => {

  if (!currentUserData) return alert("User not ready");

  const data = getJobData();
  if (!data) return;

  const friendUID = friendSelect.value;
  if (!friendUID) return alert("Select driver");

  // NEW STATUS
  data.status = "waiting response";
  data.dispatchType = "long";

  const ref = await addDoc(collection(db, "fares"), data);

  await sendToFriend(ref.id, friendUID, currentUser.uid);

  alert("Sent (waiting for response)");
  location.href = "dashboardDriver.html";
};