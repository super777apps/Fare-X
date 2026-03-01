import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");

/* ---------------- LOGIN ---------------- */

loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    alert("Enter email and password");
    return;
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await createUserIfNotExists(cred.user);
    location.href = "dashboard.html";
  } catch (err) {
    alert(err.message);
  }
});

/* ---------------- REGISTER ---------------- */

registerBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    alert("Enter email and password");
    return;
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await createUserIfNotExists(cred.user);
    location.href = "dashboard.html";
  } catch (err) {
    alert(err.message);
  }
});

/* ---------------- AUTO CREATE USER ---------------- */

async function createUserIfNotExists(user) {
  const ref = doc(db, "users", user.uid);

  await setDoc(ref, {
    uid: user.uid,
    email: user.email,
    createdAt: serverTimestamp()
  }, { merge: true });
}

/* ---------------- AUTO LOGIN ---------------- */

onAuthStateChanged(auth, user => {
  if (user && location.pathname.includes("index.html")) {
    location.href = "dashboard.html";
  }
});