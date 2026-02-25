import { db, auth } from "./firebase.js";
import {
  collection, addDoc, serverTimestamp,
  query, where, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const btn = document.getElementById("createFareBtn");
const sendType = document.getElementById("sendType");
const friendSelect = document.getElementById("friendSelect");

/* ---------------- AUTH ---------------- */

onAuthStateChanged(auth, user => {
  if(!user){
    window.location.href = "index.html";
    return;
  }
  loadFriends(user.uid);
});

/* ---------------- FRIEND TOGGLE ---------------- */

sendType.addEventListener("change",()=>{
  friendSelect.style.display = sendType.value === "friend" ? "block" : "none";
});

/* ---------------- LOAD FRIENDS ---------------- */

function loadFriends(myUid){

  onSnapshot(
    query(collection(db,"friends"), where("owner","==",myUid)),
    snap => {
      friendSelect.innerHTML = `<option value="">Select Friend</option>`;

      if(snap.empty){
        const opt = document.createElement("option");
        opt.textContent = "No friends";
        friendSelect.appendChild(opt);
        return;
      }

      snap.forEach(doc => {
        const f = doc.data();
        const opt = document.createElement("option");
        opt.value = f.friendUid;
        opt.textContent = f.name || f.friendEmail || f.friendUid;
        friendSelect.appendChild(opt);
      });
    }
  );
}

/* ---------------- CREATE FARE ---------------- */

btn.addEventListener("click", async ()=>{

  const pickup = document.getElementById("pickup").value.trim();
  const drop   = document.getElementById("drop").value.trim();
  const datetime = document.getElementById("datetime").value;
  const price  = document.getElementById("price").value.trim();
  const priceType = document.getElementById("priceType").value;
  const note   = document.getElementById("note").value.trim();

  if(!pickup || !drop || !datetime || !price){
    alert("Please fill all required fields");
    return;
  }

  const data = {
    pickup,
    drop,
    time: datetime,
    price,
    priceType,
    note,
    status:"broadcast",
    createdBy: auth.currentUser.email,
    createdUid: auth.currentUser.uid,
    createdAt: serverTimestamp()
  };

  try{

    /* -------- SEND TO FRIEND -------- */

    if(sendType.value === "friend"){

      const friend = friendSelect.value;
      if(!friend){
        alert("Select friend");
        return;
      }

      data.status = "pending";
      data.targetUID = friend;

      await addDoc(collection(db,"privateFares"), data);

      alert("Private job sent ✔");
      location.href = "dashboard.html";
      return;
    }

    /* -------- AUTO DISPATCH -------- */

    if(sendType.value === "auto"){

      data.status = "auto";

      await addDoc(collection(db,"autoDispatch"), data);

      alert("Auto dispatch started ✔");
      location.href = "dashboard.html";
      return;
    }

    /* -------- BROADCAST -------- */

    await addDoc(collection(db,"fares"), data);

    alert("Broadcast job created ✔");
    location.href = "dashboard.html";

  }catch(err){
    alert("Error: " + err.message);
  }

});