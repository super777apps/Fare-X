import { db, auth } from "./firebase.js";
import { sendToFriend } from "./dispatchEngine.js";

import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;
let currentUserData = null;

const sendType = document.getElementById("sendType");
const friendSelect = document.getElementById("friendSelect");
const btn = document.getElementById("createFareBtn");
const longBtn = document.getElementById("longSendBtn");

/* ---------- AUTH ---------- */
onAuthStateChanged(auth, async user => {

  if (!user) return location.href = "index.html";

  currentUser = user;

  const snap = await getDoc(doc(db,"users",user.uid));
  currentUserData = snap.data();

  loadFriends(user.uid);

  if (currentUserData.role === "passenger") {
    sendType.value = "friend";
    sendType.disabled = true;
    friendSelect.style.display = "block";
  }
});

/* ---------- SHOW UI ---------- */
sendType.addEventListener("change", () => {

  const isFriend = sendType.value === "friend";

  friendSelect.style.display = isFriend ? "block" : "none";
  longBtn.style.display = isFriend ? "block" : "none";
});

/* ---------- LOAD FRIENDS ---------- */
function loadFriends(uid){

  const q = query(collection(db,"friends"),where("owner","==",uid));

  onSnapshot(q,snap=>{
    friendSelect.innerHTML='<option value="">Select Driver</option>';

    snap.forEach(d=>{
      const f=d.data();
      const opt=document.createElement("option");
      opt.value=f.friendUID;
      opt.textContent=f.name || f.email;
      friendSelect.appendChild(opt);
    });
  });
}

/* ---------- DISTANCE ---------- */
function getDistance(lat1, lon1, lat2, lon2){
  const R=6371;
  const dLat=(lat2-lat1)*Math.PI/180;
  const dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+
    Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*
    Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

/* ---------- AUTO DISPATCH ---------- */
async function autoDispatch(jobId){

  const snap=await getDocs(
    query(collection(db,"users"),
      where("role","==","driver"),
      where("online","==",true)
    )
  );

  let nearest=null;
  let min=Infinity;

  const pickupLat=31.5204;
  const pickupLng=74.3587;

  snap.forEach(docSnap=>{
    const d=docSnap.data();
    if(!d.location) return;

    const dist=getDistance(
      pickupLat,pickupLng,
      d.location.lat,d.location.lng
    );

    if(dist<min){
      min=dist;
      nearest={id:docSnap.id,...d};
    }
  });

  if(!nearest){
    alert("No online drivers");
    return;
  }

  await updateDoc(doc(db,"fares",jobId),{
    currentDriverUID:nearest.id,
    currentDriverName:nearest.nickName,
    status:"waiting response"
  });
}

/* ---------- CREATE ---------- */
btn.onclick = async () => {

  const pickup = document.getElementById("pickup").value.trim();
  const drop = document.getElementById("drop").value.trim();
  const time = document.getElementById("datetime").value;
  const price = document.getElementById("price").value.trim();

  if (!pickup || !drop || !time || !price) {
    return alert("Fill all fields");
  }

  const data = {
    pickup, drop, time, price,
    createdUid: currentUser.uid,
    createdBy: currentUser.email,
    createdAt: serverTimestamp()
  };

  /* FRIEND */
  if (sendType.value === "friend") {

    const friendUID = friendSelect.value;
    if (!friendUID) return alert("Select driver");

    data.status = "assigned";

    const ref = await addDoc(collection(db,"fares"),data);

    await sendToFriend(ref.id, friendUID, currentUser.uid);

    alert("Sent to driver");
    location.href="dashboardDriver.html";
    return;
  }

  /* AUTO */
  if (sendType.value === "auto") {

    const ref = await addDoc(collection(db,"fares"),{
      ...data,
      status:"searching"
    });

    await autoDispatch(ref.id);

    alert("Auto dispatch started");
    location.href="dashboardDriver.html";
  }

};