import { db, auth } from "./firebase.js";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;

// 🔊 sound
const jobSound = new Audio("assets/job.mp3");

onAuthStateChanged(auth, (user) => {

  if (!user) return;

  currentUser = user;

  listenGlobalJobs();
});

function listenGlobalJobs() {

  const q = query(
    collection(db, "fares"),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, snap => {

    snap.docChanges().forEach(change => {

      if (change.type !== "added") return;

      const f = change.doc.data();

      const isAssigned = f.assignedTo === currentUser.uid;
      const isBroadcast = f.broadcast === true;

      // 🎯 Only show new incoming jobs
      if (
  f.status === "waiting response" &&
  !f.soundPlayed &&
  (isAssigned || isBroadcast)
) {

        // 🔊 PLAY SOUND
        jobSound.play();

        // 📢 SHOW POPUP
        showPopup(f, change.doc.id);

        // 🔕 prevent repeat sound
        updateDoc(doc(db, "fares", change.doc.id), {
          soundPlayed: true
        });

      }

    });

  });

}

function showPopup(f, id) {

  const div = document.createElement("div");

  div.style.position = "fixed";
  div.style.top = "20px";
  div.style.left = "50%";
  div.style.transform = "translateX(-50%)";
  div.style.background = "#111";
  div.style.color = "#FFD700";
  div.style.padding = "15px";
  div.style.borderRadius = "10px";
  div.style.zIndex = "9999";
  div.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";
  div.style.minWidth = "250px";
  div.style.textAlign = "center";

  div.innerHTML = `
    <div><b>🚕 New Job</b></div>
    <div>${f.pickupSuburb || f.pickup}</div>
    <div>→ ${f.dropSuburb || f.drop}</div>
    <button onclick="location.href='dashboardDriver.html'" style="margin-top:10px;padding:5px 10px;">View</button>
  `;

  document.body.appendChild(div);

  // auto remove after 10 sec
  setTimeout(() => {
    div.remove();
  }, 10000);
}