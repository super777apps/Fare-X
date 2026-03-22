import { db } from "./firebase.js";

import {
doc,
updateDoc,
getDoc,
serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const ALERT_TIMEOUT = 12000;

export async function sendToFriend(jobId,friendUID,senderUID){

const ref=doc(db,"fares",jobId);
const snap=await getDoc(ref);

const job=snap.data();

/* UPDATE JOB */
await updateDoc(ref,{
status:"assigned",
dispatchType:"friend",
assignedTo:friendUID,

currentDriverUID:friendUID,
currentDriverName:"",

dispatchStartedAt:serverTimestamp()
});

/* AUTO RETURN TIMER */
setTimeout(async()=>{

const snap2=await getDoc(ref);
if(!snap2.exists()) return;

const j=snap2.data();

if(j.status==="assigned"){

await updateDoc(ref,{
status:"returned",
assignedTo:"",

currentDriverUID:j.originalDriverUID,
currentDriverName:j.originalDriverName,

returnReason:"Timeout"
});

}

},ALERT_TIMEOUT);

}