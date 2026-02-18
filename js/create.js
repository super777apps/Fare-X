import { db, auth } from "./firebase.js";
import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const pickup = document.getElementById("pickup");
const drop = document.getElementById("drop");
const time = document.getElementById("time");
const price = document.getElementById("price");
const note = document.getElementById("note");
const createFareBtn = document.getElementById("createFareBtn");

createFareBtn.onclick = async () => {
  if(!pickup.value || !drop.value || !time.value || !price.value){
    alert("Please fill all required fields");
    return;
  }

  await addDoc(collection(db,"fares"),{
    pickup: pickup.value,
    drop: drop.value,
    time: new Date(time.value).getTime(),
    price: price.value,
    note: note.value,
    createdBy: auth.currentUser.email,
    status: "broadcast",
    createdAt: serverTimestamp()
  });

  alert("Fare broadcasted!");
  window.location.href = "dashboard.html";
};