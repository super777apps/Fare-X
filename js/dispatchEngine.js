import { db } from "./firebase.js";

import {
doc,
getDoc,
updateDoc,
serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


const ALERT_TIMEOUT = 12000;


export async function sendToFriend(jobId,friendUID){

await updateDoc(doc(db,"fares",jobId),{

status:"assigned",
dispatchType:"friend",
assignedTo:friendUID,
dispatchStartedAt:serverTimestamp()

});

startFriendTimer(jobId);

}


function startFriendTimer(jobId){

setTimeout(async()=>{

const snap=await getDoc(doc(db,"fares",jobId));

if(!snap.exists()) return;

const job=snap.data();

if(job.status==="assigned"){

await updateDoc(doc(db,"fares",jobId),{

status:"broadcast",
assignedTo:"",
returnReason:"Friend timeout"

});

}

},ALERT_TIMEOUT);

}