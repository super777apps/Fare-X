import { db } from "./firebase.js";

import {
doc,
updateDoc,
serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


export async function acceptJob(jobId,driverUID){

await updateDoc(doc(db,"fares",jobId),{

status:"accepted",
acceptedBy:driverUID,
currentDriverUID:driverUID,
acceptedAt:serverTimestamp()

});

}


export async function completeJob(jobId,driverUID){

await updateDoc(doc(db,"fares",jobId),{

status:"completed",
completedBy:driverUID,
completedAt:serverTimestamp()

});

}


export async function sendToFriend(jobId,driverUID){

await updateDoc(doc(db,"fares",jobId),{

status:"assigned",
dispatchType:"friend",
currentDriverUID:driverUID

});

}


export async function sendToPool(jobId){

await updateDoc(doc(db,"fares",jobId),{

status:"broadcast",
dispatchType:"pool",
currentDriverUID:""

});

}