import { db, auth } from "./firebase.js";

import {
collection,
onSnapshot,
doc,
updateDoc,
query,
where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser=null;


/* AUTH */

onAuthStateChanged(auth,user=>{

if(!user){
location.href="index.html";
return;
}

currentUser=user;

listenPrivateJobs(user);

listenPoolJobs();

});


/* PRIVATE JOB LISTENER */

function listenPrivateJobs(user){

const ref=collection(db,"privateFares",user.uid,"jobs");

onSnapshot(ref,snap=>{

snap.docChanges().forEach(change=>{

if(change.type==="added"){

const job=change.doc.data();

if(job.status==="pending"){

showPopup(job,change.doc.id);

}

}

});

});

}


/* POPUP */

function showPopup(job,id){

const popup=document.getElementById("jobPopup");
const details=document.getElementById("jobDetails");
const sound=document.getElementById("jobSound");

details.innerHTML=`
Pickup: ${job.pickup}<br>
Drop: ${job.drop}<br>
Price: ${job.price}
`;

popup.style.display="block";

sound.play();

document.getElementById("acceptBtn").onclick=async()=>{

await updateDoc(
doc(db,"privateFares",currentUser.uid,"jobs",id),
{status:"accepted"}
);

popup.style.display="none";
sound.pause();

};

document.getElementById("rejectBtn").onclick=async()=>{

await updateDoc(
doc(db,"privateFares",currentUser.uid,"jobs",id),
{status:"rejected"}
);

popup.style.display="none";
sound.pause();

};

}


/* POOL JOBS */

function listenPoolJobs(){

const ref=query(
collection(db,"fares"),
where("status","==","broadcast")
);

const container=document.getElementById("poolList");

onSnapshot(ref,snap=>{

container.innerHTML="";

snap.forEach(docSnap=>{

const job=docSnap.data();

const div=document.createElement("div");

div.className="fare-card";

div.innerHTML=`
<b>${job.pickup}</b> → ${job.drop}<br>
Price: ${job.price}
`;

container.appendChild(div);

});

});

}