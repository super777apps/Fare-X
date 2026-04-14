import { db, auth } from "./firebase.js";

import {
  collection, addDoc, query,
  onSnapshot, serverTimestamp,
  doc, getDoc, updateDoc
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

let editId = null;

/* ---------- ELEMENTS (SAFE INIT) ---------- */
let pickupInput, dropInput;
let pickupBox, dropBox;
let gpsBtn, sendType, friendSelect, passengerSelect, btn;

/* ---------- MAP INIT (SAFE) ---------- */
function initMaps(){

  const pickupEl = document.getElementById("pickupMap");
  const dropEl = document.getElementById("dropMap");

  if(!pickupEl || !dropEl){
    console.error("Map containers missing");
    return;
  }

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

/* ---------- LOAD EXISTING JOB ---------- */
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

  if(pickupMap && pickupLat){
    pickupMap.setView([pickupLat,pickupLng],15);
    pickupMarker=L.marker([pickupLat,pickupLng]).addTo(pickupMap);
  }

  if(dropMap && dropLat){
    dropMap.setView([dropLat,dropLng],15);
    dropMarker=L.marker([dropLat,dropLng]).addTo(dropMap);
  }

  if(passengerSelect) passengerSelect.value = f.passengerUID || "";

  if(f.assignedTo && sendType){
    sendType.value="friend";
    friendSelect.style.display="block";
    friendSelect.value = f.assignedTo;
  }

  if(btn) btn.textContent = "Update & Resend";
}

/* ---------- SEARCH ---------- */
async function searchAddress(q){
  if(q.length < 3) return [];
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`);
  return await res.json();
}

/* ---------- REVERSE ---------- */
async function reverseGeocode(lat,lng){
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
  const data = await res.json();
  return data.display_name || "Selected location";
}

/* ---------- SUGGESTIONS ---------- */
function showSuggestions(list, box, input, type){

  if(!box) return;

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
        pickupMap?.setView([lat,lng],15);
        if(pickupMarker) pickupMap.removeLayer(pickupMarker);
        pickupMarker=L.marker([lat,lng]).addTo(pickupMap);
      }

      if(type==="drop"){
        dropLat=lat; dropLng=lng;
        dropMap?.setView([lat,lng],15);
        if(dropMarker) dropMap.removeLayer(dropMarker);
        dropMarker=L.marker([lat,lng]).addTo(dropMap);
      }

      box.innerHTML="";
    };

    box.appendChild(div);
  });
}

/* ---------- INPUT EVENTS ---------- */
function bindInputs(){
  pickupInput?.addEventListener("input", async ()=>{
    const list = await searchAddress(pickupInput.value);
    showSuggestions(list,pickupBox,pickupInput,"pickup");
  });

  dropInput?.addEventListener("input", async ()=>{
    const list = await searchAddress(dropInput.value);
    showSuggestions(list,dropBox,dropInput,"drop");
  });
}

/* ---------- GPS ---------- */
function bindGPS(){
  gpsBtn?.addEventListener("click", ()=>{
    navigator.geolocation.getCurrentPosition(async pos=>{
      pickupLat=pos.coords.latitude;
      pickupLng=pos.coords.longitude;

      pickupMap?.setView([pickupLat,pickupLng],15);

      if(pickupMarker) pickupMap.removeLayer(pickupMarker);
      pickupMarker=L.marker([pickupLat,pickupLng]).addTo(pickupMap);

      pickupInput.value = await reverseGeocode(pickupLat,pickupLng);
    });
  });
}

/* ---------- AUTH ---------- */
onAuthStateChanged(auth, async user=>{
  if(!user) return location.href="index.html";

  currentUser=user;

  const snap=await getDoc(doc(db,"users",user.uid));
  currentUserData=snap.data();

  /* SAFE DOM INIT */
  pickupInput = document.getElementById("pickup");
  dropInput = document.getElementById("drop");
  pickupBox = document.getElementById("pickupSuggestions");
  dropBox = document.getElementById("dropSuggestions");
  gpsBtn = document.getElementById("gpsBtn");
  sendType = document.getElementById("sendType");
  friendSelect = document.getElementById("friendSelect");
  // ✅ FIXED: sendType binding AFTER DOM is ready
if(sendType && friendSelect){
  sendType.addEventListener("change", ()=>{
    friendSelect.style.display = (sendType.value === "friend") ? "block" : "none";
  });
}
  passengerSelect = document.getElementById("passengerSelect");
  

  initMaps();
  bindInputs();
  bindGPS();

  loadFriends(user.uid);
  loadPassengers(user.uid);

  const params = new URLSearchParams(window.location.search);
  editId = params.get("id");

  if(editId){
    setTimeout(()=>loadExistingJob(editId),800);
  }
});

/* ---------- FRIENDS ---------- */
function loadFriends(uid){
  const q=query(collection(db,"friends"));

  onSnapshot(q,snap=>{
    if(!friendSelect) return;

    friendSelect.innerHTML='<option value="">Select Driver</option>';

    snap.forEach(d=>{
      const f=d.data();
      const owner = f.owner || f.createdBy || f.userId;
      if(owner && owner !== uid) return;

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

/* ---------- PASSENGERS ---------- */
function loadPassengers(uid){
  const q=query(collection(db,"passengers"));

  onSnapshot(q,snap=>{
    if(!passengerSelect) return;

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


/* ---------- CREATE / RESEND ---------- */

btn = document.getElementById("createFareBtn");

btn?.addEventListener("click", async()=>{

  console.log("CLICK WORKING"); // 🔥 debug

  const pickup=pickupInput.value.trim();
  const drop=dropInput.value.trim();
  const time=document.getElementById("datetime").value;
  const price=document.getElementById("price").value.trim();
  const notes=document.getElementById("notes").value.trim();
  const passengerUID=passengerSelect.value;

  if(!pickup||!drop||!time||!price||!passengerUID){
    return alert("Fill all fields");
  }

  const passengerSnap = await getDoc(doc(db,"users",passengerUID));
  const passengerName = passengerSnap.data()?.nickName || "Passenger";

  const myName = currentUserData.nickName || currentUser.email;

  let assignedTo=null;
  if(sendType.value==="friend"){
    assignedTo=friendSelect.value;
    if(!assignedTo) return alert("Select friend driver");
  }

  const isBroadcast = sendType.value === "broadcast";
const isAuto = sendType.value === "auto";

// 🔁 RESEND FIX
const isResend = btn?.textContent.includes("Resend");

if (editId && isResend) {
  await updateDoc(doc(db, "fares", editId), {
    status: "deleted",
    updatedAt: serverTimestamp()
  });
}
// ✅ CREATE NEW JOB


  await addDoc(collection(db,"fares"),{
    pickup,drop,
    pickupSuburb:getSuburb(pickup),
    dropSuburb:getSuburb(drop),

    pickupLat,pickupLng,
    dropLat,dropLng,

    time,price,notes,
    passengerUID,passengerName,

    originalDriverUID: currentUser.uid,
    originalDriverName: myName,

    currentDriverUID:null,
    currentDriverName:null,

    assignedTo: assignedTo,
    broadcast:isBroadcast,
    autoDispatch:isAuto,

    status:"waiting response",
    createdAt:serverTimestamp(),
    soundPlayed:false
  });

  alert("Job sent");
  location.href="dashboardDriver.html";
});