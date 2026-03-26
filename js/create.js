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

let map, marker, dropMarker;
let pickupLat = null, pickupLng = null;
let dropLat = null, dropLng = null;

/* ---------- REVERSE GEO (COORD → ADDRESS) ---------- */
async function getAddress(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );
    const data = await res.json();
    return data.display_name || `${lat}, ${lng}`;
  } catch {
    return `${lat}, ${lng}`;
  }
}

/* ---------- SEARCH ADDRESS ---------- */
async function searchAddress(queryText) {
  if (!queryText || queryText.length < 3) return [];

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${queryText}`
  );
  return await res.json();
}

/* ---------- INIT MAP ---------- */
function initMap() {

  setTimeout(() => {

    map = L.map('pickupMap').setView([-33.8688, 151.2093], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);

    map.invalidateSize();

    map.on('click', async function(e) {

      pickupLat = e.latlng.lat;
      pickupLng = e.latlng.lng;

      if (marker) map.removeLayer(marker);
      marker = L.marker([pickupLat, pickupLng]).addTo(map);

      // ✅ ALWAYS SHOW ADDRESS
      pickupInput.value = "Loading address...";
      pickupInput.value = await getAddress(pickupLat, pickupLng);
    });

  }, 300);
}

/* ---------- GPS ---------- */
gpsBtn.onclick = async () => {

  if (!navigator.geolocation) {
    return alert("GPS not supported");
  }

  navigator.geolocation.getCurrentPosition(async (pos) => {

    pickupLat = pos.coords.latitude;
    pickupLng = pos.coords.longitude;

    map.setView([pickupLat, pickupLng], 15);

    if (marker) map.removeLayer(marker);
    marker = L.marker([pickupLat, pickupLng]).addTo(map);

    pickupInput.value = "Loading address...";
    pickupInput.value = await getAddress(pickupLat, pickupLng);

  }, () => {
    alert("⚠️ Location permission denied\n\nAllow location in browser settings");
  });
};

/* ---------- AUTO SUGGEST PICKUP ---------- */
pickupInput.addEventListener("input", async () => {

  const results = await searchAddress(pickupInput.value);

  if (results.length > 0) {
    const r = results[0];

    pickupLat = parseFloat(r.lat);
    pickupLng = parseFloat(r.lon);

    map.setView([pickupLat, pickupLng], 15);

    if (marker) map.removeLayer(marker);
    marker = L.marker([pickupLat, pickupLng]).addTo(map);
  }
});

/* ---------- AUTO SUGGEST DROP ---------- */
dropInput.addEventListener("input", async () => {

  const results = await searchAddress(dropInput.value);

  if (results.length > 0) {
    const r = results[0];

    dropLat = parseFloat(r.lat);
    dropLng = parseFloat(r.lon);

    if (dropMarker) map.removeLayer(dropMarker);
    dropMarker = L.marker([dropLat, dropLng]).addTo(map);
  }
});

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
    alert("Select pickup");
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
    pickupLat,
    pickupLng,
    dropLat,
    dropLng,
    time,
    price,
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