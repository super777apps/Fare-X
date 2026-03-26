import { db, auth } from "./firebase.js";
import { sendToFriend } from "./dispatchEngine.js";

import {
  collection, addDoc, query, where, onSnapshot,
  serverTimestamp, doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ---------------- STATE ---------------- */
let map, marker;

let pickupLat = null, pickupLng = null;
let dropLat = null, dropLng = null;

let currentUser = null;

/* ---------------- ELEMENTS ---------------- */
const pickupInput = document.getElementById("pickup");
const dropInput = document.getElementById("drop");
const suggestionsBox = document.getElementById("suggestions");
const gpsBtn = document.getElementById("gpsBtn");

/* ---------------- DEBOUNCE ---------------- */
function debounce(fn, delay = 350) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

/* ---------------- MAP INIT ---------------- */
function initMap() {

  map = L.map("pickupMap").setView([-33.8688, 151.2093], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);

  map.on("click", async (e) => {

    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    pickupLat = lat;
    pickupLng = lng;

    setMarker(lat, lng);

    const address = await reverseGeocode(lat, lng);

    pickupInput.value = address;   // ✅ FIXED: always address
  });
}

/* ---------------- MARKER ---------------- */
function setMarker(lat, lng) {

  if (marker) map.removeLayer(marker);

  marker = L.marker([lat, lng]).addTo(map);

  map.setView([lat, lng], 15);
}

/* ---------------- REVERSE GEOCODE ---------------- */
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

/* ---------------- SEARCH ADDRESS ---------------- */
async function searchAddress(q) {

  if (q.length < 3) return [];

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`
  );

  return await res.json();
}

/* ---------------- SHOW SUGGESTIONS ---------------- */
function showSuggestions(list, input, type) {

  suggestionsBox.innerHTML = "";

  if (!list.length) {
    suggestionsBox.style.display = "none";
    return;
  }

  suggestionsBox.style.display = "block";

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
        setMarker(lat, lng);
      }

      if (type === "drop") {
        dropLat = lat;
        dropLng = lng;
      }

      suggestionsBox.style.display = "none";
    };

    suggestionsBox.appendChild(div);
  });
}

/* ---------------- INPUT EVENTS ---------------- */
pickupInput.addEventListener("input", debounce(async () => {

  const list = await searchAddress(pickupInput.value);
  showSuggestions(list, pickupInput, "pickup");

}));

dropInput.addEventListener("input", debounce(async () => {

  const list = await searchAddress(dropInput.value);
  showSuggestions(list, dropInput, "drop");

}));

/* ---------------- GPS ---------------- */
gpsBtn.onclick = () => {

  navigator.geolocation.getCurrentPosition(async (pos) => {

    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    pickupLat = lat;
    pickupLng = lng;

    setMarker(lat, lng);

    pickupInput.value = await reverseGeocode(lat, lng);

  }, () => {
    alert("Please allow GPS permission");
  });

};

/* ---------------- AUTH ---------------- */
onAuthStateChanged(auth, async (user) => {

  if (!user) return location.href = "index.html";

  currentUser = user;

  initMap();

});