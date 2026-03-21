import { db, auth } from "./firebase.js";
import { sendToFriend } from "./dispatchEngine.js";

import {
collection,
addDoc,
query,
where,
onSnapshot,
serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;

const sendType = document.getElementById("sendType");
const friendSelect = document.getElementById("friendSelect");
const btn = document.getElementById("createFareBtn");

/* AUTH */
onAuthStateChanged(auth, user => {
  if (!user) return location.href = "index.html";
  currentUser = user;
  loadFriends(user.uid);
});

/* SHOW FRIEND */
sendType.addEventListener("change", () => {
  friendSelect.style.display = sendType.value === "friend" ? "block" : "none";
});

/* LOAD FRIENDS */
function loadFriends(uid) {
  const q = query(collection(db, "friends"), where("owner", "==", uid));

  onSnapshot(q, snap => {
    friendSelect.innerHTML = '<option value="">Select Friend</option>';

    snap.forEach(docSnap => {
      const f = docSnap.data();
      const opt = document.createElement("option");
      opt.value = f.friendUID;
      opt.textContent = f.name || f.email;
      friendSelect.appendChild(opt);
    });
  });
}

/* CREATE JOB */
btn.onclick = async () => {

  if (!currentUser) return alert("User not ready");

  const pickup = document.getElementById("pickup").value.trim();
  const drop = document.getElementById("drop").value.trim();
  const datetime = document.getElementById("datetime").value;
  const price = document.getElementById("price").value.trim();

  if (!pickup || !drop || !datetime || !price) {
    alert("Fill all fields");
    return;
  }

  const data = {
    pickup,
    drop,
    time: datetime,
    price,

    createdBy: currentUser.email,
    createdUid: currentUser.uid,

    originalDriverUID: currentUser.uid,
    currentDriverUID: currentUser.uid,

    createdAt: serverTimestamp(),

    status: "broadcast",
    dispatchType: "pool"
  };

  /* SEND TO FRIEND */
  if (sendType.value === "friend") {

    const friendUID = friendSelect.value;
    if (!friendUID) return alert("Select friend");

    const ref = await addDoc(collection(db, "fares"), data);

    await sendToFriend(ref.id, friendUID);

    alert("Private job sent");
    location.href = "dashboard.html";
    return;
  }

  /* SEND TO POOL */
  await addDoc(collection(db, "fares"), data);

  alert("Broadcast job created");
  location.href = "dashboard.html";
};