import { db, auth } from "./firebase.js";
import { sendToFriend } from "./dispatchEngine.js";

import {
collection,
addDoc,
query,
where,
onSnapshot,
serverTimestamp,
doc,
getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser=null;
let currentUserData=null;

const sendType=document.getElementById("sendType");
const friendSelect=document.getElementById("friendSelect");
const btn=document.getElementById("createFareBtn");

/* AUTH */
onAuthStateChanged(auth, async user=>{
if(!user){ location.href="index.html"; return; }

currentUser=user;

/* GET USER PROFILE (nickname) */
const snap = await getDoc(doc(db,"users",user.uid));
currentUserData = snap.exists() ? snap.data() : {};

loadFriends(user.uid);
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

const data={
pickup,
drop,
time:datetime,
price,

createdBy:currentUser.email,
createdUid:currentUser.uid,

originalDriverUID:currentUser.uid,
originalDriverName: currentUserData.nickname || currentUser.email,

currentDriverUID:currentUser.uid,
currentDriverName: currentUserData.nickname || currentUser.email,

createdAt:serverTimestamp(),

status:"broadcast",
dispatchType:"pool",
returnReason:"",
deleted:false
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

/* POOL */
await addDoc(collection(db,"fares"),data);

alert("Broadcast created");
location.href="dashboard.html";
};