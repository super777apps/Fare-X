import { db, auth } from "./firebase.js";
import {
  collection, query, onSnapshot, where,
  doc, updateDoc, serverTimestamp, addDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const poolList = document.getElementById("poolList");
const postedList = document.getElementById("postedList");
const acceptedList = document.getElementById("acceptedList");
const userInfo = document.getElementById("userInfo");

const acceptSound = document.getElementById("acceptSound");
const declineSound = document.getElementById("declineSound");
const notifySound = document.getElementById("notifySound");

let alarmAudio;
let alarmTimer;

// ---------------- TAB SWITCH ----------------
window.showTab = tab => {
  poolTab.style.display = tab === "pool" ? "block" : "none";
  postedTab.style.display = tab === "posted" ? "block" : "none";
  acceptedTab.style.display = tab === "accepted" ? "block" : "none";
};

// ---------------- LOGOUT ----------------
window.logout = async () => {
  await signOut(auth);
  location.href = "index.html";
};

// ---------------- AUTH ----------------
onAuthStateChanged(auth, user => {
  if (!user) location.href = "index.html";
  userInfo.textContent = "Logged in: " + user.email;
  startListeners(user.email);
});

// ---------------- MASTER LISTENERS ----------------
function startListeners(myEmail){

  // Broadcast Pool
  onSnapshot(
    query(collection(db,"fares"), where("status","==","broadcast")),
    snap => {
      poolList.innerHTML = "";
      snap.forEach(d => {
        if(d.data().createdBy !== myEmail){
          poolList.appendChild(renderCard(d.data(), d.id, "pool"));
        }
      });
    }
  );

  // My Posted
  onSnapshot(
    query(collection(db,"fares"), where("createdBy","==",myEmail)),
    snap => {
      postedList.innerHTML = "";
      snap.forEach(d => postedList.appendChild(renderCard(d.data(), d.id, "posted")));
    }
  );

  // My Accepted
  onSnapshot(
    query(collection(db,"fares"), where("acceptedBy","==",myEmail)),
    snap => {
      acceptedList.innerHTML = "";
      snap.forEach(d => acceptedList.appendChild(renderCard(d.data(), d.id, "accepted")));
    }
  );

  // 🚀 PRIVATE JOB RECEIVER ENGINE
  onSnapshot(
    query(collection(db,"privateFares"),
      where("target","==",myEmail),
      where("status","==","pending")
    ),
    snap => {
      snap.forEach(d => showPrivateDispatch(d.data(), d.id));
    }
  );

  // 🔄 RETURNED JOB ENGINE (FOR SENDER)
  onSnapshot(
    query(collection(db,"privateFares"),
      where("createdBy","==",myEmail),
      where("status","==","returned")
    ),
    snap => {
      snap.forEach(d => showReturnedJob(d.data(), d.id));
    }
  );

}

// ---------------- PRIVATE DISPATCH POPUP ----------------
function showPrivateDispatch(f,id){

  if(document.getElementById("dispatchPopup")) return;

  startAlarm();

  const div = document.createElement("div");
  div.id = "dispatchPopup";
  div.className = "private-popup";

  div.innerHTML = `
    <div class="popup-card">
      <h2>🚖 Job From ${f.senderNickname || f.createdBy}</h2>

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

// ---------------- ALARM ENGINE ----------------
function startAlarm(){
  alarmAudio = new Audio("assets/job.mp3");
  alarmAudio.loop = true;
  alarmAudio.play();

  alarmTimer = setTimeout(()=> stopAlarm(),12000);
}

function stopAlarm(){
  if(alarmAudio){
    alarmAudio.pause();
    alarmAudio.currentTime = 0;
  }
  clearTimeout(alarmTimer);
}

// ---------------- ACCEPT / REJECT ----------------
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
  const ref = doc(db,"privateFares",id);
  await updateDoc(ref,{
    status:"returned",
    rejectedBy:"timeout",
    rejectedAt:serverTimestamp()
  });
  stopAlarm();
}

// ---------------- RETURN POPUP FOR SENDER ----------------
function showReturnedJob(f,id){

  declineSound.play();

  alert(`❌ Job declined by driver.\nYou can resend it.`);
}

// ---------------- STANDARD FARE CARDS ----------------
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
      ${type==="posted"?`
        <button class="cancel-btn" onclick="cancelFare('${id}')">Cancel</button>
      `:""}
      ${type==="accepted"?`
        <button class="accept-btn" onclick="completeFare('${id}')">Complete</button>
        <button class="cancel-btn" onclick="cancelFare('${id}')">Cancel</button>
      `:""}
    </div>
  `;
  return d;
}

// ---------------- NORMAL ACCEPT ----------------
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