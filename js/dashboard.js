import { db, auth } from "./firebase.js";
import {
  collection, query, onSnapshot, where,
  doc, updateDoc, serverTimestamp, getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ------------------- ELEMENTS -------------------

const poolList = document.getElementById("poolList");
const postedList = document.getElementById("postedList");
const acceptedList = document.getElementById("acceptedList");
const userInfo = document.getElementById("userInfo");

const acceptSound = document.getElementById("acceptSound");
const declineSound = document.getElementById("declineSound");
const notifySound = document.getElementById("notifySound");
const jobSound = document.getElementById("jobSound");

const poolTab = document.getElementById("poolTab");
const postedTab = document.getElementById("postedTab");
const acceptedTab = document.getElementById("acceptedTab");

let jobTimer = null;

// ------------------- TAB HANDLING -------------------

window.showTab = function(tab){
  poolTab.style.display = tab === "pool" ? "block" : "none";
  postedTab.style.display = tab === "posted" ? "block" : "none";
  acceptedTab.style.display = tab === "accepted" ? "block" : "none";
};

// ------------------- LOGOUT -------------------

window.logout = async function(){
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

  userInfo.textContent = "Logged in: " + user.email;

  const driverRef = doc(db,"drivers",user.uid);
  const snap = await getDoc(driverRef);

  if(!snap.exists() || !snap.data().nickname || !snap.data().carNumber || !snap.data().carBrand || !snap.data().email){
    alert("Please complete your driver profile first.");
    window.location.href = "profile.html";
    return;
  }

  startListeners(user.email);

});

// ------------------- ALERT SYSTEM -------------------

function playJobAlert(){
  jobSound.currentTime = 0;
  jobSound.loop = true;
  jobSound.play();

  jobTimer = setTimeout(() => {
    stopJobAlert();
  },12000);
}

function stopJobAlert(){
  jobSound.pause();
  jobSound.loop = false;
  clearTimeout(jobTimer);
}

// ------------------- LISTENERS -------------------

function startListeners(myEmail){

  // -------- POOL --------
  onSnapshot(query(collection(db,"fares"),where("status","==","broadcast")), snap=>{
    poolList.innerHTML="";
    snap.forEach(docSnap=>{
      poolList.appendChild(renderCard(docSnap.data(), docSnap.id, "pool"));
    });
  });

  // -------- MY POSTED --------
  onSnapshot(query(collection(db,"fares"),where("createdBy","==",myEmail)), snap=>{
    postedList.innerHTML="";
    snap.forEach(docSnap=>{
      postedList.appendChild(renderCard(docSnap.data(), docSnap.id, "posted"));
    });
  });

  // -------- MY ACCEPTED --------
  onSnapshot(query(collection(db,"fares"),where("acceptedBy","==",myEmail)), snap=>{
    acceptedList.innerHTML="";
    snap.forEach(docSnap=>{
      const f = docSnap.data();
      if(f.status==="accepted") acceptedList.appendChild(renderCard(f, docSnap.id, "accepted"));
    });
  });

  // -------- ASSIGNED TO ME --------
  onSnapshot(query(collection(db,"fares"),where("assignedTo","==",myEmail)), snap=>{

    snap.forEach(docSnap=>{

      const f = docSnap.data();

      if(f.status==="assigned"){
        playJobAlert();
        showJobPopup(docSnap.id,f);
      }

      if(f.status==="returned"){
        declineSound.play();
        alert("Job returned: " + f.returnReason);
      }

    });

  });

}

// ------------------- POPUP -------------------

function showJobPopup(id,f){

  if(document.getElementById("jobPopup")) return;

  const box=document.createElement("div");
  box.id="jobPopup";
  box.style=`
    position:fixed;
    top:0;left:0;
    width:100%;
    height:100%;
    background:rgba(0,0,0,.8);
    display:flex;
    align-items:center;
    justify-content:center;
    z-index:9999;
  `;

  box.innerHTML=`
  <div style="background:#111;padding:20px;border-radius:10px;width:300px;text-align:center">
    <h2 style="color:#d4af37">🚨 New Job</h2>
    <p>${f.pickup} → ${f.drop}</p>
    <p>${formatTime(f.time)}</p>
    <div style="display:flex;gap:10px;justify-content:center">
      <button class="accept-btn" onclick="acceptFare('${id}')">Accept</button>
      <button class="cancel-btn" onclick="rejectFare('${id}')">Reject</button>
    </div>
  </div>`;

  document.body.appendChild(box);
}

// ------------------- RENDER -------------------

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
    ${f.status==="returned"?`
      <button onclick="resendPool('${id}')">Broadcast</button>
    `:""}
  </div>`;

  return d;
}

// ------------------- ACTIONS -------------------

window.acceptFare = async(id)=>{
  await updateDoc(doc(db,"fares",id),{
    status:"accepted",
    acceptedBy:auth.currentUser.email
  });
  stopJobAlert();
  document.getElementById("jobPopup")?.remove();
  acceptSound.play();
};

window.rejectFare = async(id)=>{
  await updateDoc(doc(db,"fares",id),{
    status:"rejected"
  });
  stopJobAlert();
  document.getElementById("jobPopup")?.remove();
  declineSound.play();
};

window.cancelFare = async(id)=>{
  const r=prompt("Cancel Reason:");
  if(!r) return;

  await updateDoc(doc(db,"fares",id),{
    status:"broadcast",
    cancelReason:r,
    acceptedBy:""
  });

  declineSound.play();
};

window.completeFare = async(id)=>{
  await updateDoc(doc(db,"fares",id),{
    status:"completed",
    completedAt:serverTimestamp()
  });

  acceptSound.play();
};

window.resendPool = async(id)=>{
  await updateDoc(doc(db,"fares",id),{
    status:"broadcast",
    assignedTo:"",
    dispatchType:"pool"
  });
};

// ------------------- UTIL -------------------

function formatTime(val){
  const d=new Date(val);
  const n=new Date();
  if(d.toDateString()===n.toDateString()){
    return "Today · "+d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
  }
  return d.toLocaleDateString()+" · "+d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
}