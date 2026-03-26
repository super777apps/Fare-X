import { db, auth } from "./firebase.js";
import { sendToFriend } from "./dispatchEngine.js";

import {
  collection, addDoc, query, where, onSnapshot,
  serverTimestamp, doc, getDoc, updateDoc, getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;
let currentUserData = null;

const sendType = document.getElementById("sendType");
const friendSelect = document.getElementById("friendSelect");
const btn = document.getElementById("createFareBtn");
const longBtn = document.getElementById("longSendBtn");
const gpsBtn = document.getElementById("gpsBtn");

const pickupInput = document.getElementById("pickup");
const dropInput = document.getElementById("drop");

let map, marker;
let pickupLat = null;
let pickupLng = null;
let dropLat = null;
let dropLng = null;

/* ---------- SUGGESTION BOX ---------- */
function createSuggestionBox(input) {
  const box = document.createElement("div");

  box.style.position = "absolute";
  box.style.background = "#111";
  box.style.color = "#fff";
  box.style.zIndex = "999";
  box.style.width = input.offsetWidth + "px";
  box.style.borderRadius = "8px";
  box.style.maxHeight = "150px";
  box.style.overflowY = "auto";

  input.parentNode.style.position = "relative";
  input.parentNode.appendChild(box);

  return box;
}

const pickupBox = createSuggestionBox(pickupInput);
const dropBox = createSuggestionBox(dropInput);

/* ---------- SEARCH ADDRESS ---------- */
async function searchAddress(query) {
  if (query.length < 3) return [];

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
  );

  return await res.json();
}

/* ---------- REVERSE GEOCODE ---------- */
async function reverseGeocode(lat, lng) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
  );

  const data = await res.json();
  return data.display_name || `${lat}, ${lng}`;
}

/* ---------- RENDER SUGGESTIONS ---------- */
function renderSuggestions(list, box, type) {

  box.innerHTML = "";

  list.forEach(item => {

    const div = document.createElement("div");
    div.style.padding = "8px";
    div.style.cursor = "pointer";
    div.textContent = item.display_name;

    div.onclick = () => {

      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);

      if (type === "pickup") {
        pickupInput.value = item.display_name;
        pickupLat = lat;
        pickupLng = lng;
      } else {
        dropInput.value = item.display_name;
        dropLat = lat;
        dropLng = lng;
      }

      setMapLocation(lat, lng);
      box.innerHTML = "";
    };

    box.appendChild(div);
  });
}

/* ---------- INPUT EVENTS ---------- */
pickupInput.addEventListener("input", async () => {
  const results = await searchAddress(pickupInput.value);
  renderSuggestions(results, pickupBox, "pickup");
});

dropInput.addEventListener("input", async () => {
  const results = await searchAddress(dropInput.value);
  renderSuggestions(results, dropBox, "drop");
});

/* ---------- MAP ---------- */
function initMap() {

  setTimeout(() => {

    map = L.map('pickupMap').setView([-33.8688, 151.2093], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);

    map.invalidateSize();

    map.on('click', async function(e) {

      const lat = e.latlng.lat;
      const lng = e.latlng.lng;

      pickupLat = lat;
      pickupLng = lng;

      setMapLocation(lat, lng);

      // ✅ ALWAYS convert to ADDRESS (fix your issue)
      pickupInput.value = await reverseGeocode(lat, lng);
    });

  }, 300);
}

/* ---------- SET MAP ---------- */
function setMapLocation(lat, lng) {

  map.setView([lat, lng], 15);

  if (marker) map.removeLayer(marker);

  marker = L.marker([lat, lng]).addTo(map);
}

/* ---------- GPS ---------- */
gpsBtn.onclick = () => {

  if (!navigator.geolocation) {
    return alert("GPS not supported");
  }

  navigator.geolocation.getCurrentPosition(async (pos) => {

    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    pickupLat = lat;
    pickupLng = lng;

    setMapLocation(lat, lng);

    pickupInput.value = await reverseGeocode(lat, lng);

  }, () => {
    alert("Enable location permission in browser settings");
  });
};

/* ---------- AUTH ---------- */
onAuthStateChanged(auth, async user => {

  if (!user) return location.href = "index.html";

  currentUser = user;

  const snap = await getDoc(doc(db, "users", user.uid));
  currentUserData = snap.data();

  loadFriends(user.uid);

  if (currentUserData.role === "passenger") {
    sendType.value = "friend";
    sendType.disabled = true;
    friendSelect.style.display = "block";
  }

  initMap();
});

/* ---------- UI ---------- */
sendType.addEventListener("change", () => {
  const isFriend = sendType.value === "friend";
  friendSelect.style.display = isFriend ? "block" : "none";
  longBtn.style.display = isFriend ? "block" : "none";
});

/* ---------- LOAD FRIENDS ---------- */
function loadFriends(uid) {

  const q = query(collection(db, "friends"), where("owner", "==", uid));

  onSnapshot(q, snap => {

    friendSelect.innerHTML = '<option value="">Select Driver</option>';

    snap.forEach(d => {
      const f = d.data();

      const opt = document.createElement("option");
      opt.value = f.friendUID;
      opt.textContent = f.name || f.email;

      friendSelect.appendChild(opt);
    });

  });
}

/* ---------- DISTANCE ---------- */
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ---------- AUTO DISPATCH ---------- */
async function autoDispatch(jobId) {

  if (!pickupLat || !pickupLng) {
    alert("Select pickup on map");
    return;
  }

  const snap = await getDocs(
    query(collection(db, "users"),
      where("role", "==", "driver"),
      where("online", "==", true)
    )
  );

  let nearest = null;
  let min = Infinity;

  snap.forEach(docSnap => {

    const d = docSnap.data();
    if (!d.location) return;

    const dist = getDistance(
      pickupLat, pickupLng,
      d.location.lat, d.location.lng
    );

    if (dist < min) {
      min = dist;
      nearest = { id: docSnap.id, ...d };
    }
  });

  if (!nearest) {
    alert("No online drivers");
    return;
  }

  await updateDoc(doc(db, "fares", jobId), {
    currentDriverUID: nearest.id,
    currentDriverName: nearest.nickName || nearest.email,
    status: "waiting response",
    pickupLat,
    pickupLng
  });
}

/* ---------- CREATE ---------- */
btn.onclick = async () => {

  const pickup = pickupInput.value.trim();
  const drop = dropInput.value.trim();
  const time = document.getElementById("datetime").value;
  const price = document.getElementById("price").value.trim();

  if (!pickup || !drop || !time || !price) {
    return alert("Fill all fields");
  }

  const data = {
    pickup,
    drop,
    time,
    price,
    pickupLat,
    pickupLng,
    dropLat,
    dropLng,
    createdUid: currentUser.uid,
    createdBy: currentUser.email,
    createdAt: serverTimestamp()
  };

  if (sendType.value === "friend") {

    const friendUID = friendSelect.value;
    if (!friendUID) return alert("Select driver");

    data.status = "assigned";

    const ref = await addDoc(collection(db, "fares"), data);

    await sendToFriend(ref.id, friendUID, currentUser.uid);

    alert("Sent to driver");
    location.href = "dashboardDriver.html";
    return;
  }

  if (sendType.value === "auto") {

    const ref = await addDoc(collection(db, "fares"), {
      ...data,
      status: "searching"
    });

    await autoDispatch(ref.id);

    alert("Auto dispatch started");
    location.href = "dashboardDriver.html";
  }

  if (sendType.value === "pool") {

    await addDoc(collection(db, "fares"), {
      ...data,
      status: "broadcast"
    });

    alert("Broadcast created");
    location.href = "dashboardDriver.html";
  }
};