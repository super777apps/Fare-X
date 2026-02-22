import { db, auth } from "./firebase.js";
import {
  collection, query, onSnapshot, where,
  doc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const poolList = document.getElementById("poolList");
const postedList = document.getElementById("postedList");
const acceptedList = document.getElementById("acceptedList");

const acceptSound = document.getElementById("acceptSound");
const declineSound = document.getElementById("declineSound");
const notifySound = document.getElementById("notifySound");

window.showTab = function(tab){
  poolTab.style.display = tab === "pool" ? "block":"none";
  postedTab.style.display = tab === "posted" ? "block":"none";
  acceptedTab.style.display = tab === "accepted" ? "block":"none";
}

onAuthStateChanged(auth, user => {
  if(!user){
    window.location.href = "index.html";
    return;
  }

  startListeners(user.email);
});

function startListeners(myEmail){

  // Broadcast Pool
  onSnapshot(query(collection(db,"fares"),where("status","==","broadcast")), snap=>{
    poolList.innerHTML="";
    snap.forEach(docSnap=>{
      const f = docSnap.data();
      if(f.createdBy === myEmail) return;

      poolList.appendChild(renderCard(f, docSnap.id, "pool"));
    });
  });

  // My Posted Jobs
  onSnapshot(query(collection(db,"fares"),where("createdBy","==",myEmail)), snap=>{
    postedList.innerHTML="";
    snap.forEach(docSnap=>{
      postedList.appendChild(renderCard(docSnap.data(), docSnap.id, "posted"));
    });
  });

  // My Accepted Jobs
  onSnapshot(query(collection(db,"fares"),where("acceptedBy","==",myEmail)), snap=>{
    acceptedList.innerHTML="";
    snap.forEach(docSnap=>{
      const f = docSnap.data();
      if(f.status==="accepted") acceptedList.appendChild(renderCard(f, docSnap.id, "accepted"));
    });
  });
}

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

function formatTime(val){
  const d=new Date(val);
  const n=new Date();
  if(d.toDateString()===n.toDateString()){
    return "Today · "+d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
  }
  return d.toLocaleDateString()+" · "+d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
}