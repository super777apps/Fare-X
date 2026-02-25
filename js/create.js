import { db, auth } from "./firebase.js";
import {
  collection, addDoc, serverTimestamp,
  query, where, onSnapshot, getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { startAutoDispatch } from "./dispatchEngine.js";

const btn = document.getElementById("createFareBtn");
const sendType = document.getElementById("sendType");
const friendSelect = document.getElementById("friendSelect");

/* ---------------- SAFE UI HANDLING ---------------- */

if(sendType && friendSelect){
  sendType.onchange = () => {
    friendSelect.style.display = sendType.value === "friend" ? "block" : "none";
  };
}

/* ---------------- AUTH ---------------- */

onAuthStateChanged(auth, user => {
  if(!user){
    window.location.href = "index.html";
    return;
  }
  loadFriends(user.uid);
});

/* ---------------- LOAD FRIENDS ---------------- */

function loadFriends(myUid){
  onSnapshot(
    query(collection(db,"friends"), where("owner","==",myUid)),
    snap => {
      friendSelect.innerHTML = "<option value=''>Select Friend</option>";

      snap.forEach(doc => {
        const f = doc.data();
        const opt = document.createElement("option");
        opt.value = f.friendUid;
        opt.textContent = `${f.name} (${f.friendEmail})`;
        friendSelect.appendChild(opt);
      });
    }
  );
}

/* ---------------- CREATE FARE ---------------- */

btn.onclick = async () => {

  const pickup = pickupInput.value.trim();
  const drop = dropInput.value.trim();
  const datetime = datetimeInput.value;
  const priceType = priceTypeSelect.value;
  const price = priceInput.value.trim();
  const note = noteInput.value.trim();

  if (!pickup || !drop || !datetime || !price) {
    alert("Please complete all required fields");
    return;
  }

  const data = {
    pickup,
    drop,
    time: datetime,
    priceType,
    price,
    note,
    status: "broadcast",
    createdBy: auth.currentUser.email,
    createdUid: auth.currentUser.uid,
    createdAt: serverTimestamp()
  };

  try{

    /* ---------- PRIVATE JOB ---------- */
    if(sendType.value === "friend"){

      const friend = friendSelect.value;
      if(!friend){
        alert("Please select a friend");
        return;
      }

      data.status = "pending";
      data.targetUID = friend;

      await addDoc(collection(db,"privateFares"), data);

      alert("Private job sent 🚀");
      location.href = "dashboard.html";
      return;
    }

    /* ---------- AUTO DISPATCH ---------- */
    if(sendType.value === "auto"){

      const jobRef = await addDoc(collection(db,"fares"), data);

      const drivers = await getNearestDrivers();

      await startAutoDispatch(jobRef.id, drivers);

      alert("Auto dispatch started 🚀");
      location.href = "dashboard.html";
      return;
    }

    /* ---------- BROADCAST ---------- */

    await addDoc(collection(db,"fares"), data);

    alert("Fare broadcasted 🚀");
    location.href = "dashboard.html";

  }catch(err){
    alert("Failed: " + err.message);
  }
};

/* ---------------- FIND NEAREST DRIVERS ---------------- */

async function getNearestDrivers(){

  const snap = await getDocs(
    query(collection(db,"users"), where("role","==","driver"), where("online","==",true))
  );

  const drivers = [];
  snap.forEach(d => drivers.push(d.data().email));

  return drivers;
}