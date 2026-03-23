import { db, auth } from "./firebase.js";
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) location.href = "index.html";
  currentUser = user;
  loadDrivers();
});

function loadDrivers() {
  const select = document.getElementById("driverSelect");
  const q = query(collection(db, "friends"), where("owner", "==", currentUser.uid));
  onSnapshot(q, snap => {
    select.innerHTML = `<option value="">Select Driver</option>`;
    snap.forEach(docSnap => {
      const f = docSnap.data();
      const opt = document.createElement("option");
      opt.value = f.friendUID;
      opt.textContent = f.nickName || f.name || f.email || "Driver";
      select.appendChild(opt);
    });
  });
}

document.getElementById("createFareBtn").onclick = async () => {
  const pickup = document.getElementById("pickup").value.trim();
  const drop = document.getElementById("drop").value.trim();
  const datetime = document.getElementById("datetime").value;
  const price = document.getElementById("price").value.trim();
  const driverUID = document.getElementById("driverSelect").value;

  if (!pickup || !drop || !datetime || !price || !driverUID) {
    alert("Please fill all fields and select a driver");
    return;
  }

  const userSnap = await getDoc(doc(db, "users", currentUser.uid));
  const passengerName = userSnap.exists() ? userSnap.data().nickName || currentUser.email : currentUser.email;

  try {
    await addDoc(collection(db, "fares"), {
      pickup,
      drop,
      time: datetime,
      price,
      createdBy: currentUser.email,
      createdUid: currentUser.uid,
      passengerUID: currentUser.uid,
      passengerName,
      originalDriverUID: driverUID,
      currentDriverUID: driverUID,
      role: "driver",
      chain: [],
      createdAt: serverTimestamp(),
      status: "requested",
      dispatchType: "passenger"
    });
    alert("Job sent to driver");
    location.href = "dashboardPassenger.html";
  } catch (err) {
    console.error(err);
    alert("Error sending job");
  }
};