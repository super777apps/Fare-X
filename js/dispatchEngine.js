import { db } from "./firebase.js";
import {
  doc,
  updateDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const TIMEOUT = 12000;

/* SEND TO FRIEND */
export async function sendToFriend(jobId, friendUID, senderUID) {

  const ref = doc(db, "fares", jobId);
  const snap = await getDoc(ref);

  let chain = snap.data().chain || [];

  chain.push({
    from: senderUID,
    to: friendUID,
    time: Date.now()
  });

  await updateDoc(ref, {
    status: "assigned",
    assignedTo: friendUID,
    currentDriverUID: friendUID,
    lastSenderUID: senderUID,
    dispatchType: "friend",
    chain: chain,
    dispatchStartedAt: serverTimestamp()
  });

  startTimeout(jobId);
}


/* AUTO RETURN TO ORIGINAL DRIVER */
async function startTimeout(jobId) {

  setTimeout(async () => {

    const ref = doc(db, "fares", jobId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return;

    const job = snap.data();

    if (job.status === "assigned") {

      await updateDoc(ref, {
        status: "returned",
        assignedTo: "",
        currentDriverUID: job.originalDriverUID,
        returnReason: "Timeout",
        notifyOriginal: true
      });

    }

  }, TIMEOUT);
}