import { db, auth } from "./firebase.js";
import { sendToFriend } from "./dispatchEngine.js";
import { dispatchNearest } from "./autoDispatch.js";

import {
collection,
addDoc,
query,
where,
onSnapshot,
serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser=null;

const sendType=document.getElementById("sendType");
const friendSelect=document.getElementById("friendSelect");
const btn=document.getElementById("createFareBtn");
const roleSelect=document.getElementById("roleSelect");

/* AUTH */
onAuthStateChanged(auth,user=>{
if(!user){ location.href="index.html"; return; }
currentUser=user;
loadFriends(user.uid);
});

/* ROLE CONTROL */
roleSelect?.addEventListener("change",()=>{
if(roleSelect.value==="passenger"){
sendType.value="friend";
sendType.disabled=true;
friendSelect.style.display="block";
}else{
sendType.disabled=false;
}
});

/* SEND TYPE */
sendType.addEventListener("change",()=>{
friendSelect.style.display = sendType.value==="friend" ? "block" : "none";
});

/* LOAD FRIENDS */
function loadFriends(uid){

const q=query(collection(db,"friends"), where("owner","==",uid));

onSnapshot(q,snap=>{
friendSelect.innerHTML='<option value="">Select Driver</option>';

snap.forEach(docSnap=>{
const f=docSnap.data();
const opt=document.createElement("option");
opt.value=f.friendUID;
opt.textContent=f.name || f.email;
friendSelect.appendChild(opt);
});
});
}

/* CREATE JOB */
btn.onclick=async()=>{

if(!currentUser) return alert("User not ready");

const pickup=document.getElementById("pickup").value.trim();
const drop=document.getElementById("drop").value.trim();
const datetime=document.getElementById("datetime").value;
const price=document.getElementById("price").value.trim();

if(!pickup||!drop||!datetime||!price){
alert("Fill all fields");
return;
}

const role = roleSelect?.value || "driver";

const data={
pickup,drop,time:datetime,price,

createdBy:currentUser.email,
createdUid:currentUser.uid,

originalDriverUID:currentUser.uid,
currentDriverUID:currentUser.uid,

passengerUID:currentUser.uid,
role: role,

chain:[],

createdAt:serverTimestamp(),

status:"broadcast",
dispatchType:"pool"
};

/* FRIEND */
if(sendType.value==="friend"){

const friendUID=friendSelect.value;
if(!friendUID) return alert("Select friend");

const ref=await addDoc(collection(db,"fares"),data);

await sendToFriend(ref.id,friendUID,currentUser.uid);

alert("Sent successfully");
location.href="dashboard.html";
return;
}

/* AUTO */
if(sendType.value==="auto"){

navigator.geolocation.getCurrentPosition(async pos=>{

const ref=await addDoc(collection(db,"fares"),data);

await dispatchNearest(
ref.id,
pos.coords.latitude,
pos.coords.longitude
);

alert("Auto dispatch started");
location.href="dashboard.html";

});

return;
}

/* POOL */
await addDoc(collection(db,"fares"),data);

alert("Broadcast created");
location.href="dashboard.html";

};