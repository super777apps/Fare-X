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
   DISTANCE CALC (simple version)
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
   MAIN AUTO DISPATCH ENGINE
================================ */
export async function autoDispatch(jobId, pickupLat, pickupLng) {

  const jobRef = doc(db, "fares", jobId);

  const drivers = await getSortedDrivers(pickupLat, pickupLng);

  // ❌ NO DRIVERS → GO TO POOL
  if (drivers.length === 0) {
    await updateDoc(jobRef, {
      broadcast: true,
      assignedTo: null,
      status: "waiting response",
      updatedAt: serverTimestamp()
    });
    return;
  }

  // 🔁 TRY EACH DRIVER ONE BY ONE
  for (let i = 0; i < drivers.length; i++) {

    const driver = drivers[i];

    // assign job
    await updateDoc(jobRef, {
      broadcast: false,
      assignedTo: driver.uid,
      currentDriverUID: driver.uid,
      currentDriverName: driver.name,
      status: "waiting response",
      updatedAt: serverTimestamp()
    });

    console.log("Sent to:", driver.name);

    // ⏱ WAIT 20 SECONDS
    await new Promise(r => setTimeout(r, 20000));

    const snap = await getDoc(jobRef);
    const job = snap.data();

    // ✅ ACCEPTED → STOP
    if (job.status === "accepted") {
      console.log("Accepted by:", job.currentDriverName);
      return;
    }

    // ❌ if job was manually changed (cancel/return) stop dispatch
    if (job.status !== "waiting response") {
      return;
    }
  }

  // 🔵 NO ONE ACCEPTED → SEND TO POOL
  await updateDoc(jobRef, {
    broadcast: true,
    assignedTo: null,
    currentDriverUID: null,
    currentDriverName: null,
    status: "waiting response",
    updatedAt: serverTimestamp()
  });

}