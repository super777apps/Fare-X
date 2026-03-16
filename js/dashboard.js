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

/* SOUND ALERT */

let jobSound = new Audio("sounds/jobAlert.mp3");
jobSound.loop=true;


/* AUTH */

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

});


/* LOGOUT */

document.getElementById("logoutBtn").onclick=async()=>{

await signOut(auth);

location.href="index.html";

};


/* TABS */

window.showTab=function(tab){

document.getElementById("poolTab").style.display="none";
document.getElementById("postedTab").style.display="none";
document.getElementById("acceptedTab").style.display="none";

if(tab==="pool")
document.getElementById("poolTab").style.display="block";

if(tab==="posted")
document.getElementById("postedTab").style.display="block";

if(tab==="accepted")
document.getElementById("acceptedTab").style.display="block";

};


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
Price: ${job.price}<br>
Type: ${job.dispatchType || "pool"}

<br><br>

<button data-id="${docSnap.id}" class="acceptPool">
Accept
</button>

`;

container.appendChild(div);

});

document.querySelectorAll(".acceptPool").forEach(btn=>{

btn.onclick=async()=>{

const jobId=btn.dataset.id;

const ref=doc(db,"fares",jobId);

const snap=await getDoc(ref);

if(!snap.exists()){
alert("Job not found");
return;
}

if(snap.data().status!=="broadcast"){
alert("Job already taken");
return;
}

await updateDoc(ref,{
status:"accepted",
acceptedBy:currentUser.uid
});

};

});

});

}


/* ACCEPTED JOBS */

function listenAcceptedJobs(){

const ref=query(
collection(db,"fares"),
where("acceptedBy","==",currentUser.uid)
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
Price: ${job.price}
`;

container.appendChild(div);

});

});

}


/* MY POSTED */

function listenPostedJobs(){

const ref=query(
collection(db,"fares"),
where("createdUid","==",currentUser.uid)
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
Price: ${job.price}<br>
Status: ${job.status}
${job.returnReason ? "<br>Returned: "+job.returnReason : ""}

`;

container.appendChild(div);

});

});

}


/* PRIVATE DISPATCH POPUP */

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

jobSound.play();


/* ACCEPT */

document.getElementById("acceptBtn").onclick=async()=>{

await updateDoc(
doc(db,"fares",id),
{
status:"accepted",
acceptedBy:currentUser.uid
}
);

popup.style.display="none";

jobSound.pause();
jobSound.currentTime=0;

};


/* REJECT */

document.getElementById("rejectBtn").onclick=async()=>{

await updateDoc(
doc(db,"fares",id),
{
status:"returned",
returnReason:"Driver rejected"
}
);

popup.style.display="none";

jobSound.pause();
jobSound.currentTime=0;

};


/* AUTO CLOSE */

setTimeout(()=>{

if(popup.style.display==="block"){

popup.style.display="none";

jobSound.pause();
jobSound.currentTime=0;

}

},12000);

}