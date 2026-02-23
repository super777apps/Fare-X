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

const acceptSound = document.getElementById("acceptSound");
const declineSound = document.getElementById("declineSound");
const notifySound = document.getElementById("notifySound");

let dispatchTimer = null;

// ------------------- TAB SYSTEM -------------------
window.showTab = function(tab){
  poolTab.style.display = tab === "pool" ? "block":"none";
  postedTab.style.display = tab === "posted" ? "block":"none";
  acceptedTab.style.display = tab === "accepted" ? "block":"none";
};

// ------------------- LOGOUT -------------------
window.logout = async () => {
  try{
    await signOut(auth);
    window.location.href = "index.html";
  }catch(err){
    alert("Logout failed: " + err.message);
  }
};

// ------------------- AUTH CHECK -------------------
onAuthStateChanged(auth, async user => {
  if(!user){
    window.location.href = "index.html";
    return;
  }

  userInfo.textContent = `Logged in: ${user.email}`;

  const snap = await getDoc(doc(db,"drivers",user.uid));
  if(!snap.exists()){
    alert("Please complete your driver profile");
    window.location.href="profile.html";
    return;
  }

  startListeners(user.email, snap.data());
});

// ------------------- START LISTENERS -------------------
function startListeners(myEmail, myProfile){

  // ---------- Broadcast Pool ----------
  onSnapshot(
    query(collection(db,"fares"), where("status","==","broadcast")),
    snap => {
      poolList.innerHTML = "";
      snap.forEach(d => {
        const f = d.data();
        if(f.createdBy === myEmail) return;
        poolList.appendChild(renderCard(f,d.id,"pool"));
      });
    }
  );

  // ---------- My Posted ----------
  onSnapshot(
    query(collection(db,"fares"), where("createdBy","==",myEmail)),
    snap => {
      postedList.innerHTML = "";
      snap.forEach(d => {
        postedList.appendChild(renderCard(d.data(),d.id,"posted"));
      });
    }
  );

  // ---------- My Accepted ----------
  onSnapshot(
    query(collection(db,"fares"), where("acceptedBy","==",myEmail)),
    snap => {
      acceptedList.innerHTML = "";
      snap.forEach(d => {
        const f = d.data();
        if(f.status==="accepted")
          acceptedList.appendChild(renderCard(f,d.id,"accepted"));
      });
    }
  );

  // ---------- PRIVATE DISPATCH ENGINE ----------
  onSnapshot(
    query(collection(db,"privateFares"),
      where("target","==",myEmail),
      where("status","==","private")
    ),
    snap => {
      snap.forEach(d => {
        const f = d.data();
        showPrivatePopup(f,d.id);
        playDispatchSound();
      });
    }
  );

}

// ------------------- DISPATCH SOUND ENGINE -------------------
function playDispatchSound(){
  const audio = new Audio("assets/job.mp3");
  audio.loop = true;
  audio.play();

  dispatchTimer = setTimeout(()=>{
    audio.pause();
    audio.currentTime = 0;
  },12000);
}

// ------------------- PRIVATE POPUP -------------------
function showPrivatePopup(f,id){

  if(document.getElementById("privatePopup")) return;

  const div = document.createElement("div");
  div.className="private-popup";
  div.id="privatePopup";

  div.innerHTML=`
    <div class="popup-card">
      <h3>🚖 New Job From ${f.senderNickname || f.senderEmail}</h3>

      <div><b>Pickup:</b> ${f.pickup}</div>
      <div><b>Drop:</b> ${f.drop}</div>
      <div><b>Time:</b> ${f.time}</div>
      <div><b>Price:</b> $${f.price}</div>

      <div class="popup-actions">
        <button class="accept-btn" onclick="acceptPrivate('${id}')">Accept</button>
        <button class="cancel-btn" onclick="rejectPrivate('${id}')">Reject</button>
      </div>
    </div>
  `;

  document.body.appendChild(div);
}

// ------------------- PRIVATE ACCEPT / REJECT -------------------
window.acceptPrivate = async (id)=>{
  clearTimeout(dispatchTimer);

  await updateDoc(doc(db,"privateFares",id),{
    status:"accepted",
    acceptedBy: auth.currentUser.email
  });

  acceptSound.play();
  location.reload();
};

window.rejectPrivate = async (id)=>{
  clearTimeout(dispatchTimer);

  await updateDoc(doc(db,"privateFares",id),{
    status:"returned",
    rejectedBy: auth.currentUser.email,
    rejectedAt: serverTimestamp()
  });

  declineSound.play();
  location.reload();
};

// ------------------- RENDER CARD -------------------
function renderCard(f,id,type){
  const d=document.createElement("div");
  d.className="fare-card";

  d.innerHTML=`
  <div class="fare-row"><span>Pickup :</span><b>${f.pickup}</b></div>
  <div class="fare-row"><span>Drop :</span><b>${f.drop}</b></div>
  <div class="fare-row"><span>Time :</span><b>${formatTime(f.time)}</b></div>
  <div class="fare-row"><span>Price :</span><b>${f.priceType==="meter"?"Meter + $"+f.price:"$"+f.price}</b></div>
  <div class="fare-row"><span>Notes :</span><b>${f.note||"-"}</b></div>
  <div class="fare-row"><span>Source :</span><b>${f.createdBy}</b></div>

  <div class="fare-actions">
    ${type==="pool"?`<button class="accept-btn" onclick="acceptFare('${id}')">Accept</button>`:""}
    ${type==="posted" && f.status!=="completed"?`<button class="cancel-btn" onclick="cancelFare('${id}')">Cancel</button>`:""}
    ${type==="accepted"?`
      <button class="accept-btn" onclick="completeFare('${id}')">Complete</button>
      <button class="cancel-btn" onclick="cancelFare('${id}')">Cancel</button>
    `:""}
  </div>`;

  return d;
}

// ------------------- FARE ACTIONS -------------------
window.acceptFare=async(id)=>{
  await updateDoc(doc(db,"fares",id),{
    status:"accepted",
    acceptedBy:auth.currentUser.email
  });
  acceptSound.play();
};

window.cancelFare=async(id)=>{
  const r=prompt("Cancel Reason:");
  if(!r) return;

  await updateDoc(doc(db,"fares",id),{
    status:"broadcast",
    cancelReason:r,
    acceptedBy:""
  });

  declineSound.play();
};

window.completeFare=async(id)=>{
  await updateDoc(doc(db,"fares",id),{
    status:"completed",
    completedAt:serverTimestamp()
  });

  acceptSound.play();
};

// ------------------- TIME FORMAT -------------------
function formatTime(val){
  if(!val) return "-";
  const d=new Date(val);
  const n=new Date();
  if(d.toDateString()===n.toDateString()){
    return "Today · "+d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
  }
  return d.toLocaleDateString()+" · "+d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
}