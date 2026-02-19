import { db, auth } from "./firebase.js";
import { collection, onSnapshot, query, where, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const fareList = document.getElementById("fareList");
const acceptSound = document.getElementById("acceptSound");
const declineSound = document.getElementById("declineSound");
const notifySound = document.getElementById("notifySound");

const q = query(collection(db, "fares"), where("status", "==", "broadcast"));

onSnapshot(q, snapshot => {
  fareList.innerHTML = "";
  snapshot.forEach(docSnap => {
    const f = docSnap.data();

    if (!f.allowedDrivers || f.allowedDrivers.length === 0 || f.allowedDrivers.includes(auth.currentUser.email)) {
      fareList.innerHTML += `
        <div class="card">
          <b>Pickup:</b> ${f.pickup}<br>
          <b>Drop:</b> ${f.drop}<br>
          <b>Time:</b> ${new Date(f.time).toLocaleString()}<br>
          <b>Price:</b> ${f.price}<br>
          <b>Note:</b> ${f.note || ""}<br><br>
          <button onclick="acceptFare('${docSnap.id}')">Accept</button>
          <button onclick="declineFare('${docSnap.id}')">Decline</button>
        </div>
      `;
      notifySound.play();
    }
  });
});

window.acceptFare = async (id) => {
  await updateDoc(doc(db, "fares", id), {
    status: "accepted",
    acceptedBy: auth.currentUser.email
  });
  acceptSound.play();
};

window.declineFare = async (id) => {
  await updateDoc(doc(db, "fares", id), {
    status: "declined"
  });
  declineSound.play();
};