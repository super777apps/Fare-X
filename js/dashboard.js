import { db, auth } from "./firebase.js";
import {
  collection, query, onSnapshot, where,
  doc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const poolTab = document.getElementById("poolTab");
const postedTab = document.getElementById("postedTab");
const acceptedTab = document.getElementById("acceptedTab");

const poolList = document.getElementById("poolList");
const postedList = document.getElementById("postedList");
const acceptedList = document.getElementById("acceptedList");

const userInfo = document.getElementById("userInfo");
const logoutBtn = document.getElementById("logoutBtn");

const acceptSound = document.getElementById("acceptSound");
const declineSound = document.getElementById("declineSound");

let alarmAudio;
let alarmTimer;

/* ---------------- TAB SWITCH ---------------- */

window.showTab = tab => {
  poolTab.style.display = tab === "pool" ? "block" : "none";
  postedTab.style.display = tab === "posted" ? "block" : "none";
  acceptedTab.style.display = tab === "accepted" ? "block" : "none";
};

/* ---------------- LOGOUT ---------------- */

logoutBtn.onclick = async () => {
  await signOut(auth);
  location.replace("index.html");
};

/* ---------------- AUTH ---------------- */

onAuthStateChanged(auth, user => {
  if (!user) return location.href="index.html";

  userInfo.textContent = user.email;

  startListeners(user);
});

/* ---------------- MASTER LISTENERS ---------------- */

function startListeners(user){

  /* ---- BROADCAST POOL ---- */
  onSnapshot(
    query(collection(db,"fares"), where("status","==","broadcast")),
    snap => {
      poolList.innerHTML="";
      snap.forEach(d=>{
        if(d.data().createdUid !== user.uid){
          poolList.appendChild(renderCard(d.data(),d.id,"pool"));
        }
      });
    }
  );

  /* ---- MY POSTED ---- */
  onSnapshot(
    query(collection(db,"fares"), where("createdUid","==",user.uid)),
    snap => {
      postedList.innerHTML="";
      snap.forEach(d=>{
        postedList.appendChild(renderCard(d.data(),d.id,"posted"));
      });
    }
  );

  /* ---- MY ACCEPTED ---- */
  onSnapshot(
    query(collection(db,"fares"), where("acceptedUid","==",user.uid)),
    snap => {
      acceptedList.innerHTML="";
      snap.forEach(d=>{
        acceptedList.appendChild(renderCard(d.data(),d.id,"accepted"));
      });
    }
  );

  /* ---- PRIVATE JOB RECEIVER ---- */
  onSnapshot(
    query(
      collection(db,"privateFares"),
      where("targetUID","==",user.uid),
      where("status","==","pending")
    ),
    snap => {
      snap.forEach(d=> showPrivatePopup(d.data(), d.id));
    }
  );

}

/* ---------------- PRIVATE JOB POPUP ---------------- */

function showPrivatePopup(f,id){

  if(document.getElementById("dispatchPopup")) return;

  startAlarm();

  const div=document.createElement("div");
  div.id="dispatchPopup";
  div.className="private-popup";

  div.innerHTML=`
    <div class="popup-card">
      <h2>🚖 Job from ${f.createdBy}</h2>

      <p><b>Pickup:</b> ${f.pickup}</p>
      <p><b>Drop:</b> ${f.drop}</p>
      <p><b>Time:</b> ${f.time}</p>
      <p><b>Price:</b> $${f.price}</p>

      <div class="popup-actions">
        <button class="accept-btn" onclick="acceptPrivate('${id}')">Accept</button>
        <button class="cancel-btn" onclick="rejectPrivate('${id}')">Reject</button>
      </div>
    </div>
  `;

  document.body.appendChild(div);

  setTimeout(()=>autoReject(id),12000);
}

/* ---------------- SOUND ENGINE ---------------- */

function startAlarm(){
  alarmAudio = new Audio("assets/job.mp3");
  alarmAudio.loop=true;
  alarmAudio.play();
  alarmTimer=setTimeout(stopAlarm,12000);
}

function stopAlarm(){
  if(alarmAudio){
    alarmAudio.pause();
    alarmAudio.currentTime=0;
  }
  clearTimeout(alarmTimer);
}

/* ---------------- ACCEPT / REJECT ---------------- */

window.acceptPrivate = async id => {
  stopAlarm();

  await updateDoc(doc(db,"privateFares",id),{
    status:"accepted",
    acceptedUid:auth.currentUser.uid,
    acceptedAt:serverTimestamp()
  });

  acceptSound.play();
  document.getElementById("dispatchPopup")?.remove();
};

window.rejectPrivate = async id => {
  stopAlarm();

  await updateDoc(doc(db,"privateFares",id),{
    status:"returned",
    rejectedUid:auth.currentUser.uid,
    rejectedAt:serverTimestamp()
  });

  declineSound.play();
  document.getElementById("dispatchPopup")?.remove();
};

async function autoReject(id){
  await updateDoc(doc(db,"privateFares",id),{
    status:"returned",
    rejectedUid:"timeout",
    rejectedAt:serverTimestamp()
  });
  stopAlarm();
}

/* ---------------- CARD RENDER ---------------- */

function renderCard(f,id,type){

  const d=document.createElement("div");
  d.className="fare-card";

  d.innerHTML=`
    <div class="fare-row"><span>Pickup:</span><b>${f.pickup}</b></div>
    <div class="fare-row"><span>Drop:</span><b>${f.drop}</b></div>
    <div class="fare-row"><span>Time:</span><b>${f.time}</b></div>
    <div class="fare-row"><span>Price:</span><b>$${f.price}</b></div>

    <div class="fare-actions">
      ${type==="pool"?`<button class="accept-btn" onclick="acceptFare('${id}')">Accept</button>`:""}
      ${type==="posted"?`<button class="cancel-btn" onclick="cancelFare('${id}')">Cancel</button>`:""}
      ${type==="accepted"?`<button class="accept-btn" onclick="completeFare('${id}')">Complete</button>`:""}
    </div>
  `;
  return d;
}

/* ---------------- NORMAL FLOW ---------------- */

window.acceptFare=async id=>{
  await updateDoc(doc(db,"fares",id),{
    status:"accepted",
    acceptedUid:auth.currentUser.uid
  });
  acceptSound.play();
};

window.cancelFare=async id=>{
  const r=prompt("Cancel reason:");
  if(!r) return;

  await updateDoc(doc(db,"fares",id),{
    status:"broadcast",
    acceptedUid:"",
    cancelReason:r
  });
  declineSound.play();
};

window.completeFare=async id=>{
  await updateDoc(doc(db,"fares",id),{
    status:"completed",
    completedAt:serverTimestamp()
  });
  acceptSound.play();
};