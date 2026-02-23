import { db, auth } from "./firebase.js";
import {
  collection, query, onSnapshot, where,
  doc, updateDoc, serverTimestamp, getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const poolList = document.getElementById("poolList");
const postedList = document.getElementById("postedList");
const acceptedList = document.getElementById("acceptedList");
const userInfo = document.getElementById("userInfo");

const jobSound = new Audio("assets/job.mp3");
jobSound.loop = true;

const declineSound = new Audio("assets/decline.mp3");

let activeTimers = {};

/* ---------------- LOGOUT ---------------- */

window.logout = async function(){
  await signOut(auth);
  window.location.href = "index.html";
}

/* ---------------- AUTH ---------------- */

onAuthStateChanged(auth, async user => {
  if(!user){
    window.location.href = "index.html";
    return;
  }

  userInfo.textContent = "Logged in: " + user.email;

  startListeners(user);
});

/* ---------------- DISPATCH LISTENERS ---------------- */

function startListeners(user){

  const myEmail = user.email;
  const myUid = user.uid;

  /* ---- BROADCAST POOL ---- */

  onSnapshot(query(collection(db,"fares"), where("status","==","broadcast")), snap=>{
    poolList.innerHTML="";
    snap.forEach(docSnap=>{
      const f = docSnap.data();
      if(f.createdBy === myEmail) return;
      poolList.appendChild(renderCard(f, docSnap.id, "pool"));
    });
  });

  /* ---- MY POSTED ---- */

  onSnapshot(query(collection(db,"fares"), where("createdUid","==",myUid)), snap=>{
    postedList.innerHTML="";
    snap.forEach(docSnap=>{
      postedList.appendChild(renderCard(docSnap.data(), docSnap.id, "posted"));
    });
  });

  /* ---- MY ACCEPTED ---- */

  onSnapshot(query(collection(db,"fares"), where("acceptedBy","==",myEmail)), snap=>{
    acceptedList.innerHTML="";
    snap.forEach(docSnap=>{
      acceptedList.appendChild(renderCard(docSnap.data(), docSnap.id, "accepted"));
    });
  });

  /* ---- PRIVATE DISPATCH ---- */

  onSnapshot(query(collection(db,"privateFares"), where("targetUid","==",myUid)), snap=>{
    snap.forEach(docSnap=>{
      handleIncomingDispatch(docSnap.id, docSnap.data());
    });
  });

}

/* ---------------- DISPATCH ENGINE ---------------- */

async function handleIncomingDispatch(id, data){

  if(activeTimers[id]) return;

  jobSound.play();

  const timeout = setTimeout(async ()=>{

    jobSound.pause();
    jobSound.currentTime = 0;

    declineSound.play();

    await updateDoc(doc(db,"privateFares",id),{
      status:"timeout",
      declinedAt:serverTimestamp()
    });

    alert("Job timed out and returned to sender");

    delete activeTimers[id];

  },12000);

  activeTimers[id] = timeout;

}

/* ---------------- ACCEPT / DECLINE ---------------- */

window.acceptFare = async(id)=>{

  clearTimeout(activeTimers[id]);
  delete activeTimers[id];

  jobSound.pause();
  jobSound.currentTime = 0;

  await updateDoc(doc(db,"fares",id),{
    status:"accepted",
    acceptedBy:auth.currentUser.email,
    acceptedAt:serverTimestamp()
  });

}

window.cancelFare = async(id)=>{

  clearTimeout(activeTimers[id]);
  delete activeTimers[id];

  jobSound.pause();
  jobSound.currentTime = 0;

  declineSound.play();

  await updateDoc(doc(db,"fares",id),{
    status:"broadcast",
    acceptedBy:""
  });

}

/* ---------------- RENDER ---------------- */

function renderCard(f,id,type){

  const d=document.createElement("div");
  d.className="fare-card";

  d.innerHTML=`
  <div><b>${f.pickup}</b> → <b>${f.drop}</b></div>
  <div>🕒 ${f.time}</div>
  <div>💰 $${f.price}</div>

  <div style="margin-top:8px">
    ${type==="pool"?`<button onclick="acceptFare('${id}')">Accept</button>`:""}
    ${type==="accepted"?`
      <button onclick="completeFare('${id}')">Complete</button>
      <button onclick="cancelFare('${id}')">Cancel</button>
    `:""}
  </div>
  `;

  return d;
}

/* ---------------- COMPLETE ---------------- */

window.completeFare = async(id)=>{
  await updateDoc(doc(db,"fares",id),{
    status:"completed",
    completedAt:serverTimestamp()
  });
}

/* ---------------- TABS ---------------- */

window.showTab = function(tab){
  poolTab.style.display = tab==="pool"?"block":"none";
  postedTab.style.display = tab==="posted"?"block":"none";
  acceptedTab.style.display = tab==="accepted"?"block":"none";
}