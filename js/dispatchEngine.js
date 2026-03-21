import { db } from "./firebase.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function sendToFriend(jobId, friendUID) {

  await updateDoc(doc(db, "fares", jobId), {
    status: "assigned",
    assignedTo: friendUID,
    currentDriverUID: friendUID,
    dispatchType: "friend"
  });

}