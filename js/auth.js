import { auth, db } from "./firebase.js";

import {
createUserWithEmailAndPassword,
signInWithEmailAndPassword,
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
doc,
setDoc,
getDoc,
serverTimestamp,
updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const loginBtn=document.getElementById("loginBtn");
const registerBtn=document.getElementById("registerBtn");

const emailInput=document.getElementById("emailInput");
const passwordInput=document.getElementById("passwordInput");


/* LOGIN */

loginBtn.onclick=async()=>{

const email=emailInput.value.trim();
const pass=passwordInput.value.trim();

if(!email||!pass){
alert("Enter email and password");
return;
}

try{

const cred=await signInWithEmailAndPassword(auth,email,pass);

await updateDoc(doc(db,"users",cred.user.uid),{
online:true,
lastLogin:serverTimestamp()
});

location.href="dashboard.html";

}catch(e){
alert(e.message);
}

};


/* REGISTER */

registerBtn.onclick=async()=>{

const email=emailInput.value.trim();
const pass=passwordInput.value.trim();

if(!email||!pass){
alert("Enter email and password");
return;
}

try{

const cred=await createUserWithEmailAndPassword(auth,email,pass);

const user=cred.user;

await setDoc(doc(db,"users",user.uid),{

email:user.email,
nickname:user.email.split("@")[0],
createdAt:serverTimestamp(),
online:true

});

location.href="dashboard.html";

}catch(e){
alert(e.message);
}

};