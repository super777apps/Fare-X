import { db, auth } from "./firebase.js";

import {
collection,
query,
where,
onSnapshot,
doc,
updateDoc,
getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
onAuthStateChanged,
signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


let currentUser=null;

let jobSound = new Audio("assets/job.mp3");
let notifySound = new Audio("assets/notification.mp3");
let acceptSound = new Audio("assets/accept.mp3");
let declineSound = new Audio("assets/decline.mp3");

jobSound.loop=true;


onAuthStateChanged(auth,async user=>{

if(!user){
location.href="index.html";
return;
}

currentUser=user;

document.getElementById("userInfo").textContent=user.email;

listenPoolJobs();
listenAcceptedJobs();
listenPostedJobs();
listenPrivateJobs(user);
listenCompletion(user);

});


document.getElementById("logoutBtn").onclick=async()=>{

await signOut(auth);

location.href="index.html";

};


window.showTab=function(tab){

document.getElementById("poolTab").style.display="none";
document.getElementById("postedTab").style.display="none";
document.getElementById("acceptedTab").style.display="none";

document.getElementById(tab+"Tab").style.display="block";

};


/* POOL */

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
Price: ${job.price}<br>
Original Driver: ${job.originalDriverUID}

<br><br>

<button data-id="${docSnap.id}" class="acceptPool">Accept</button>

`;

container.appendChild(div);

});

document.querySelectorAll(".acceptPool").forEach(btn=>{

btn.onclick=async()=>{

const jobId=btn.dataset.id;

await updateDoc(doc(db,"fares",jobId),{

status:"accepted",
acceptedBy:currentUser.uid,
currentDriverUID:currentUser.uid

});

acceptSound.play();

};

});

});

}


/* ACCEPTED */

function listenAcceptedJobs(){

const ref=query(
collection(db,"fares"),
where("currentDriverUID","==",currentUser.uid),
where("status","==","accepted")
);

const container=document.getElementById("acceptedList");

onSnapshot(ref,snap=>{

container.innerHTML="";

snap.forEach(docSnap=>{

const job=docSnap.data();

const div=document.createElement("div");

div.className="fare-card";

div.innerHTML=`

<b>${job.pickup}</b> → ${job.drop}<br>
Price: ${job.price}<br>
Original Driver: ${job.originalDriverUID}

<button data-id="${docSnap.id}" class="completeJob">Complete</button>

`;

container.appendChild(div);

});

document.querySelectorAll(".completeJob").forEach(btn=>{

btn.onclick=async()=>{

await updateDoc(doc(db,"fares",btn.dataset.id),{

status:"completed",
completedBy:currentUser.uid

});

notifySound.play();

};

});

});

}


/* POSTED */

function listenPostedJobs(){

const ref=query(
collection(db,"fares"),
where("originalDriverUID","==",currentUser.uid)
);

const container=document.getElementById("postedList");

onSnapshot(ref,snap=>{

container.innerHTML="";

snap.forEach(docSnap=>{

const job=docSnap.data();

const div=document.createElement("div");

div.className="fare-card";

div.innerHTML=`

<b>${job.pickup}</b> → ${job.drop}<br>
Status: ${job.status}<br>
Current Driver: ${job.currentDriverUID}

`;

container.appendChild(div);

});

});

}


/* PRIVATE */

function listenPrivateJobs(user){

const ref=query(
collection(db,"fares"),
where("assignedTo","==",user.uid),
where("status","==","assigned")
);

onSnapshot(ref,snap=>{

snap.docChanges().forEach(change=>{

if(change.type==="added"){

const job=change.doc.data();

showPopup(job,change.doc.id);

jobSound.play();

}

});

});

}


function showPopup(job,id){

const popup=document.getElementById("jobPopup");
const details=document.getElementById("jobDetails");

details.innerHTML=`
Pickup: ${job.pickup}<br>
Drop: ${job.drop}<br>
Price: ${job.price}
`;

popup.style.display="block";


document.getElementById("acceptBtn").onclick=async()=>{

await updateDoc(
doc(db,"fares",id),
{
status:"accepted",
acceptedBy:currentUser.uid,
currentDriverUID:currentUser.uid
}
);

acceptSound.play();

popup.style.display="none";

};


document.getElementById("rejectBtn").onclick=async()=>{

await updateDoc(
doc(db,"fares",id),
{
status:"returned"
}
);

declineSound.play();

popup.style.display="none";

};

}


/* COMPLETION NOTIFY */

function listenCompletion(user){

const ref=query(
collection(db,"fares"),
where("originalDriverUID","==",user.uid),
where("status","==","completed")
);

onSnapshot(ref,snap=>{

snap.docChanges().forEach(change=>{

if(change.type==="modified"){

notifySound.play();

alert("Your job has been completed");

}

});

});

}