import { db, auth } from "./firebase.js";
import { autoDispatch } from "./dispatch.js";

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

// ✅ NEW (EDIT MODE)
let editId = null;

/* ---------- ELEMENTS ---------- */
const pickupInput = document.getElementById("pickup");
const dropInput = document.getElementById("drop");

const pickupBox = document.getElementById("pickupSuggestions");
const dropBox = document.getElementById("dropSuggestions");

const gpsBtn = document.getElementById("gpsBtn");
const sendType = document.getElementById("sendType");
const friendSelect = document.getElementById("friendSelect");
const passengerSelect = document.getElementById("passengerSelect");

const btn = document.getElementById("createFareBtn");
const longBtn = null;

/* ---------- MAP INIT ---------- */
function initMaps(){

  pickupMap = L.map('pickupMap').setView([31.52,74.35],13);
  dropMap = L.map('dropMap').setView([31.52,74.35],13);

  const tile='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  L.tileLayer(tile).addTo(pickupMap);
  L.tileLayer(tile).addTo(dropMap);

  pickupMap.on('click', async e=>{
    pickupLat=e.latlng.lat;
    pickupLng=e.latlng.lng;

    if(pickupMarker) pickupMap.removeLayer(pickupMarker);
    pickupMarker=L.marker([pickupLat,pickupLng]).addTo(pickupMap);

    pickupInput.value = await reverseGeocode(pickupLat,pickupLng);
  });

  dropMap.on('click', async e=>{
    dropLat=e.latlng.lat;
    dropLng=e.latlng.lng;

    if(dropMarker) dropMap.removeLayer(dropMarker);
    dropMarker=L.marker([dropLat,dropLng]).addTo(dropMap);

    dropInput.value = await reverseGeocode(dropLat,dropLng);
  });
}

/* ---------- LOAD EXISTING JOB (NEW) ---------- */
async function loadExistingJob(id){

  const snap = await getDoc(doc(db,"fares",id));
  if(!snap.exists()) return;

  const f = snap.data();

  pickupInput.value = f.pickup || "";
  dropInput.value = f.drop || "";

  document.getElementById("datetime").value = f.time || "";
  document.getElementById("price").value = f.price || "";
  document.getElementById("notes").value = f.notes || "";

  pickupLat = f.pickupLat;
  pickupLng = f.pickupLng;
  dropLat = f.dropLat;
  dropLng = f.dropLng;

  if(pickupLat && pickupLng){
    pickupMap.setView([pickupLat,pickupLng],15);
    pickupMarker=L.marker([pickupLat,pickupLng]).addTo(pickupMap);
  }

  if(dropLat && dropLng){
    dropMap.setView([dropLat,dropLng],15);
    dropMarker=L.marker([dropLat,dropLng]).addTo(dropMap);
  }

  if(f.passengerUID){
    passengerSelect.value = f.passengerUID;
  }

  if(f.assignedTo){
    sendType.value="friend";
    friendSelect.style.display="block";
    friendSelect.value = f.assignedTo;
  }

  btn.textContent = "Update & Resend";
}

/* ---------- SEARCH ---------- */
async function searchAddress(q){
  if(q.length < 3) return [];

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`
  );

  return await res.json();
}

/* ---------- REVERSE ---------- */
async function reverseGeocode(lat,lng){
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
  );
  const data = await res.json();
  return data.display_name || "Selected location";
}

/* ---------- SUGGESTIONS ---------- */
function showSuggestions(list, box, input, type){

  box.innerHTML="";
  box.style.display="block";

  list.forEach(item=>{
    const div=document.createElement("div");
    div.textContent=item.display_name;

    div.onclick=()=>{
      input.value=item.display_name;

      const lat=parseFloat(item.lat);
      const lng=parseFloat(item.lon);

      if(type==="pickup"){
        pickupLat=lat; pickupLng=lng;
        pickupMap.setView([lat,lng],15);
        if(pickupMarker) pickupMap.removeLayer(pickupMarker);
        pickupMarker=L.marker([lat,lng]).addTo(pickupMap);
      }

      if(type==="drop"){
        dropLat=lat; dropLng=lng;
        dropMap.setView([lat,lng],15);
        if(dropMarker) dropMap.removeLayer(dropMarker);
        dropMarker=L.marker([lat,lng]).addTo(dropMap);
      }

      box.innerHTML="";
    };

    box.appendChild(div);
  });
}

/* ---------- INPUT EVENTS ---------- */
pickupInput.addEventListener("input", async ()=>{
  const list = await searchAddress(pickupInput.value);
  showSuggestions(list,pickupBox,pickupInput,"pickup");
});

dropInput.addEventListener("input", async ()=>{
  const list = await searchAddress(dropInput.value);
  showSuggestions(list,dropBox,dropInput,"drop");
});

/* ---------- GPS ---------- */
gpsBtn.onclick=()=>{
  navigator.geolocation.getCurrentPosition(async pos=>{
    pickupLat=pos.coords.latitude;
    pickupLng=pos.coords.longitude;

    pickupMap.setView([pickupLat,pickupLng],15);

    if(pickupMarker) pickupMap.removeLayer(pickupMarker);
    pickupMarker=L.marker([pickupLat,pickupLng]).addTo(pickupMap);

    pickupInput.value = await reverseGeocode(pickupLat,pickupLng);
  });
};

/* ---------- AUTH ---------- */
onAuthStateChanged(auth, async user=>{
  if(!user) return location.href="index.html";

  currentUser=user;

  const snap=await getDoc(doc(db,"users",user.uid));
  currentUserData=snap.data();

  initMaps();

  loadFriends(user.uid);
  loadPassengers(user.uid);

  // ✅ CHECK EDIT MODE
  const params = new URLSearchParams(window.location.search);
  editId = params.get("id");

  if(editId){
    setTimeout(()=>loadExistingJob(editId),500);
  }
});

/* ---------- LOADERS ---------- */
function loadFriends(uid){
  const q=query(collection(db,"friends"));

  onSnapshot(q,snap=>{
    friendSelect.innerHTML='<option value="">Select Driver</option>';

    snap.forEach(d=>{
      const f=d.data();
      const owner = f.owner || f.createdBy || f.userId;
      if(owner !== uid) return;

      const friendUID = f.friendUID || f.uid || f.driverUID;
      const name = f.name || f.nickName || f.email || "Driver";
      if(!friendUID) return;

      const opt=document.createElement("option");
      opt.value=friendUID;
      opt.textContent=name;

      friendSelect.appendChild(opt);
    });
  });
}

function loadPassengers(uid){
  const q=query(collection(db,"passengers"));

  onSnapshot(q,snap=>{
    passengerSelect.innerHTML='<option value="">Select Passenger</option>';

    snap.forEach(d=>{
      const p=d.data();
      const owner = p.owner || p.createdBy || p.userId;
      if(owner !== uid) return;

      const passengerUID = p.passengerUID || p.uid;
      const name = p.nickName || p.name || p.email || "Passenger";
      if(!passengerUID) return;

      const opt=document.createElement("option");
      opt.value=passengerUID;
      opt.textContent=name;

      passengerSelect.appendChild(opt);
    });
  });
}

/* ---------- UI FIX ---------- */
sendType.addEventListener("change", ()=>{
  const val = sendType.value;
  friendSelect.style.display = (val==="friend")?"block":"none";
});

/* ---------- CREATE / RESEND ---------- */
btn.onclick=async()=>{

  const pickup=pickupInput.value.trim();
  const drop=dropInput.value.trim();
  const time=document.getElementById("datetime").value;
  const price=document.getElementById("price").value.trim();
  const notes = document.getElementById("notes").value.trim();
  const passengerUID = passengerSelect.value;

  if(!pickup||!drop||!time||!price||!passengerUID){
    return alert("Fill all fields");
  }

  const passengerSnap = await getDoc(doc(db,"users",passengerUID));
  const passengerName = passengerSnap.data()?.nickName || "Passenger";

  const myName = currentUserData.nickName || currentUser.email;

  let assignedTo = null;

  if(sendType.value==="friend"){
    assignedTo = friendSelect.value;
    if(!assignedTo) return alert("Select friend driver");
  }

const isBroadcast = sendType.value === "broadcast";

  // ✅ EDIT MODE (RESEND)
  if(editId){

    await updateDoc(doc(db,"fares",editId),{

      pickup,
      drop,
      pickupSuburb:getSuburb(pickup),
      dropSuburb:getSuburb(drop),

      pickupLat, pickupLng,
      dropLat, dropLng,

      time,
      price,
      notes,

      passengerUID,
      passengerName,

      currentDriverUID: currentUser.uid,
      currentDriverName: myName,

      status:"waiting response",
      assignedTo: assignedTo,
      soundPlayed:false,
      declinedBy:[]
    });

    alert("Job resent");
    return location.href="dashboardDriver.html";
  }


const jobType = document.getElementById("sendType").value;

const isBroadcast = jobType === "broadcast";
const isAuto = jobType === "auto"; // 🔥 ADD THIS

const docRef = await addDoc(collection(db,"fares"),{

  pickup,
  drop,
  pickupSuburb:getSuburb(pickup),
  dropSuburb:getSuburb(drop),

  pickupLat,
  pickupLng,
  dropLat,
  dropLng,

  time,
  price,
  notes,

  passengerUID,
  passengerName,

  // 🔵 CREATOR (A)
  originalDriverUID: currentUser.uid,
  originalDriverName: myName,

  // 🔵 INITIALLY NO DRIVER (IMPORTANT)
  currentDriverUID: null,
  currentDriverName: null,


  // 🔵 DISPATCH CONTROL
assignedTo: null,
broadcast: isBroadcast,
autoDispatch: isAuto,   // 🔥 ADD THIS LINE

// 🔵 STATUS
status: "waiting response",

  createdAt: serverTimestamp(),
  soundPlayed: false
});
  if(assignedTo){
    setTimeout(async ()=>{
      const snap = await getDoc(docRef);
      const f = snap.data();

      if(f.status==="waiting response"){
        await updateDoc(docRef,{
          status:"returned",
          assignedTo:null,
          soundPlayed:false
        });
      }
    },12000);
  }

  alert("Job sent");
  location.href="dashboardDriver.html";
};