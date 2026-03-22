import { db, auth } from "./firebase.js";
import { sendToFriend } from "./dispatchEngine.js";

import {
collection,
addDoc,
serverTimestamp,
doc,
getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser=null;

const sendType=document.getElementById("sendType");
const friendSelect=document.getElementById("friendSelect");
const btn=document.getElementById("createFareBtn");

onAuthStateChanged(auth,async user=>{

if(!user){ location.href="index.html"; return; }

currentUser=user;
loadFriends(user.uid);

});

async function loadFriends(uid){

const snap = await getDoc(doc(db,"users",uid));

const q = await fetchFriends(uid);

friendSelect.innerHTML='<option value="">Select Driver</option>';

q.forEach(f=>{
const opt=document.createElement("option");
opt.value=f.friendUID;
opt.textContent=f.name || f.email;
friendSelect.appendChild(opt);
});

}

async function fetchFriends(uid){

const { collection, getDocs, query, where } =
await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");

const q=query(collection(db,"friends"), where("owner","==",uid));
const snap=await getDocs(q);

let arr=[];
snap.forEach(d=>arr.push(d.data()));
return arr;

}

sendType.addEventListener("change",()=>{
friendSelect.style.display = sendType.value==="friend" ? "block":"none";
});

btn.onclick=async()=>{

const pickup=document.getElementById("pickup").value.trim();
const drop=document.getElementById("drop").value.trim();
const time=document.getElementById("datetime").value;
const price=document.getElementById("price").value.trim();

if(!pickup||!drop||!time||!price) return alert("Fill all fields");

const userSnap=await getDoc(doc(db,"users",currentUser.uid));
const nickname=userSnap.data()?.nickname || currentUser.email;
const role=userSnap.data()?.role || "driver";

const data={
pickup,drop,time,price,

createdBy:currentUser.email,
createdName:nickname,

originalDriverUID:currentUser.uid,
originalDriverName:nickname,

currentDriverUID:currentUser.uid,
currentDriverName:nickname,

passengerUID:currentUser.uid,

status:"broadcast",
dispatchType:"pool",

createdAt:serverTimestamp()
};

if(role==="passenger"){
sendType.value="friend";
sendType.disabled=true;
}

if(sendType.value==="friend"){

const friendUID=friendSelect.value;
if(!friendUID) return alert("Select friend");

const ref=await addDoc(collection(db,"fares"),data);

await sendToFriend(ref.id,friendUID,currentUser.uid);

alert("Sent ✔");
location.href="dashboard.html";
return;
}

await addDoc(collection(db,"fares"),data);

alert("Created ✔");
location.href="dashboard.html";

};