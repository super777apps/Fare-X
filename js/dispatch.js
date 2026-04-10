import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ================================
   DISTANCE CALC (simple)
================================ */
function getDistance(lat1, lon1, lat2, lon2) {
  return Math.sqrt(
    Math.pow(lat1 - lat2, 2) +
    Math.pow(lon1 - lon2, 2)
  );
}

/* ================================
   GET ONLINE DRIVERS
================================ */
async function getOnlineDrivers() {

  const snap = await getDocs(collection(db, "users"));

  const drivers = [];

  snap.forEach(d => {
    const u = d.data();

    if (u.role !== "driver") return;
    if (!u.online) return;
    if (!u.location) return;

    drivers.push({
      uid: d.id,
      name: u.nickName || "Driver",
      lat: u.location.lat,
      lng: u.location.lng
    });
  });

  return drivers;
}

/* ================================
   SORT DRIVERS BY DISTANCE
================================ */
async function getSortedDrivers(pickupLat, pickupLng) {

  const drivers = await getOnlineDrivers();

  drivers.sort((a, b) => {
    return getDistance(a.lat, a.lng, pickupLat, pickupLng) -
           getDistance(b.lat, b.lng, pickupLat, pickupLng);
  });

  return drivers;
}

/* ================================
   AUTO DISPATCH ENGINE (SAFE PRO)
================================ */
export async function autoDispatch(jobId, pickupLat, pickupLng) {

  const jobRef = doc(db, "fares", jobId);

  // 🔁 ALWAYS GET LATEST JOB STATE
  let snap = await getDoc(jobRef);
  if (!snap.exists()) return;

  let job = snap.data();

  // 🚫 NOT AUTO JOB → STOP
  if (!job.autoDispatch) return;

  // 🚫 ALREADY TAKEN → STOP
  if (job.status === "accepted") return;

  const drivers = await getSortedDrivers(pickupLat, pickupLng);

  // ❌ NO DRIVERS → SEND TO POOL
  if (drivers.length === 0) {
    await updateDoc(jobRef, {
      broadcast: true,
      autoDispatch: false,
      assignedTo: null,
      currentDriverUID: null,
      currentDriverName: null,
      status: "waiting response",
      updatedAt: serverTimestamp()
    });
    return;
  }

  // 🔁 TRY DRIVERS ONE BY ONE
  for (let i = 0; i < drivers.length; i++) {

  const driver = drivers[i];

  // 🔥 GET LATEST JOB DATA
  const snap = await getDoc(jobRef);
  const job = snap.data();

  // 🚫 SKIP DRIVERS WHO ALREADY REJECTED
  if (job.declinedBy?.includes(driver.uid)) {
    continue;
  }
    // 🔁 CHECK LATEST JOB STATE BEFORE ASSIGN
    snap = await getDoc(jobRef);
    job = snap.data();

    // 🚫 STOP if job changed externally
    if (!job.autoDispatch) return;
    if (job.status !== "waiting response") return;

    // 🎯 ASSIGN TO DRIVER
    await updateDoc(jobRef, {
      broadcast: false,
      assignedTo: driver.uid,
      currentDriverUID: driver.uid,
      currentDriverName: driver.name,
      status: "waiting response",
      updatedAt: serverTimestamp()
    });

    console.log("Sent to:", driver.name);

    // ⏱ WAIT FOR RESPONSE
    await new Promise(r => setTimeout(r, 15000));

    // 🔁 CHECK RESULT
    snap = await getDoc(jobRef);
    job = snap.data();

    // ✅ ACCEPTED → STOP ENGINE
    if (job.status === "accepted") {
      console.log("Accepted by:", job.currentDriverName);
      return;
    }

    // 🔁 IF DRIVER REJECTED → CONTINUE LOOP
    if (job.status === "waiting response") {
      console.log("No response, trying next driver...");
      continue;
    }

    // 🛑 IF MANUAL CHANGE (cancel/return) → STOP
    if (!job.autoDispatch) {
      return;
    }
  }

  // 🔵 NONE ACCEPTED → FALLBACK TO POOL
  await updateDoc(jobRef, {
    broadcast: true,
    autoDispatch: false,
    assignedTo: null,
    currentDriverUID: null,
    currentDriverName: null,
    status: "waiting response",
    updatedAt: serverTimestamp()
  });

  console.log("Moved to pool (no driver accepted)");
}