import { db, auth } from "./firebase.js";
import { sendToFriend } from "./dispatchEngine.js";

import {
  collection, addDoc, query, where, onSnapshot,
  serverTimestamp, doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

/* ---------- DEBOUNCE ---------- */
function debounce(fn, delay=500){
  let t;
  return (...args)=>{
    clearTimeout(t);
    t=setTimeout(()=>fn(...args),delay);
  }
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

/* ---------- MAP INIT ---------- */
function initMaps(){

  pickupMap = L.map('pickupMap').setView([31.52,74.35],13);
  dropMap = L.map('dropMap').setView([31.52,74.35],13);

  const tile='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  L.tileLayer(tile).addTo(pickupMap);
  L.tileLayer(tile).addTo(dropMap);

  /* pickup click */
  pickupMap.on('click', async e=>{
    pickupLat=e.latlng.lat;
    pickupLng=e.latlng.lng;

    if(pickupMarker) pickupMap.removeLayer(pickupMarker);
    pickupMarker=L.marker([pickupLat,pickupLng]).addTo(pickupMap);

    pickupInput.value = await reverseGeocode(pickupLat,pickupLng);
  });

  /* drop click */
  dropMap.on('click', async e=>{
    dropLat=e.latlng.lat;
    dropLng=e.latlng.lng;

    if(dropMarker) dropMap.removeLayer(dropMarker);
    dropMarker=L.marker([dropLat,dropLng]).addTo(dropMap);

    dropInput.value = await reverseGeocode(dropLat,dropLng);
  });
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

  },()=>alert("Enable location permission"));
};

/* ---------- AUTH ---------- */
onAuthStateChanged(auth, async user=>{
  if(!user) return location.href="index.html";

  currentUser=user;

  const snap=await getDoc(doc(db,"users",user.uid));
  currentUserData=snap.data();

  loadFriends(user.uid);

  if(currentUserData.role==="passenger"){
    sendType.value="friend";
    sendType.disabled=true;
    friendSelect.style.display="block";
  }

  initMaps();
});

/* ---------- UI ---------- */
sendType.addEventListener("change", ()=>{
  const isFriend = sendType.value==="friend";
  friendSelect.style.display=isFriend?"block":"none";
  longBtn.style.display=isFriend?"block":"none";
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

/* ---------- CREATE ---------- */
btn.onclick=async()=>{

  const pickup=pickupInput.value.trim();
  const drop=dropInput.value.trim();
  const time=document.getElementById("datetime").value;
  const price=document.getElementById("price").value.trim();

  if(!pickup||!drop||!time||!price){
    return alert("Fill all fields");
  }

  const data={
    pickup, drop,
    pickupLat, pickupLng,
    dropLat, dropLng,
    time, price,
    createdUid: currentUser.uid,
    createdBy: currentUser.email,
    createdAt: serverTimestamp()
  };

  if(sendType.value==="friend"){
    const friendUID=friendSelect.value;
    if(!friendUID) return alert("Select driver");

    data.status="assigned";

    const ref=await addDoc(collection(db,"fares"),data);
    await sendToFriend(ref.id,friendUID,currentUser.uid);

    alert("Sent to driver");
    location.href="dashboardDriver.html";
  }

  if(sendType.value==="pool"){
    await addDoc(collection(db,"fares"),{...data,status:"broadcast"});
    alert("Broadcast created");
    location.href="dashboardDriver.html";
  }

  if(sendType.value==="auto"){
    await addDoc(collection(db,"fares"),{...data,status:"searching"});
    alert("Auto dispatch started");
    location.href="dashboardDriver.html";
  }
};