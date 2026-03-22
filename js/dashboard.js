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

/* SOUNDS */
const jobSound=new Audio("assets/job.mp3");
const acceptSound=new Audio("assets/accept.mp3");
const declineSound=new Audio("assets/decline.mp3");

function stopSound(){
jobSound.pause();
jobSound.currentTime=0;
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
Driver: ${f.originalDriverName}<br>

<button onclick="acceptPool('${d.id}')">Accept</button>
`;

box.appendChild(div);

});

});

}

window.acceptPool=async(id)=>{

const ref=doc(db,"fares",id);
const snap=await getDoc(ref);

if(snap.data().status!=="broadcast") return alert("Taken");

await updateDoc(ref,{
status:"accepted",
currentDriverUID:currentUser.uid
});

acceptSound.play();

};

/* POSTED */
function listenPosted(){

const q=query(collection(db,"fares"),
where("originalDriverUID","==",currentUser.uid)
);

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
Current: ${f.currentDriverName}<br>

${f.status==="returned" ? `
<button onclick="resendFriend('${d.id}')">Friend</button>
<button onclick="resendPool('${d.id}')">Pool</button>
<button onclick="deleteJob('${d.id}')">Delete</button>
` : ""}

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
Original: ${f.originalDriverName}<br>
Status: ${f.status}

<button onclick="completeJob('${d.id}')">Complete</button>
`;

box.appendChild(div);

});

});

}

/* COMPLETE */
window.completeJob=async(id)=>{
await updateDoc(doc(db,"fares",id),{status:"completed"});
};

/* POPUP */
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
stopSound();
popup.style.display="none";
},12000);

document.getElementById("acceptBtn").onclick=async()=>{
await updateDoc(doc(db,"fares",id),{
status:"accepted",
currentDriverUID:currentUser.uid
});
stopSound();
popup.style.display="none";
clearTimeout(timer);
};

document.getElementById("rejectBtn").onclick=async()=>{
await updateDoc(doc(db,"fares",id),{
status:"returned",
assignedTo:"",
currentDriverUID:f.originalDriverUID,
currentDriverName:f.originalDriverName
});
stopSound();
popup.style.display="none";
clearTimeout(timer);
};

}

/* RESEND */
window.resendPool=async(id)=>{
await updateDoc(doc(db,"fares",id),{
status:"broadcast",
assignedTo:""
});
};

window.deleteJob=async(id)=>{
await updateDoc(doc(db,"fares",id),{
status:"deleted"
});
};