import { db, auth } from "./firebase.js";

import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc
}
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged
}
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;

let pickupLat = null;
let pickupLng = null;
let dropLat = null;
let dropLng = null;

let pickupMap, dropMap;
let pickupMarker, dropMarker;

function getSuburb(x){
  if(!x) return "";
  return x.split(",")[0];
}

function generateJobId(){
  return Math.random().toString(36).substring(2,10).toUpperCase();
}

/* ---------------- PAGE LOAD ---------------- */
document.addEventListener("DOMContentLoaded", ()=>{

  const pickupInput = document.getElementById("pickup");
  const dropInput   = document.getElementById("drop");
  const gpsBtn      = document.getElementById("gpsBtn");
  const createBtn   = document.getElementById("createFareBtn");

  const driverSelect = document.getElementById("driverSelect");

  /* ---------- MAPS ---------- */
  pickupMap = L.map("pickupMap").setView([31.52,74.35],13);
  dropMap   = L.map("dropMap").setView([31.52,74.35],13);

  const tile = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  L.tileLayer(tile).addTo(pickupMap);
  L.tileLayer(tile).addTo(dropMap);

  /* ---------- PICKUP MAP ---------- */
  pickupMap.on("click", e=>{

    pickupLat = e.latlng.lat;
    pickupLng = e.latlng.lng;

    if(pickupMarker) pickupMap.removeLayer(pickupMarker);

    pickupMarker = L.marker([pickupLat,pickupLng]).addTo(pickupMap);
  });

  /* ---------- DROP MAP ---------- */
  dropMap.on("click", e=>{

    dropLat = e.latlng.lat;
    dropLng = e.latlng.lng;

    if(dropMarker) dropMap.removeLayer(dropMarker);

    dropMarker = L.marker([dropLat,dropLng]).addTo(dropMap);
  });

  /* ---------- GPS ---------- */
  gpsBtn.onclick = ()=>{

    navigator.geolocation.getCurrentPosition(pos=>{

      pickupLat = pos.coords.latitude;
      pickupLng = pos.coords.longitude;

      pickupMap.setView([pickupLat,pickupLng],15);

      if(pickupMarker) pickupMap.removeLayer(pickupMarker);

      pickupMarker = L.marker([pickupLat,pickupLng]).addTo(pickupMap);

    },()=>alert("Enable location"));
  };

  /* ---------- AUTH ---------- */
  onAuthStateChanged(auth, async user=>{

    if(!user){
      location.href="index.html";
      return;
    }

    currentUser = user;

    /* ---------- LOAD DRIVERS ---------- */
    const q = query(
      collection(db,"friends"),
      where("owner","==",user.uid)
    );

    onSnapshot(q,snap=>{

      driverSelect.innerHTML =
      `<option value="">Select Driver</option>`;

      snap.forEach(d=>{

        const f = d.data();

        const uid =
          f.friendUID || f.uid || "";

        const name =
          f.nickName ||
          f.name ||
          f.email ||
          "Driver";

        if(!uid) return;

        const opt = document.createElement("option");

        opt.value = uid;
        opt.textContent = name;

        driverSelect.appendChild(opt);
      });
    });
  });

  /* ---------- CREATE ---------- */
  createBtn.onclick = async ()=>{

    if(!currentUser){
      alert("Wait loading...");
      return;
    }

    const pickup = pickupInput.value.trim();
    const drop   = dropInput.value.trim();
    const time   = document.getElementById("datetime").value;
    const price  = document.getElementById("price").value.trim();
    const driverUID = driverSelect.value;

    if(!pickup || !drop || !time || !price || !driverUID){
      alert("Fill all fields");
      return;
    }

    const snap = await getDoc(
      doc(db,"users",currentUser.uid)
    );

    const passengerName =
      snap.exists()
      ? snap.data().nickName || currentUser.email
      : currentUser.email;

    await addDoc(collection(db,"fares"),{

      jobId: generateJobId(),

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

      passengerUID: currentUser.uid,
      passengerName,

      originalDriverUID: driverUID,
      assignedTo: driverUID,

      currentDriverUID:null,
      currentDriverName:null,

      broadcast:false,
      autoDispatch:false,

      status:"waiting response",

      createdAt:serverTimestamp(),
      soundPlayed:false
    });

    alert("Job sent");

    location.href="dashboardPassenger.html";
  };

});