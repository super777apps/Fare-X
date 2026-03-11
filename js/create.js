import { db, auth } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


const btn = document.getElementById("createFareBtn");
const sendType = document.getElementById("sendType");
const friendSelect = document.getElementById("friendSelect");

let currentUser = null;


/* ---------------- AUTH ---------------- */

onAuthStateChanged(auth, (user) => {

  if (!user) {
    window.location.href = "index.html";
    return;
  }

  currentUser = user;

  console.log("User logged in:", user.uid);

  loadFriends(user.uid);
});


/* ---------------- SHOW FRIEND SELECT ---------------- */

sendType.addEventListener("change", () => {

  if (sendType.value === "friend") {
    friendSelect.style.display = "block";
  } else {
    friendSelect.style.display = "none";
  }

});


/* ---------------- LOAD FRIENDS ---------------- */

function loadFriends(uid) {

  const q = query(
    collection(db, "friends"),
    where("owner", "==", uid)
  );

  onSnapshot(q, (snapshot) => {

    friendSelect.innerHTML = '<option value="">Select Friend</option>';

    if (snapshot.empty) {
      const opt = document.createElement("option");
      opt.textContent = "No friends yet";
      friendSelect.appendChild(opt);
      return;
    }

    snapshot.forEach((docSnap) => {

      const f = docSnap.data();

      const opt = document.createElement("option");

      opt.value = f.friendUid;
      opt.textContent = f.name || f.email || f.friendUid;

      friendSelect.appendChild(opt);

    });

  });

}


/* ---------------- CREATE FARE ---------------- */

btn.addEventListener("click", async () => {

  if (!currentUser) {
    alert("User not ready yet");
    return;
  }

  const pickup = document.getElementById("pickup").value.trim();
  const drop = document.getElementById("drop").value.trim();
  const datetime = document.getElementById("datetime").value;
  const price = document.getElementById("price").value.trim();
  const priceType = document.getElementById("priceType").value;
  const note = document.getElementById("note").value.trim();

  if (!pickup || !drop || !datetime || !price) {
    alert("Please fill all fields");
    return;
  }

  const data = {
    pickup: pickup,
    drop: drop,
    time: datetime,
    price: price,
    priceType: priceType,
    note: note,
    createdBy: currentUser.email,
    createdUid: currentUser.uid,
    createdAt: serverTimestamp(),
    status: "broadcast"
  };

  try {

    /* -------- SEND TO FRIEND -------- */

    if (sendType.value === "friend") {

      const friendUID = friendSelect.value;

      if (!friendUID) {
        alert("Select friend");
        return;
      }

      data.status = "pending";
      data.targetUID = friendUID;

      await addDoc(
        collection(db, "privateFares", friendUID, "jobs"),
        data
      );

      alert("Private job sent ✔");

      window.location.href = "dashboard.html";
      return;
    }


    /* -------- BROADCAST -------- */

    await addDoc(collection(db, "fares"), data);

    alert("Broadcast job created ✔");

    window.location.href = "dashboard.html";

  } catch (err) {

    console.error(err);

    alert("Error: " + err.message);

  }

});