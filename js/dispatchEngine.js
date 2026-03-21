import { db } from "./firebase.js";

import {
doc,
updateDoc,
getDoc,
serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function sendToFriend(jobId,friendUID,senderUID){

const ref=doc(db,"fares",jobId);
const snap=await getDoc(ref);

let chain = snap.exists() ? snap.data().chain || [] : [];

chain.push({
from: senderUID,
to: friendUID,
time: Date.now()
});

await updateDoc(ref,{
status:"assigned",
dispatchType:"friend",
assignedTo:friendUID,
currentDriverUID:friendUID,
chain: chain,
dispatchStartedAt: serverTimestamp()
});
}