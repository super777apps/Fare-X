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

/* ---------- MAP INIT (FIXED) ---------- */
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
  try{
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );
    const data = await res.json();
    return data.display_name || "Selected location";
  }catch{
    return "Selected location";
  }
}

/* ---------- AUTOCOMPLETE (FIXED) ---------- */
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

function debounce(fn, delay=500){
  let t;
  return (...args)=>{
    clearTimeout(t);
    t=setTimeout(()=>fn(...args),delay);
  }
}

pickupInput.addEventListener("input", debounce(async ()=>{
  const list = await searchAddress(pickupInput.value);
  showSuggestions(list,pickupBox,pickupInput,"pickup");
}));

dropInput.addEventListener("input", debounce(async ()=>{
  const list = await searchAddress(dropInput.value);
  showSuggestions(list,dropBox,dropInput,"drop");
}));

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

  loadFriends(user.uid);
  loadPassengers(user.uid);

  initMaps(); // ✅ FIXED
});

/* ---------- LOAD DROPDOWNS ---------- */
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

/* ---------- SEND TYPE UI ---------- */
sendType.addEventListener("change", ()=>{

  const val = sendType.value;

  friendSelect.style.display = (val==="friend")?"block":"none";
  longBtn.style.display = (val==="friend")?"block":"none";
});

/* ---------- CREATE ---------- */
btn.onclick=async()=>{

  const pickup=pickupInput.value.trim();
  const drop=dropInput.value.trim();
  const time=document.getElementById("datetime").value;
  const price=document.getElementById("price").value.trim();

  const passengerUID = passengerSelect.value;

  if(!pickup||!drop||!time||!price||!passengerUID){
    return alert("Fill all fields");
  }

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

  if(sendType.value==="friend"){

    const friendUID=friendSelect.value;
    if(!friendUID) return alert("Select driver");

    const ref = await addDoc(collection(db,"fares"), baseData);

    await updateDoc(doc(db,"fares",ref.id),{
      assignedTo: friendUID
    });

    alert("Sent to driver");
    location.href="dashboardDriver.html";
  }
};

/* ---------- LONG SEND BUTTON ---------- */
longBtn.onclick=()=>{
  alert("Auto resend until accepted will be added next step");
};