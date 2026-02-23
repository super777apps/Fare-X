import { db, auth } from "./firebase.js";
import {
  collection, addDoc, serverTimestamp,
  query, where, onSnapshot, getDoc, doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const btn = document.getElementById("createFareBtn");
const sendType = document.getElementById("sendType");
const friendSelect = document.getElementById("friendSelect");
const timeInput = document.getElementById("fareTime");

let currentUser = null;

/* ---------- AUTO TIME ---------- */

if (timeInput) {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  timeInput.value = now.toISOString().slice(0,16);
}

/* ---------- AUTH ---------- */

onAuthStateChanged(auth, user => {
  if(!user){
    location.href="index.html";
    return;
  }
  currentUser = user;
  loadFriends();
});

/* ---------- FRIEND DROPDOWN ---------- */

sendType.onchange = () => {
  friendSelect.style.display =
    sendType.value === "friend" ? "block" : "none";
};

function loadFriends(){
  onSnapshot(
    query(collection(db,"friends"), where("owner","==",currentUser.uid)),
    async snap => {
      friendSelect.innerHTML="<option value=''>Select Friend</option>";

      for(const docSnap of snap.docs){
        const f = docSnap.data();
        const drv = await getDoc(doc(db,"drivers",f.friendUID));
        if(drv.exists()){
          const d = drv.data();
          const opt = document.createElement("option");
          opt.value = f.friendUID;
          opt.textContent = `${d.nickname} (${d.carNumber})`;
          friendSelect.appendChild(opt);
        }
      }
    }
  );
}

/* ---------- CREATE FARE ---------- */

btn.onclick = async () => {

  const pickup = document.getElementById("pickup").value.trim();
  const drop = document.getElementById("drop").value.trim();
  const time = timeInput.value;
  const priceType = document.getElementById("priceType").value;
  const price = document.getElementById("price").value.trim();
  const note = document.getElementById("note").value.trim();

  if(!pickup || !drop || !time || !price){
    alert("Please complete all required fields");
    return;
  }

  const data = {
    pickup, drop, time,
    priceType, price, note,
    status:"broadcast",
    createdBy: currentUser.uid,
    createdEmail: currentUser.email,
    createdAt: serverTimestamp()
  };

  try{

    if(sendType.value==="friend"){
      const friendUID = friendSelect.value;
      if(!friendUID) return alert("Select a friend");

      data.status="private";
      data.targetUID = friendUID;

      await addDoc(collection(db,"privateFares"),data);
      alert("Fare sent to friend 🚀");

    }else{

      await addDoc(collection(db,"fares"),data);
      alert("Fare broadcasted 🚀");

    }

    location.href="dashboard.html";

  }catch(err){
    alert(err.message);
  }
};