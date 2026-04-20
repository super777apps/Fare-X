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
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ---------------- STATE ---------------- */
let currentUser = null;

let pickupLat = null;
let pickupLng = null;
let dropLat = null;
let dropLng = null;

let pickupMap = null;
let dropMap = null;

let pickupMarker = null;
let dropMarker = null;

/* ---------------- ELEMENTS ---------------- */
let pickupInput, dropInput;
let pickupBox, dropBox;
let gpsBtn, createBtn;

/* ---------------- HELPERS ---------------- */
function getSuburb(full) {
  if (!full) return "";
  return full.split(",")[0].trim();
}

function generateJobId() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

function debounce(fn, delay = 400) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

/* ---------------- SEARCH ADDRESS ---------------- */
async function searchAddress(q) {

  if (!q || q.trim().length < 3) return [];

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(q)}`
    );

    return await res.json();

  } catch (e) {
    return [];
  }
}

/* ---------------- REVERSE GEOCODE ---------------- */
async function reverseGeocode(lat, lng) {

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${lat}&lon=${lng}`
    );

    const data = await res.json();

    return data.display_name || `${lat}, ${lng}`;

  } catch (e) {
    return `${lat}, ${lng}`;
  }
}

/* ---------------- MAPS ---------------- */
function initMaps() {

  pickupMap = L.map("pickupMap").setView([31.52, 74.35], 13);
  dropMap = L.map("dropMap").setView([31.52, 74.35], 13);

  const tile = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  L.tileLayer(tile).addTo(pickupMap);
  L.tileLayer(tile).addTo(dropMap);

  setTimeout(() => {
    pickupMap.invalidateSize();
    dropMap.invalidateSize();
  }, 300);

  /* PICKUP CLICK */
  pickupMap.on("click", async (e) => {

    pickupLat = e.latlng.lat;
    pickupLng = e.latlng.lng;

    if (pickupMarker) {
      pickupMap.removeLayer(pickupMarker);
    }

    pickupMarker = L.marker([pickupLat, pickupLng]).addTo(pickupMap);

    pickupInput.value = "Loading address...";

    const addr = await reverseGeocode(pickupLat, pickupLng);

    pickupInput.value = addr;
  });

  /* DROP CLICK */
  dropMap.on("click", async (e) => {

    dropLat = e.latlng.lat;
    dropLng = e.latlng.lng;

    if (dropMarker) {
      dropMap.removeLayer(dropMarker);
    }

    dropMarker = L.marker([dropLat, dropLng]).addTo(dropMap);

    dropInput.value = "Loading address...";

    const addr = await reverseGeocode(dropLat, dropLng);

    dropInput.value = addr;
  });
}

/* ---------------- SUGGESTIONS ---------------- */
function showSuggestions(list, box, input, type) {

  box.innerHTML = "";

  if (!list || list.length === 0) {
    box.style.display = "none";
    return;
  }

  box.style.display = "block";

  list.forEach(item => {

    const div = document.createElement("div");
    div.textContent = item.display_name;

    div.onclick = () => {

      input.value = item.display_name;

      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);

      if (type === "pickup") {

        pickupLat = lat;
        pickupLng = lng;

        pickupMap.setView([lat, lng], 15);

        if (pickupMarker) pickupMap.removeLayer(pickupMarker);

        pickupMarker = L.marker([lat, lng]).addTo(pickupMap);
      }

      if (type === "drop") {

        dropLat = lat;
        dropLng = lng;

        dropMap.setView([lat, lng], 15);

        if (dropMarker) dropMap.removeLayer(dropMarker);

        dropMarker = L.marker([lat, lng]).addTo(dropMap);
      }

      box.innerHTML = "";
      box.style.display = "none";
    };

    box.appendChild(div);
  });
}

/* ---------------- LOAD DRIVERS ---------------- */
function loadDrivers() {

  const select = document.getElementById("driverSelect");

  const q = query(
    collection(db, "friends"),
    where("owner", "==", currentUser.uid)
  );

  onSnapshot(q, (snap) => {

    select.innerHTML = `<option value="">Select Driver</option>`;

    snap.forEach((d) => {

      const f = d.data();

      const uid = f.friendUID || f.uid || "";
      const name = f.nickName || f.name || f.email || "Driver";

      if (!uid) return;

      const opt = document.createElement("option");
      opt.value = uid;
      opt.textContent = name;

      select.appendChild(opt);
    });
  });
}

/* ---------------- CREATE JOB ---------------- */
async function createJob() {

  console.log("🚀 Create button clicked");

  const pickup = pickupInput.value.trim();
  const drop   = dropInput.value.trim();

  const time   = document.getElementById("datetime").value;
  const priceType = document.getElementById("priceType").value;
  const price  = document.getElementById("price").value.trim();
  const notes  = document.getElementById("notes").value.trim();

  const driverUID = document.getElementById("driverSelect").value;

  console.log({pickup, drop, time, price, driverUID});

  if (!pickup || !drop || !time || !price || !driverUID) {
    alert("Fill all fields");
    return;
  }

  try {

    const userSnap = await getDoc(doc(db, "users", currentUser.uid));

    const passengerName =
      userSnap.exists()
        ? userSnap.data().nickName || currentUser.email
        : currentUser.email;

    const jobId = Math.random().toString(36).substring(2,10).toUpperCase();

    console.log("🔥 Sending to Firebase...");

    await addDoc(collection(db, "fares"), {

      jobId,
      pickup,
      drop,

      pickupSuburb: pickup.split(",")[0],
      dropSuburb: drop.split(",")[0],

      pickupLat,
      pickupLng,
      dropLat,
      dropLng,

      time,
      price,
      priceType,
      notes,

      passengerUID: currentUser.uid,
      passengerName,

      originalDriverUID: driverUID,
      assignedTo: driverUID,

      currentDriverUID: null,
      currentDriverName: null,

      broadcast: false,
      autoDispatch: false,

      jobSource: "passenger_app",

      status: "waiting response",

      createdAt: serverTimestamp(),
      soundPlayed: false
    });

    console.log("✅ Job successfully created");

    alert("Job sent to driver");

    location.href = "dashboardPassenger.html";

  } catch (e) {
    console.error("❌ ERROR:", e);
    alert("Error creating job: " + e.message);
  }
}
/* ---------------- AUTH ---------------- */
onAuthStateChanged(auth, (user) => {

  if (!user) {
    location.href = "index.html";
    return;
  }

  currentUser = user;

  /* DOM */
  pickupInput = document.getElementById("pickup");
  dropInput = document.getElementById("drop");

  pickupBox = document.getElementById("pickupSuggestions");
  dropBox = document.getElementById("dropSuggestions");

  gpsBtn = document.getElementById("gpsBtn");
  createBtn = document.getElementById("createFareBtn");

  /* LOAD */
  loadDrivers();
  initMaps();

  /* INPUT SEARCH */
  pickupInput.addEventListener("input", debounce(async () => {

    const list = await searchAddress(pickupInput.value);
    showSuggestions(list, pickupBox, pickupInput, "pickup");

  }));

  dropInput.addEventListener("input", debounce(async () => {

    const list = await searchAddress(dropInput.value);
    showSuggestions(list, dropBox, dropInput, "drop");

  }));

  /* GPS */
  gpsBtn.onclick = () => {

    navigator.geolocation.getCurrentPosition(async (pos) => {

      pickupLat = pos.coords.latitude;
      pickupLng = pos.coords.longitude;

      pickupMap.setView([pickupLat, pickupLng], 15);

      if (pickupMarker) {
        pickupMap.removeLayer(pickupMarker);
      }

      pickupMarker = L.marker([pickupLat, pickupLng]).addTo(pickupMap);

      pickupInput.value = "Loading address...";

      pickupInput.value = await reverseGeocode(
        pickupLat,
        pickupLng
      );

    }, () => {
      alert("Please allow location permission");
    });
  };

  /* CREATE */
  createBtn.onclick = createJob;
});