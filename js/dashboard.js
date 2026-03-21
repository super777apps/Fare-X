import { db, auth } from "./firebase.js";

import {
collection, onSnapshot,
doc, updateDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;

/* SOUND */
const jobSound = document.getElementById("jobSound");
const acceptSound = document.getElementById("acceptSound");
const declineSound = document.getElementById("declineSound");

function stopSound(){
  jobSound.pause();
  jobSound.currentTime = 0;
}

/* NAME CACHE */
const cache = {};

async function getName(uid){
  if(!uid) return "Unknown";

  if(cache[uid]) return cache[uid];

  const snap = await getDoc(doc(db,"users",uid));
  const name = snap.exists()
    ? (snap.data().nickname || snap.data().email)
    : "User";

  cache[uid] = name;
  return name;
}

/* AUTH */
onAuthStateChanged(auth,user=>{

  if(!user) return location.href="index.html";

  currentUser = user;

  document.getElementById("userInfo").textContent = user.email;

  listenPool();
  listenPosted();
  listenAccepted();
  listenPrivate();
  listenReturns();
});

/* LOGOUT */
document.getElementById("logoutBtn").onclick = async ()=>{
  await signOut(auth);
  location.href="index.html";
};

/* POOL */
function listenPool(){

  const box = document.getElementById("poolList");

  onSnapshot(collection(db,"fares"), async snap=>{

    box.innerHTML="";

    for(const d of snap.docs){

      const f = d.data();

      if(f.status !== "broadcast") continue;

      const name = await getName(f.originalDriverUID || f.createdUid);

      const div = document.createElement("div");

      div.className="fare-card";

      div.innerHTML=`
        <b>${f.pickup}</b> → ${f.drop}<br>
        Price: ${f.price}<br>
        Original: ${name}<br>
        <button onclick="acceptPool('${d.id}')">Accept</button>
      `;

      box.appendChild(div);
    }
  });
}

/* ACCEPT POOL */
window.acceptPool = async id=>{

  await updateDoc(doc(db,"fares",id),{
    status:"accepted",
    currentDriverUID:currentUser.uid,
    acceptedBy:currentUser.uid
  });

  stopSound();
  acceptSound.play();
};

/* POSTED */
function listenPosted(){

  const box=document.getElementById("postedList");

  onSnapshot(collection(db,"fares"), async snap=>{

    box.innerHTML="";

    for(const d of snap.docs){

      const f=d.data();

      if(
        f.originalDriverUID!==currentUser.uid &&
        f.createdUid!==currentUser.uid
      ) continue;

      const currentName = await getName(f.currentDriverUID);

      const div=document.createElement("div");

      div.className="fare-card";

      div.innerHTML=`
        <b>${f.pickup}</b> → ${f.drop}<br>
        Status: ${f.status}<br>
        Current: ${currentName}<br>

        ${f.status==="returned" ? `<button onclick="resend('${d.id}')">Resend</button>`:""}

        <button onclick="deleteJob('${d.id}')">Delete</button>
      `;

      box.appendChild(div);
    }
  });
}

/* RESEND */
window.resend = async id=>{

  await updateDoc(doc(db,"fares",id),{
    status:"broadcast",
    assignedTo:"",
    currentDriverUID:currentUser.uid
  });

  alert("Resent to pool");
};

/* DELETE */
window.deleteJob = async id=>{

  await updateDoc(doc(db,"fares",id),{
    status:"deleted"
  });

  alert("Deleted");
};

/* ACCEPTED */
function listenAccepted(){

  const box=document.getElementById("acceptedList");

  onSnapshot(collection(db,"fares"), async snap=>{

    box.innerHTML="";

    for(const d of snap.docs){

      const f=d.data();

      if(
        f.currentDriverUID!==currentUser.uid &&
        f.acceptedBy!==currentUser.uid
      ) continue;

      const originalName = await getName(f.originalDriverUID);

      const div=document.createElement("div");

      div.className="fare-card";

      div.innerHTML=`
        <b>${f.pickup}</b> → ${f.drop}<br>
        Original: ${originalName}<br>
        Status: ${f.status}
      `;

      box.appendChild(div);
    }
  });
}

/* PRIVATE POPUP */
function listenPrivate(){

  onSnapshot(collection(db,"fares"), snap=>{

    snap.docChanges().forEach(change=>{

      if(change.type!=="added") return;

      const f=change.doc.data();

      if(f.assignedTo===currentUser.uid && f.status==="assigned"){
        showPopup(f,change.doc.id);
      }

    });

  });
}

function showPopup(f,id){

  const popup=document.getElementById("jobPopup");

  popup.style.display="block";

  jobSound.play();

  document.getElementById("jobDetails").innerHTML=`
    Pickup: ${f.pickup}<br>
    Drop: ${f.drop}<br>
    Price: ${f.price}
  `;

  let handled=false;

  const timer=setTimeout(async()=>{

    if(handled) return;

    handled=true;

    await updateDoc(doc(db,"fares",id),{
      status:"returned",
      assignedTo:"",
      currentDriverUID:f.originalDriverUID
    });

    stopSound();
    popup.style.display="none";

  },12000);

  document.getElementById("acceptBtn").onclick=async()=>{

    if(handled) return;

    handled=true;

    await updateDoc(doc(db,"fares",id),{
      status:"accepted",
      currentDriverUID:currentUser.uid
    });

    stopSound();
    acceptSound.play();

    popup.style.display="none";
    clearTimeout(timer);
  };

  document.getElementById("rejectBtn").onclick=async()=>{

    if(handled) return;

    handled=true;

    await updateDoc(doc(db,"fares",id),{
      status:"returned",
      assignedTo:"",
      currentDriverUID:f.originalDriverUID
    });

    stopSound();
    declineSound.play();

    popup.style.display="none";
    clearTimeout(timer);
  };
}

/* RETURN SOUND */
function listenReturns(){

  onSnapshot(collection(db,"fares"), snap=>{

    snap.docChanges().forEach(change=>{

      const f=change.doc.data();

      if(
        change.type==="modified" &&
        f.originalDriverUID===currentUser.uid &&
        f.status==="returned"
      ){
        declineSound.play();
      }

    });

  });
}