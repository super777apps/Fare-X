import { db, auth } from "./firebase.js";
import {
  collection, addDoc, serverTimestamp,
  query, where, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const btn = document.getElementById("createFareBtn");
const sendType = document.getElementById("sendType");
const friendSelect = document.getElementById("friendSelect");

/* ---------------- SAFE UI HANDLING ---------------- */

if(sendType && friendSelect){
  sendType.onchange = () => {
    if(sendType.value === "friend"){
      friendSelect.style.display = "block";
    } else {
      friendSelect.style.display = "none";
    }
  };
}

/* ---------------- AUTH ---------------- */

onAuthStateChanged(auth, user => {
  if(!user){
    window.location.href = "index.html";
    return;
  }
  loadFriends(user.uid);   // ✅ USE UID ALWAYS
});

/* ---------------- LOAD FRIENDS ---------------- */

function loadFriends(myUid){
  if(!friendSelect) return;

  onSnapshot(
    query(collection(db,"friends"), where("owner","==",myUid)),
    snap => {
      friendSelect.innerHTML = "<option value=''>Select Friend</option>";

      if(snap.empty){
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "No friends yet";
        friendSelect.appendChild(opt);
        return;
      }

      snap.forEach(doc => {
        const f = doc.data();
        const opt = document.createElement("option");
        opt.value = f.friendUid || f.friend;
        opt.textContent = `${f.name} (${f.friendEmail || f.friend})`;
        friendSelect.appendChild(opt);
      });
    }
  );
}

/* ---------------- CREATE FARE ---------------- */

if(btn){
btn.onclick = async () => {

  const pickup = document.getElementById("pickup")?.value.trim();
  const drop = document.getElementById("drop")?.value.trim();
  const date = document.getElementById("date")?.value;
  const time = document.getElementById("time")?.value;
  const priceType = document.getElementById("priceType")?.value;
  const price = document.getElementById("price")?.value.trim();
  const note = document.getElementById("note")?.value.trim();

  if (!pickup || !drop || !date || !time || !price) {
    alert("Please complete all required fields");
    return;
  }

  const dateTime = `${date} ${time}`;

  const data = {
    pickup,
    drop,
    time: dateTime,
    priceType,
    price,
    note,
    status: "broadcast",
    createdBy: auth.currentUser.email,
    createdUid: auth.currentUser.uid,
    createdAt: serverTimestamp()
  };

  try{

    /* ---------- SEND TO FRIEND ---------- */
    if(sendType && sendType.value === "friend"){

      const friend = friendSelect?.value;
      if(!friend){
        alert("Please select a friend");
        return;
      }

      data.status = "private";
      data.targetUid = friend;

      await addDoc(collection(db,"privateFares"), data);

      alert("Fare sent to friend successfully 🚀");
      window.location.href = "dashboard.html";
      return;
    }

    /* ---------- AUTO DISPATCH ---------- */
    if(sendType && sendType.value === "auto"){

      data.status = "auto";

      await addDoc(collection(db,"autoDispatch"), data);

      alert("Auto dispatch started 🚀");
      window.location.href = "dashboard.html";
      return;
    }

    /* ---------- BROADCAST ---------- */

    await addDoc(collection(db,"fares"), data);

    alert("Fare broadcasted successfully 🚀");
    window.location.href = "dashboard.html";

  }catch(err){
    alert("Failed: " + err.message);
  }
};
}