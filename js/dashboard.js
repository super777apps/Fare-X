import { db, auth } from "./firebase.js";

import {
collection,
query,
where,
onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


let currentUser=null;

const audio=new Audio("assets/job.mp3");


onAuthStateChanged(auth,user=>{

if(!user){
location.href="index.html";
return;
}

currentUser=user;


/* LIVE JOB LISTENER */

onSnapshot(
query(
collection(db,"fares"),
where("currentDriverUID","==",user.uid),
where("status","in",["assigned","accepted"])
),
snap=>{

snap.docChanges().forEach(change=>{

if(change.type==="added"){

const job=change.doc.data();

showPopup(job);

audio.play();

}

});

});


});


function showPopup(job){

const popup=document.getElementById("jobPopup");

const details=document.getElementById("jobDetails");

details.innerHTML=`
Pickup: ${job.pickup}<br>
Drop: ${job.drop}<br>
Price: ${job.price}
`;

popup.style.display="block";

}