import { db, auth } from "./firebase.js";

import {
doc,
getDoc,
setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser=null;

onAuthStateChanged(auth, async user=>{

if(!user){
location.href="index.html";
return;
}

currentUser=user;

const ref=doc(db,"users",user.uid);
const snap=await getDoc(ref);

if(snap.exists()){
const d=snap.data();
document.getElementById("nickname").value=d.nickname || "";
document.getElementById("role").value=d.role || "driver";
}

});

/* SAVE */
document.getElementById("saveBtn").onclick=async()=>{

const nickname=document.getElementById("nickname").value.trim();
const role=document.getElementById("role").value;

if(!nickname){
alert("Enter nickname");
return;
}

await setDoc(doc(db,"users",currentUser.uid),{
uid:currentUser.uid,
email:currentUser.email,
nickname:nickname,
role:role
},{merge:true});

alert("Saved ✔");
};