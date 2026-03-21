import { db, auth } from "./firebase.js";

import {
collection, query, where, onSnapshot,
doc, updateDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;

/* 🎵 SOUND CONTROL (FIXED PROPERLY) */
const jobSound = document.getElementById("jobSound");
const acceptSound = document.getElementById("acceptSound");
const declineSound = document.getElementById("declineSound");

function stopAllSounds() {
  [jobSound].forEach(s => {
    if (s) {
      s.pause();
      s.currentTime = 0;
    }
  });
}

/* ✅ FIXED NAME CACHE */
const userCache = {};

async function getName(uid) {
  if (userCache[uid]) return userCache[uid];

  const snap = await getDoc(doc(db, "users", uid));
  const name = snap.exists()
    ? (snap.data().nickname || snap.data().email)
    : uid;

  userCache[uid] = name;
  return name;
}

/* AUTH */
onAuthStateChanged(auth, user => {

  if (!user) return location.href = "index.html";

  currentUser = user;

  document.getElementById("userInfo").textContent = user.email;

  listenPool();
  listenPosted();
  listenAccepted();
  listenAssigned();
  listenReturns();
});

/* LOGOUT */
document.getElementById("logoutBtn").onclick = async () => {
  await signOut(auth);
  location.href = "index.html";
};

/* POOL */
function listenPool() {

  const q = query(collection(db, "fares"), where("status", "==", "broadcast"));
  const box = document.getElementById("poolList");

  onSnapshot(q, snap => {

    box.innerHTML = "";

    snap.forEach(async docSnap => {

      const f = docSnap.data();
      const name = await getName(f.originalDriverUID);

      const div = document.createElement("div");

      div.className = "fare-card";

      div.innerHTML = `
        <b>${f.pickup}</b> → ${f.drop}<br>
        Price: ${f.price}<br>
        Original: ${name}<br>
        <button onclick="acceptPool('${docSnap.id}')">Accept</button>
      `;

      box.appendChild(div);
    });
  });
}

/* ACCEPT POOL */
window.acceptPool = async id => {

  await updateDoc(doc(db, "fares", id), {
    status: "accepted",
    currentDriverUID: currentUser.uid
  });

  stopAllSounds();
  acceptSound.play();
};

/* POSTED */
function listenPosted() {

  const q = query(collection(db, "fares"),
    where("originalDriverUID", "==", currentUser.uid)
  );

  const box = document.getElementById("postedList");

  onSnapshot(q, async snap => {

    box.innerHTML = "";

    for (const d of snap.docs) {

      const f = d.data();
      const currentName = await getName(f.currentDriverUID);

      const div = document.createElement("div");

      div.className = "fare-card";

      div.innerHTML = `
        <b>${f.pickup}</b> → ${f.drop}<br>
        Status: ${f.status}<br>
        Current: ${currentName}<br>

        ${f.status === "returned" ? `<button onclick="resend('${d.id}')">Resend</button>` : ""}

        <button onclick="deleteJob('${d.id}')">Delete</button>
      `;

      box.appendChild(div);
    }
  });
}

/* RESEND (FIXED A→B→A FLOW) */
window.resend = async id => {

  await updateDoc(doc(db, "fares", id), {
    status: "broadcast",
    assignedTo: "",
    currentDriverUID: currentUser.uid
  });

  alert("Resent to pool");
};

/* DELETE */
window.deleteJob = async id => {

  await updateDoc(doc(db, "fares", id), {
    status: "deleted"
  });

  alert("Deleted");
};

/* ACCEPTED */
function listenAccepted() {

  const q = query(collection(db, "fares"),
    where("currentDriverUID", "==", currentUser.uid)
  );

  const box = document.getElementById("acceptedList");

  onSnapshot(q, async snap => {

    box.innerHTML = "";

    for (const d of snap.docs) {

      const f = d.data();
      const originalName = await getName(f.originalDriverUID);

      const div = document.createElement("div");

      div.className = "fare-card";

      div.innerHTML = `
        <b>${f.pickup}</b> → ${f.drop}<br>
        Original: ${originalName}<br>
      `;

      box.appendChild(div);
    }
  });
}

/* PRIVATE POPUP (FULL FIX) */
function listenAssigned() {

  const q = query(
    collection(db, "fares"),
    where("assignedTo", "==", currentUser.uid),
    where("status", "==", "assigned")
  );

  onSnapshot(q, snap => {

    snap.docChanges().forEach(change => {

      if (change.type === "added") {
        showPopup(change.doc.data(), change.doc.id);
      }

    });
  });
}

function showPopup(f, id) {

  const popup = document.getElementById("jobPopup");
  popup.style.display = "block";

  stopAllSounds();
  jobSound.play();

  document.getElementById("jobDetails").innerHTML = `
    Pickup: ${f.pickup}<br>
    Drop: ${f.drop}<br>
    Price: ${f.price}
  `;

  let handled = false;

  const timer = setTimeout(async () => {

    if (handled) return;
    handled = true;

    await updateDoc(doc(db, "fares", id), {
      status: "returned",
      assignedTo: "",
      currentDriverUID: f.originalDriverUID
    });

    stopAllSounds();
    popup.style.display = "none";

  }, 12000);

  document.getElementById("acceptBtn").onclick = async () => {

    if (handled) return;
    handled = true;

    await updateDoc(doc(db, "fares", id), {
      status: "accepted",
      currentDriverUID: currentUser.uid
    });

    stopAllSounds();
    acceptSound.play();

    popup.style.display = "none";
    clearTimeout(timer);
  };

  document.getElementById("rejectBtn").onclick = async () => {

    if (handled) return;
    handled = true;

    await updateDoc(doc(db, "fares", id), {
      status: "returned",
      assignedTo: "",
      currentDriverUID: f.originalDriverUID
    });

    stopAllSounds();
    declineSound.play();

    popup.style.display = "none";
    clearTimeout(timer);
  };
}

/* RETURN SOUND (FOR A) */
function listenReturns() {

  const q = query(
    collection(db, "fares"),
    where("originalDriverUID", "==", auth.currentUser.uid),
    where("status", "==", "returned")
  );

  onSnapshot(q, snap => {

    snap.docChanges().forEach(change => {

      if (change.type === "modified") {
        declineSound.play();
      }

    });

  });
}