import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* CONFIG */
const firebaseConfig = {
  apiKey: "AIzaSyDU3NEj9mXQdHRP9VZ-yfm-XPaKi_QM4q4",
  authDomain: "fare-x.firebaseapp.com",
  projectId: "fare-x",
  storageBucket: "fare-x.firebasestorage.app",
  messagingSenderId: "168549300024",
  appId: "1:168549300024:web:c553faf10ef72bc474b3cd"
};

/* INIT */
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/* 🔒 ROLE LOCK SYSTEM */
onAuthStateChanged(auth, async user => {

  if (!user) return;

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  // ✅ CREATE ONLY IF NOT EXISTS
  if (!snap.exists()) {

    await setDoc(ref, {
      uid: user.uid,
      email: user.email,
      nickname: user.email,
      role: "passenger", // default first time only
      createdAt: serverTimestamp()
    });

  } else {

    // ✅ ONLY update login time
    await setDoc(ref, {
      lastLogin: serverTimestamp()
    }, { merge: true });

  }

});