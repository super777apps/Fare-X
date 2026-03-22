import { db } from "./firebase.js";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* AUTO DISPATCH NEAREST DRIVER */
export async function dispatchNearest(jobId, lat, lng) {
  const jobRef = doc(db, "fares", jobId);
  const jobSnap = await getDoc(jobRef);
  if (!jobSnap.exists()) return;
  const job = jobSnap.data();

  // Find nearest driver (excluding original driver)
  const driversQ = query(collection(db, "users"), where("role", "==", "driver"));
  const driversSnap = await getDocs(driversQ);
  let nearestDriver = null;
  let minDist = Infinity;

  driversSnap.forEach(d => {
    const f = d.data();
    if (!f.lat || !f.lng || f.uid === job.originalDriverUID) return;
    const dist = getDistance(lat, lng, f.lat, f.lng);
    if (dist < minDist) {
      minDist = dist;
      nearestDriver = d;
    }
  });

  if (!nearestDriver) return;

  const assignedUID = nearestDriver.id;

  await updateDoc(jobRef, {
    status: "assigned",
    dispatchType: "auto",
    assignedTo: assignedUID,
    currentDriverUID: assignedUID,
    chain: [...(job.chain || []), { from: job.originalDriverUID, to: assignedUID, time: Date.now() }],
    dispatchStartedAt: serverTimestamp()
  });

  // Return to original driver after 12s if not accepted
  setTimeout(async () => {
    const snap2 = await getDoc(jobRef);
    if (!snap2.exists()) return;
    const f2 = snap2.data();
    if (f2.status === "assigned" && f2.assignedTo === assignedUID) {
      await updateDoc(jobRef, { status: "returned", currentDriverUID: f2.originalDriverUID, assignedTo: "" });
    }
  }, 12000);
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function deg2rad(deg) { return deg * (Math.PI / 180); }