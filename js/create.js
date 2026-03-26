import { db, auth } from "./firebase.js";
import { sendToFriend } from "./dispatchEngine.js";

import {
  collection, addDoc, query, where, onSnapshot,
  serverTimestamp, doc, getDoc, updateDoc, getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ---------- GLOBAL ---------- */
let currentUser = null;
let currentUserData = null;

const sendType = document.getElementById("sendType");
const friendSelect = document.getElementById("friendSelect");
const btn = document.getElementById("createFareBtn");
const longBtn = document.getElementById("longSendBtn");
const gpsBtn = document.getElementById("gpsBtn");

const pickupInput = document.getElementById("pickup");
const dropInput = document.getElementById("drop");

/* ---------- MAP ---------- */
let map, marker;
let pickupLat = null, pickupLng = null;
let dropLat = null, dropLng = null;

/* ---------- DEBOUNCE ---------- */
function debounce(fn, delay = 400) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ---------- CREATE DROPDOWN ---------- */
function createDropdown(input) {

  const box = document.createElement("div");

  box.style.position = "absolute";
  box.style.background = "#111";
  box.style.color = "#fff";
  box.style.zIndex = "9999";
  box.style.borderRadius = "8px";
  box.style.maxHeight = "180px";
  box.style.overflowY = "auto";
  box.style.display = "none";

  input.parentNode.style.position = "relative";
  input.parentNode.appendChild(box);

  return box;
}

const pickupBox = createDropdown(pickupInput);
const dropBox = createDropdown(dropInput);

/* ---------- SEARCH ---------- */
async function searchAddress(q) {

  if (q.length < 3) return [];

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`
    );

    return await res.json();

  } catch {
    return [];
  }
}

/* ---------- REVERSE ---------- */
async function reverseGeocode(lat, lng) {

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );

    const data = await res.json();

    return data.display_name || "Selected Location";

  } catch {
    return "Selected Location";
  }
}

/* ---------- SHOW DROPDOWN ---------- */
function showDropdown(list, box, input, type) {

  box.innerHTML = "";

  if (list.length === 0) {
    box.style.display = "none";
    return;
  }

  box.style.display = "block";
  box.style.width = input.offsetWidth + "px";

  list.forEach(item => {

    const div = document.createElement("div");

    div.style.padding = "10px";
    div.style.cursor = "pointer";
    div.textContent = item.display_name;

    div.onclick = () => {

      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);

      input.value = item.display_name;

      if (type === "pickup") {
        pickupLat = lat;
        pickupLng = lng;
      } else {
        dropLat = lat;
        dropLng = lng;
      }

      setMapLocation(lat, lng);
      box.style.display = "none";
    };

    box.appendChild(div);
  });
}

/* ---------- INPUT EVENTS ---------- */
pickupInput.addEventListener("input", debounce(async () => {
  const list = await searchAddress(pickupInput.value);
  showDropdown(list, pickupBox, pickupInput, "pickup");
}));

dropInput.addEventListener("input", debounce(async () => {
  const list = await searchAddress(dropInput.value);
  showDropdown(list, dropBox, dropInput, "drop");
}));

/* ---------- MAP ---------- */
function initMap() {

  setTimeout(() => {

    map = L.map('pickupMap').setView([-33.8688, 151.2093], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);

    map.on('click', async (e) => {

      const lat = e.latlng.lat;
      const lng = e.latlng.lng;

      pickupLat = lat;
      pickupLng = lng;

      setMapLocation(lat, lng);

      const address = await reverseGeocode(lat, lng);

      pickupInput.value = address; // ✅ ALWAYS ADDRESS
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

  navigator.geolocation.getCurrentPosition(async (pos) => {

    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    pickupLat = lat;
    pickupLng = lng;

    setMapLocation(lat, lng);

    const address = await reverseGeocode(lat, lng);

    pickupInput.value = address;

  }, () => {
    alert("Allow location permission");
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

  if (sendType.value === "pool") {

    await addDoc(collection(db, "fares"), {
      ...data,
      status: "broadcast"
    });

    alert("Broadcast created");
    location.href = "dashboardDriver.html";
  }
};