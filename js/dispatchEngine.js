import { db, auth } from "./firebase.js";
import {
  doc, getDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// -----------------------------
// CONSTANTS
// -----------------------------

const ALERT_TIMEOUT = 12000; // 12 sec
const AUTO_TIMEOUT  = 420000; // 7 minutes

// -----------------------------
// FRIEND DISPATCH
// -----------------------------

export async function sendToFriend(jobId, friendEmail){

  await updateDoc(doc(db,"fares",jobId),{
    status:"assigned",
    dispatchType:"friend",
    assignedTo: friendEmail,
    dispatchStartedAt: serverTimestamp(),
    returned:false,
    returnReason:""
  });

  startFriendTimer(jobId);
}

// -----------------------------
// AUTO DISPATCH
// -----------------------------

export async function startAutoDispatch(jobId, driverEmails){

  if(!driverEmails || !driverEmails.length) return;

  await updateDoc(doc(db,"fares",jobId),{
    status:"assigned",
    dispatchType:"auto",
    assignedTo: driverEmails[0],
    dispatchList: driverEmails,
    dispatchIndex: 0,
    dispatchStartedAt: serverTimestamp(),
    returned:false,
    returnReason:""
  });

  startAutoRetry(jobId);
  startGlobalTimeout(jobId);
}

// -----------------------------
// FRIEND TIMEOUT HANDLER
// -----------------------------

function startFriendTimer(jobId){

  setTimeout(async()=>{

    const snap = await getDoc(doc(db,"fares",jobId));
    if(!snap.exists()) return;

    const f = snap.data();

    if(f.status === "assigned" && f.dispatchType==="friend"){

      await returnToSender(jobId,"Friend rejected or timeout");

    }

  }, ALERT_TIMEOUT);
}

// -----------------------------
// AUTO DISPATCH RETRY CHAIN
// -----------------------------

function startAutoRetry(jobId){

  setTimeout(async()=>{

    const ref = doc(db,"fares",jobId);
    const snap = await getDoc(ref);

    if(!snap.exists()) return;

    const f = snap.data();

    if(f.status !== "assigned" || f.dispatchType!=="auto") return;

    const next = f.dispatchIndex + 1;

    if(next >= f.dispatchList.length){
      await moveToPool(jobId,"All drivers declined");
      return;
    }

    await updateDoc(ref,{
      assignedTo: f.dispatchList[next],
      dispatchIndex: next
    });

    startAutoRetry(jobId);

  }, ALERT_TIMEOUT);
}

// -----------------------------
// GLOBAL AUTO TIMEOUT
// -----------------------------

function startGlobalTimeout(jobId){

  setTimeout(async()=>{

    const snap = await getDoc(doc(db,"fares",jobId));

    if(!snap.exists()) return;

    if(snap.data().status === "assigned"){

      await moveToPool(jobId,"Auto dispatch timeout");

    }

  }, AUTO_TIMEOUT);
}

// -----------------------------
// RETURN TO SENDER
// -----------------------------

export async function returnToSender(jobId, reason){

  await updateDoc(doc(db,"fares",jobId),{
    status:"returned",
    assignedTo:"",
    returned:true,
    returnReason:reason
  });

}

// -----------------------------
// MOVE TO POOL
// -----------------------------

export async function moveToPool(jobId, reason){

  await updateDoc(doc(db,"fares",jobId),{
    status:"broadcast",
    assignedTo:"",
    dispatchType:"pool",
    returnReason:reason
  });

}