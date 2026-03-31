import { db, auth } from "./firebase.js";

import {
  collection, query, where, onSnapshot,
  doc, updateDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;

const jobSound = new Audio("assets/job.mp3");
let soundTimer = null;

/* ---------- STOP SOUND ---------- */
function stopSound(){
  jobSound.pause();
  jobSound.currentTime = 0;
  if(soundTimer) clearTimeout(soundTimer);
}

/* ---------- AUTH ---------- */
onAuthStateChanged(auth, async (user) => {

  if (!user) return location.href = "index.html";

  const snap = await getDoc(doc(db, "users", user.uid));
  const u = snap.data();

  if (u.role !== "driver") {
    location.href = "dashboardPassenger.html";
    return;
  }

  currentUser = user;

  document.getElementById("userName").textContent = u.nickName || user.email;
  listenJobs();
});

/* ---------- JOB LIST ---------- */
function listenJobs() {

  const box = document.getElementById("jobList");

  const q = query(collection(db, "fares"));

  onSnapshot(q, snap => {

    box.innerHTML = "";

    snap.forEach(async d => {

      const f = d.data();

      const isAssigned = f.assignedTo === currentUser.uid;
      const isCurrent = f.currentDriverUID === currentUser.uid;

      /* 🔊 SOUND LOOP (12 sec) */
      if (isAssigned && f.status==="waiting response" && !f.soundPlayed) {

        jobSound.loop = true;
        jobSound.play();

        soundTimer = setTimeout(()=>{
          stopSound();
        },12000);

        await updateDoc(doc(db,"fares",d.id),{
          soundPlayed:true
        });
      }

      const div = document.createElement("div");
      div.className = "fare-card";

      div.innerHTML = `
        <div><b>${f.pickupSuburb}</b> → <b>${f.dropSuburb}</b></div>
        <div>Status: ${f.status}</div>
        <div>Passenger: ${f.passengerName}</div>
        <div>Original: ${f.originalDriverName}</div>
        <div>Current: ${f.currentDriverName}</div>

        ${renderButtons(d.id,f,isAssigned,isCurrent)}
      `;

      box.appendChild(div);
    });

  });
}

/* ---------- BUTTONS ---------- */
function renderButtons(id,f,isAssigned,isCurrent){

  if(isAssigned && f.status==="waiting response"){
    return `
      <button onclick="acceptJob('${id}')">Accept</button>
      <button onclick="rejectJob('${id}')">Reject</button>
    `;
  }

  if(isCurrent){
    return `<button onclick="cancelJob('${id}')">Cancel</button>`;
  }

  return "";
}

/* ---------- ACTIONS ---------- */
window.acceptJob = async id => {

  const snap = await getDoc(doc(db,"fares",id));
  const f = snap.data();

  const userSnap = await getDoc(doc(db,"users",currentUser.uid));
  const myName = userSnap.data().nickName || currentUser.email;

  await updateDoc(doc(db,"fares",id),{
    status:"accepted",
    currentDriverUID: currentUser.uid,
    currentDriverName: myName,
    assignedTo: null
  });

  stopSound();
};

window.rejectJob = async id => {

  const snap = await getDoc(doc(db,"fares",id));
  const f = snap.data();

  await updateDoc(doc(db,"fares",id),{
    status:"returned",
    currentDriverUID: f.originalDriverUID,
    currentDriverName: f.originalDriverName,
    assignedTo:null,
    soundPlayed:false
  });

  stopSound();
};

window.cancelJob = async id => {

  if(!confirm("Cancel job?")) return;

  await updateDoc(doc(db,"fares",id),{
    status:"deleted"
  });
};