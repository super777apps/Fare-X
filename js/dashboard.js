import { db, auth } from "./firebase.js";
import {
  collection, query, onSnapshot, where,
  doc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const logoutBtn = document.getElementById("logoutBtn");
const poolList = document.getElementById("poolList");
const postedList = document.getElementById("postedList");
const acceptedList = document.getElementById("acceptedList");
const userInfo = document.getElementById("userInfo");

const acceptSound = document.getElementById("acceptSound");
const declineSound = document.getElementById("declineSound");
const notifySound = document.getElementById("notifySound");

let alarmAudio;
let alarmTimer;

/* ---------------- LOGOUT ---------------- */

if(logoutBtn){
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    location.replace("index.html");
  });
}

/* ---------------- AUTH ---------------- */

onAuthStateChanged(auth, user => {
  if (!user) return location.href = "index.html";

  userInfo.textContent = "Logged in: " + user.email;

  startListeners(user);
});

/* ---------------- MASTER LISTENERS ---------------- */

function startListeners(user){

  const myEmail = user.email;
  const myUid   = user.uid;

  /* ---------- BROADCAST POOL ---------- */

  onSnapshot(
    query(collection(db,"fares")),
    snap => {
      poolList.innerHTML = "";
      snap.forEach(d => {
        const f = d.data();

        if(f.status === "broadcast" && f.createdBy !== myEmail){
          poolList.appendChild(renderCard(f, d.id, "pool"));
        }
      });
    }
  );

  /* ---------- MY POSTED ---------- */

  onSnapshot(
    query(collection(db,"fares"), where("createdBy","==",myEmail)),
    snap => {
      postedList.innerHTML = "";
      snap.forEach(d => postedList.appendChild(renderCard(d.data(), d.id, "posted")));
    }
  );

  /* ---------- MY ACCEPTED ---------- */

  onSnapshot(
    query(collection(db,"fares"), where("acceptedBy","==",myEmail)),
    snap => {
      acceptedList.innerHTML = "";
      snap.forEach(d => acceptedList.appendChild(renderCard(d.data(), d.id, "accepted")));
    }
  );

  /* ---------- PRIVATE JOB RECEIVER ---------- */

  onSnapshot(
    query(collection(db,"privateFares"), where("targetUID","==",myUid)),
    snap => {
      snap.forEach(d => {
        if(d.data().status === "pending"){
          showPrivateDispatch(d.data(), d.id);
        }
      });
    }
  );

  /* ---------- RETURNED JOB RECEIVER ---------- */

  onSnapshot(
    query(collection(db,"privateFares"), where("createdBy","==",myEmail)),
    snap => {
      snap.forEach(d => {
        if(d.data().status === "returned"){
          showReturnedJob(d.data(), d.id);
        }
      });
    }
  );

}

/* ---------------- PRIVATE DISPATCH POPUP ---------------- */

function showPrivateDispatch(f,id){

  if(document.getElementById("dispatchPopup")) return;

  startAlarm();

  const div = document.createElement("div");
  div.id = "dispatchPopup";
  div.className = "private-popup";

  div.innerHTML = `
    <div class="popup-card">
      <h2>🚖 Private Job</h2>

      <p><b>From:</b> ${f.createdBy}</p>
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

  setTimeout(()=> autoReject(id),12000);
}

/* ---------------- SOUND ENGINE ---------------- */

function startAlarm(){
  alarmAudio = new Audio("assets/job.mp3");
  alarmAudio.loop = true;
  alarmAudio.play();

  alarmTimer = setTimeout(stopAlarm,12000);
}

function stopAlarm(){
  if(alarmAudio){
    alarmAudio.pause();
    alarmAudio.currentTime = 0;
  }
  clearTimeout(alarmTimer);
}

/* ---------------- ACCEPT / REJECT PRIVATE ---------------- */

window.acceptPrivate = async id => {
  stopAlarm();

  await updateDoc(doc(db,"privateFares",id),{
    status:"accepted",
    acceptedBy:auth.currentUser.email,
    acceptedAt:serverTimestamp()
  });

  acceptSound.play();
  document.getElementById("dispatchPopup")?.remove();
};

window.rejectPrivate = async id => {
  stopAlarm();

  await updateDoc(doc(db,"privateFares",id),{
    status:"returned",
    rejectedBy:auth.currentUser.email,
    rejectedAt:serverTimestamp()
  });

  declineSound.play();
  document.getElementById("dispatchPopup")?.remove();
};

async function autoReject(id){
  await updateDoc(doc(db,"privateFares",id),{
    status:"returned",
    rejectedBy:"timeout",
    rejectedAt:serverTimestamp()
  });
  stopAlarm();
}

/* ---------------- RETURN POPUP ---------------- */

function showReturnedJob(){
  declineSound.play();
  alert("❌ Job declined by driver. You can resend.");
}

/* ---------------- FARE CARDS ---------------- */

function renderCard(f,id,type){

  const d=document.createElement("div");
  d.className="fare-card";

  d.innerHTML = `
    <div class="fare-row"><span>Pickup :</span><b>${f.pickup}</b></div>
    <div class="fare-row"><span>Drop :</span><b>${f.drop}</b></div>
    <div class="fare-row"><span>Time :</span><b>${f.time}</b></div>
    <div class="fare-row"><span>Price :</span><b>$${f.price}</b></div>
    <div class="fare-row"><span>Source :</span><b>${f.createdBy}</b></div>

    <div class="fare-actions">
      ${type==="pool"?`<button class="accept-btn" onclick="acceptFare('${id}')">Accept</button>`:""}
      ${type==="posted"?`<button class="cancel-btn" onclick="cancelFare('${id}')">Cancel</button>`:""}
      ${type==="accepted"?`
        <button class="accept-btn" onclick="completeFare('${id}')">Complete</button>
        <button class="cancel-btn" onclick="cancelFare('${id}')">Cancel</button>
      `:""}
    </div>
  `;
  return d;
}

/* ---------------- NORMAL ACCEPT ---------------- */

window.acceptFare = async id => {
  await updateDoc(doc(db,"fares",id),{
    status:"accepted",
    acceptedBy:auth.currentUser.email
  });
  acceptSound.play();
};

window.cancelFare = async id => {
  const r=prompt("Cancel Reason:");
  if(!r) return;

  await updateDoc(doc(db,"fares",id),{
    status:"broadcast",
    acceptedBy:"",
    cancelReason:r
  });
  declineSound.play();
};

window.completeFare = async id => {
  await updateDoc(doc(db,"fares",id),{
    status:"completed",
    completedAt:serverTimestamp()
  });
  acceptSound.play();
};