import { db, auth } from "./firebase.js";

import {
collection,
query,
where,
onSnapshot,
doc,
runTransaction,
updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
onAuthStateChanged,
signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser=null;

/* SOUNDS */
const jobSound=new Audio("assets/job.mp3");
const acceptSound=new Audio("assets/accept.mp3");
const declineSound=new Audio("assets/decline.mp3");
const notifySound=new Audio("assets/notification.mp3");

function stopAll(){
jobSound.pause(); jobSound.currentTime=0;
}

/* AUTH */
onAuthStateChanged(auth,user=>{

if(!user){ location.href="index.html"; return; }

currentUser=user;

document.getElementById("userInfo").textContent=user.email;

listenPool();
listenPosted();
listenAccepted();
listenAssigned();
listenPassenger();

/* LOCATION */
navigator.geolocation.watchPosition(async pos=>{
await updateDoc(doc(db,"users",user.uid),{
lat:pos.coords.latitude,
lng:pos.coords.longitude
});
});

});

/* LOGOUT */
document.getElementById("logoutBtn").onclick=async()=>{
await signOut(auth);
location.href="index.html";
};

/* TABS */
window.showTab=function(tab){
["pool","posted","accepted"].forEach(t=>{
document.getElementById(t+"Tab").style.display="none";
});
document.getElementById(tab+"Tab").style.display="block";
};

/* POOL */
function listenPool(){

const q=query(collection(db,"fares"), where("status","==","broadcast"));

const box=document.getElementById("poolList");

onSnapshot(q,snap=>{

box.innerHTML="";

snap.forEach(d=>{

const f=d.data();

const div=document.createElement("div");
div.className="fare-card";

div.innerHTML=`
<b>${f.pickup}</b> → ${f.drop}<br>
Price: ${f.price}<br>
<button onclick="acceptPool('${d.id}')">Accept</button>
`;

box.appendChild(div);

});

});
}

/* RACE FIX */
window.acceptPool=async(id)=>{

const ref=doc(db,"fares",id);

try{

await runTransaction(db,async(tx)=>{

const snap=await tx.get(ref);

if(snap.data().status!=="broadcast") throw "taken";

tx.update(ref,{
status:"accepted",
currentDriverUID:currentUser.uid
});

});

acceptSound.play();

}catch{
alert("Already taken");
}

};

/* POSTED */
function listenPosted(){

const q=query(collection(db,"fares"), where("originalDriverUID","==",currentUser.uid));

const box=document.getElementById("postedList");

onSnapshot(q,snap=>{
box.innerHTML="";
snap.forEach(d=>{
const f=d.data();
const div=document.createElement("div");

div.className="fare-card";

div.innerHTML=`
<b>${f.pickup}</b> → ${f.drop}<br>
Status: ${f.status}<br>
Current Driver: ${f.currentDriverUID}<br>
Chain: ${f.chain?.length || 0}
`;

box.appendChild(div);
});
});
}

/* ACCEPTED */
function listenAccepted(){

const q=query(collection(db,"fares"),
where("currentDriverUID","==",currentUser.uid)
);

const box=document.getElementById("acceptedList");

onSnapshot(q,snap=>{
box.innerHTML="";
snap.forEach(d=>{
const f=d.data();

const div=document.createElement("div");
div.className="fare-card";

div.innerHTML=`
<b>${f.pickup}</b> → ${f.drop}<br>
Original: ${f.originalDriverUID}<br>
Chain: ${f.chain?.length || 0}
<button onclick="completeJob('${d.id}')">Complete</button>
`;

box.appendChild(div);
});
});
}

/* COMPLETE */
window.completeJob=async(id)=>{
await updateDoc(doc(db,"fares",id),{
status:"completed"
});
notifySound.play();
};

/* ASSIGNED POPUP */
function listenAssigned(){

const q=query(collection(db,"fares"),
where("assignedTo","==",currentUser.uid),
where("status","==","assigned")
);

onSnapshot(q,snap=>{
snap.docChanges().forEach(c=>{
if(c.type==="added"){
showPopup(c.doc.data(),c.doc.id);
}
});
});
}

function showPopup(f,id){

const popup=document.getElementById("jobPopup");
popup.style.display="block";

jobSound.loop=true;
jobSound.play();

document.getElementById("jobDetails").innerHTML=`
Pickup: ${f.pickup}<br>
Drop: ${f.drop}<br>
Price: ${f.price}
`;

const timer=setTimeout(()=>{
stopAll();
popup.style.display="none";
},12000);

document.getElementById("acceptBtn").onclick=async()=>{
await updateDoc(doc(db,"fares",id),{
status:"accepted",
currentDriverUID:currentUser.uid
});
stopAll();
acceptSound.play();
popup.style.display="none";
clearTimeout(timer);
};

document.getElementById("rejectBtn").onclick=async()=>{
await updateDoc(doc(db,"fares",id),{
status:"broadcast",
assignedTo:""
});
stopAll();
declineSound.play();
popup.style.display="none";
clearTimeout(timer);
};

}

/* PASSENGER */
function listenPassenger(){

const q=query(collection(db,"fares"),
where("createdUid","==",currentUser.uid)
);

onSnapshot(q,snap=>{
snap.docChanges().forEach(c=>{

if(c.type==="modified"){

const f=c.doc.data();

if(f.status==="accepted"){
alert("Driver accepted your job");
}

if(f.status==="completed"){
alert("Job completed");
notifySound.play();
}

}

});
});
}