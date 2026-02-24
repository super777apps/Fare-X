import { db, auth } from "./firebase.js";
import {
  collection, addDoc, serverTimestamp,
  query, where, onSnapshot, getDoc, doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const btn = document.getElementById("createFareBtn");
const sendType = document.getElementById("sendType");
const friendSelect = document.getElementById("friendSelect");

let currentUser = null;

// ---------------- AUTH ----------------
onAuthStateChanged(auth, async user => {
  if(!user){
    window.location.href="index.html";
    return;
  }
  currentUser = user;
  loadFriends(user.uid);
});

// ---------------- SEND TYPE CHANGE ----------------
sendType.onchange = () => {
  friendSelect.style.display =
    sendType.value === "friend" ? "block" : "none";
};

// ---------------- LOAD FRIENDS ----------------
function loadFriends(myUID){
  onSnapshot(
    query(collection(db,"friends"), where("ownerUID","==",myUID)),
    snap => {
      friendSelect.innerHTML = "<option value=''>Select Friend</option>";
      snap.forEach(docSnap => {
        const f = docSnap.data();
        const opt = document.createElement("option");
        opt.value = f.friendUID;
        opt.dataset.email = f.friendEmail;
        opt.textContent = `${f.name} (${f.friendEmail})`;
        friendSelect.appendChild(opt);
      });
    }
  );
}

// ---------------- CREATE FARE ----------------
btn.onclick = async () => {

  try{

    const pickup = document.getElementById("pickup").value.trim();
    const drop = document.getElementById("drop").value.trim();
    const dateTime = document.getElementById("datetime").value;
    const priceType = document.getElementById("priceType").value;
    const price = document.getElementById("price").value.trim();
    const note = document.getElementById("note").value.trim();

    if (!pickup || !drop || !dateTime || !price) {
      alert("Please complete all required fields");
      return;
    }

    const driverSnap = await getDoc(doc(db,"drivers",currentUser.uid));
    const senderName = driverSnap.exists() ? driverSnap.data().nickname : "";

    const data = {
      pickup,
      drop,
      time: new Date(dateTime).toISOString(),
      priceType,
      price,
      note,
      status: "broadcast",
      createdBy: currentUser.email,
      createdUid: currentUser.uid,
      senderNickname: senderName,
      senderEmail: currentUser.email,
      createdAt: serverTimestamp()
    };

    // -------- SEND TO FRIEND --------
    if(sendType.value === "friend"){

      const friendUID = friendSelect.value;
      const friendEmail = friendSelect.options[friendSelect.selectedIndex]?.dataset.email;

      if(!friendUID){
        alert("Please select a friend");
        return;
      }

      data.status = "pending";
      data.targetUID = friendUID;
      data.targetEmail = friendEmail;

      await addDoc(collection(db,"privateFares"), data);

      alert("🚀 Job sent to friend successfully");

    }

    // -------- AUTO DISPATCH (NEAREST) --------
    else if(sendType.value === "nearest"){

      data.status = "auto";

      await addDoc(collection(db,"autoDispatch"), data);

      alert("⚡ Auto dispatch started");

    }

    // -------- POOL BROADCAST --------
    else{

      data.status = "broadcast";

      await addDoc(collection(db,"fares"), data);

      alert("📢 Job broadcasted successfully");

    }

    window.location.href = "dashboard.html";

  }catch(err){
    alert("Failed: " + err.message);
    console.error(err);
  }

};