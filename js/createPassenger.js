import { db, auth } from "./firebase.js";

import {
  collection, addDoc, query, where, onSnapshot,
  serverTimestamp, doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ---------- STATE ---------- */
let currentUser;

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

/* ---------- DEBOUNCE ---------- */
function debounce(fn, delay=400){
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

/* ---------- MAP INIT (FIXED) ---------- */
function initMaps(){

  setTimeout(()=>{

    pickupMap = L.map('pickupMap').setView([31.52,74.35],13);
    dropMap = L.map('dropMap').setView([31.52,74.35],13);

    const tile='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    L.tileLayer(tile).addTo(pickupMap);
    L.tileLayer(tile).addTo(dropMap);

    // 🔥 FIX BLANK MAP
    setTimeout(()=>{
      pickupMap.invalidateSize();
      dropMap.invalidateSize();
    },300);

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

  },300);
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

  loadDrivers();
  initMaps();
});

/* ---------- LOAD DRIVERS ---------- */
function loadDrivers(){

  const select = document.getElementById("driverSelect");

  const q=query(collection(db,"friends"),where("owner","==",currentUser.uid));

  onSnapshot(q,snap=>{
    select.innerHTML='<option value="">Select Driver</option>';

    snap.forEach(docSnap=>{
      const f=docSnap.data();

      const opt=document.createElement("option");
      opt.value=f.friendUID;
      opt.textContent=f.nickName||f.name||f.email;

      select.appendChild(opt);
    });
  });
}

/* ---------- CREATE ---------- */
document.getElementById("createFareBtn").onclick=async()=>{

  const pickup=pickupInput.value.trim();
  const drop=dropInput.value.trim();
  const time=document.getElementById("datetime").value;
  const price=document.getElementById("price").value.trim();
  const driverUID=document.getElementById("driverSelect").value;

  if(!pickup||!drop||!time||!price||!driverUID){
    return alert("Fill all fields");
  }

  const userSnap=await getDoc(doc(db,"users",currentUser.uid));
  const passengerName=userSnap.exists()
    ? userSnap.data().nickName || currentUser.email
    : currentUser.email;

  await addDoc(collection(db,"fares"),{
    pickup, drop,
    pickupLat, pickupLng,
    dropLat, dropLng,
    time, price,
    createdUid:currentUser.uid,
    passengerUID:currentUser.uid,
    passengerName,
    originalDriverUID:driverUID,
    currentDriverUID:driverUID,
    createdAt:serverTimestamp(),
    status:"requested"
  });

  alert("Job sent");
  location.href="dashboardPassenger.html";
};