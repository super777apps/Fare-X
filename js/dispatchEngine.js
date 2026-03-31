import { db } from "./firebase.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* SEND TO FRIEND */
export async function sendToFriend(jobId, friendUID, senderUID){

  await updateDoc(doc(db,"fares",jobId),{
    assignedTo: friendUID,
    status:"waiting response",
    soundPlayed:false
  });

}