import { db, auth } from "./firebase.js";

import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


let currentUser = null;


/* ---------------- AUTH ---------------- */

onAuthStateChanged(auth,(user)=>{

  if(!user){
    window.location.href="index.html";
    return;
  }

  currentUser=user;

  console.log("Dashboard user:",user.uid);

  listenPrivateJobs(user);
  listenPoolJobs(user);

});



/* ---------------- PRIVATE JOB LISTENER ---------------- */

function listenPrivateJobs(user){

  const inboxRef=collection(db,"privateFares",user.uid,"jobs");

  onSnapshot(inboxRef,(snapshot)=>{

    snapshot.docChanges().forEach(change=>{

      if(change.type==="added"){

        const job=change.doc.data();

        if(job.status==="pending"){

          showPrivatePopup(job,change.doc.id);

        }

      }

    });

  });

}



/* ---------------- SHOW POPUP ---------------- */

function showPrivatePopup(job,jobId){

  const popup=document.getElementById("jobPopup");
  const details=document.getElementById("jobDetails");

  const jobSound=document.getElementById("jobSound");
  const declineSound=document.getElementById("declineSound");

  details.innerHTML=`

  <b>Pickup:</b> ${job.pickup}<br>
  <b>Drop:</b> ${job.drop}<br>
  <b>Price:</b> ${job.price}<br>
  <b>Time:</b> ${job.time}

  `;

  popup.style.display="block";

  jobSound.currentTime=0;
  jobSound.play();


  let timer=setTimeout(()=>{

    jobSound.pause();
    popup.style.display="none";

  },12000);



  document.getElementById("acceptBtn").onclick=async()=>{

    await updateDoc(
      doc(db,"privateFares",currentUser.uid,"jobs",jobId),
      {status:"accepted"}
    );

    jobSound.pause();
    popup.style.display="none";
    clearTimeout(timer);

  };


  document.getElementById("rejectBtn").onclick=async()=>{

    await updateDoc(
      doc(db,"privateFares",currentUser.uid,"jobs",jobId),
      {status:"rejected"}
    );

    jobSound.pause();
    declineSound.play();

    popup.style.display="none";
    clearTimeout(timer);

  };

}



/* ---------------- POOL JOB LISTENER ---------------- */

function listenPoolJobs(user){

  const poolRef=query(
    collection(db,"fares"),
    where("status","==","broadcast")
  );

  const poolContainer=document.getElementById("poolJobs");

  if(!poolContainer) return;

  onSnapshot(poolRef,(snapshot)=>{

    poolContainer.innerHTML="";

    snapshot.forEach(docSnap=>{

      const job=docSnap.data();

      const div=document.createElement("div");

      div.className="jobCard";

      div.innerHTML=`

      <b>${job.pickup}</b> ➜ ${job.drop}<br>
      Price: ${job.price}<br>
      Time: ${job.time}

      <br><br>

      <button data-id="${docSnap.id}" class="acceptPool">
      Accept
      </button>

      `;

      poolContainer.appendChild(div);

    });


    document.querySelectorAll(".acceptPool").forEach(btn=>{

      btn.onclick=async()=>{

        const jobId=btn.dataset.id;

        await updateDoc(
          doc(db,"fares",jobId),
          {
            status:"accepted",
            acceptedBy:currentUser.uid
          }
        );

      };

    });

  });

}