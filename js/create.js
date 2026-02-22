import { db, auth } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const btn = document.getElementById("createFareBtn");

btn.onclick = async () => {

  const pickup = pickupInput();
  const drop = dropInput();
  const date = document.getElementById("date").value;
  const time = document.getElementById("time").value;
  const priceType = document.getElementById("priceType").value;
  const price = document.getElementById("price").value.trim();
  const note = document.getElementById("note").value.trim();

  if (!pickup || !drop || !date || !time || !price) {
    alert("Please complete all required fields");
    return;
  }

  const dateTime = date + " " + time;

  try {
    await addDoc(collection(db, "fares"), {
      pickup,
      drop,
      time: dateTime,
      priceType,
      price,
      note,
      status: "broadcast",
      createdBy: auth.currentUser.email,
      createdAt: serverTimestamp()
    });

    alert("Fare broadcasted successfully 🚀");
    window.location.href = "dashboard.html";

  } catch (err) {
    alert("Broadcast failed: " + err.message);
  }
};

function pickupInput(){
  return document.getElementById("pickup").value.trim();
}

function dropInput(){
  return document.getElementById("drop").value.trim();
}