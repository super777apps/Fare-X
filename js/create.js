import { db, auth } from "./firebase.js";
import { sendToFriend } from "./dispatchEngine.js";

import {
  collection, addDoc, query, where, onSnapshot,
  serverTimestamp, doc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ---------- HELPERS ---------- */
function getSuburb(fullAddress){
  if(!fullAddress) return "";
  return fullAddress.split(",")[0];
}

/* ---------- STATE ---------- */
let currentUser, currentUserData;
let pickupLat=null, pickupLng=null;
let dropLat=null, dropLng=null;

let pickupMap, dropMap;
let pickupMarker, dropMarker;

/* ---------- ELEMENTS ---------- */
const pickupInput = document.getElementById("pickup");
const dropInput = document.getElementById("drop");

const pickupBox = document.getElementById("pickupSuggestions");
const dropBox = document.getElementById("dropSuggestions");

const gpsBtn = document.getElementById("gpsBtn");
const sendType = document.getElementById("sendType");
const friendSelect = document.getElementById("friendSelect");
const btn = document.getElementById("createFareBtn");
const longBtn = document.getElementById("longSendBtn");
let passengerSelect = document.getElementById("passengerSelect");

/* ---------- AUTH ---------- */
onAuthStateChanged(auth, async user=>{
  if(!user) return location.href="index.html";

  currentUser=user;

  const snap=await getDoc(doc(db,"users",user.uid));
  currentUserData=snap.data();

  loadFriends(user.uid);
  loadPassengers(user.uid);
});

/* ---------- FRIENDS ---------- */
function loadFriends(uid){
  const q=query(collection(db,"friends"),where("owner","==",uid));

  onSnapshot(q,snap=>{
    friendSelect.innerHTML='<option value="">Select Driver</option>';
    snap.forEach(d=>{
      const f=d.data();
      const opt=document.createElement("option");
      opt.value=f.friendUID;
      opt.textContent=f.name||f.email;
      friendSelect.appendChild(opt);
    });
  });
}

/* ---------- PASSENGERS ---------- */
function loadPassengers(uid){
  const q=query(collection(db,"passengers"),where("owner","==",uid));

  onSnapshot(q,snap=>{
    passengerSelect.innerHTML='<option value="">Select Passenger</option>';

    snap.forEach(d=>{
      const p=d.data();
      const opt=document.createElement("option");
      opt.value=p.passengerUID;
      opt.textContent=p.nickName || p.email;
      passengerSelect.appendChild(opt);
    });
  });
}

/* ---------- CREATE ---------- */
btn.onclick=async()=>{

  const pickup=pickupInput.value.trim();
  const drop=dropInput.value.trim();
  const time=document.getElementById("datetime").value;
  const price=document.getElementById("price").value.trim();

  if(!pickup||!drop||!time||!price){
    return alert("Fill all fields");
  }

  const passengerUID = passengerSelect.value;
  if(!passengerUID) return alert("Select passenger");

  const passengerSnap = await getDoc(doc(db,"users",passengerUID));
  const passengerName = passengerSnap.data()?.nickName || "Passenger";

  const myName = currentUserData.nickName || currentUser.email;

  const baseData={
    pickup,
    drop,
    pickupSuburb:getSuburb(pickup),
    dropSuburb:getSuburb(drop),

    pickupLat, pickupLng,
    dropLat, dropLng,

    time,
    price,

    passengerUID,
    passengerName,

    originalDriverUID: currentUser.uid,
    originalDriverName: myName,

    currentDriverUID: currentUser.uid,
    currentDriverName: myName,

    status:"waiting response",

    createdAt: serverTimestamp(),

    soundPlayed:false
  };

  /* =============================
     SEND TO FRIEND (MAIN LOGIC)
  ============================== */
  if(sendType.value==="friend"){

    const friendUID=friendSelect.value;
    if(!friendUID) return alert("Select driver");

    const ref = await addDoc(collection(db,"fares"), baseData);

    // assign to friend
    await updateDoc(doc(db,"fares",ref.id),{
      assignedTo: friendUID
    });

    alert("Job sent to driver");
    location.href="dashboardDriver.html";
  }
};