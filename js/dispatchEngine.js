import { db } from "./firebase.js";

import {
doc,
updateDoc,
getDoc,
serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const TIMEOUT = 12000;

export async function sendToFriend(jobId,friendUID,senderUID){

const ref=doc(db,"fares",jobId);
const snap=await getDoc(ref);

const senderSnap=await getDoc(doc(db,"users",senderUID));
const friendSnap=await getDoc(doc(db,"users",friendUID));

const senderName=senderSnap.data()?.nickname || "";
const friendName=friendSnap.data()?.nickname || "";

await updateDoc(ref,{
status:"assigned",
assignedTo:friendUID,
currentDriverUID:friendUID,
currentDriverName:friendName,
lastSenderUID:senderUID,
lastSenderName:senderName,
dispatchStartedAt:serverTimestamp()
});

setTimeout(async()=>{

const s=await getDoc(ref);
if(!s.exists()) return;

if(s.data().status==="assigned"){

await updateDoc(ref,{
status:"returned",
assignedTo:"",
currentDriverUID:s.data().originalDriverUID,
currentDriverName:s.data().originalDriverName,
returnReason:"Timeout"
});

}

},TIMEOUT);

}