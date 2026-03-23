import { auth, db } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


/* LOGIN */
window.login = async () => {

  try {

    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;

    if (!email || !pass) {
      alert("Enter email & password");
      return;
    }

    const res = await signInWithEmailAndPassword(auth, email, pass);

    await routeUser(res.user);

  } catch (err) {
    alert(err.message);
  }

};


/* SIGNUP DRIVER */
window.signupDriver = async () => {

  try {

    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;
    const nick = document.getElementById("nickname").value;

    if (!nick) return alert("Enter nickname");

    const res = await createUserWithEmailAndPassword(auth, email, pass);

    await setDoc(doc(db, "users", res.user.uid), {
      uid: res.user.uid,
      email,
      nickname: nick,
      role: "driver"
    });

    location.href = "dashboard-driver.html";

  } catch (err) {
    alert(err.message);
  }

};


/* SIGNUP PASSENGER */
window.signupPassenger = async () => {

  try {

    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;
    const nick = document.getElementById("nickname").value;

    if (!nick) return alert("Enter nickname");

    const res = await createUserWithEmailAndPassword(auth, email, pass);

    await setDoc(doc(db, "users", res.user.uid), {
      uid: res.user.uid,
      email,
      nickname: nick,
      role: "passenger"
    });

    location.href = "dashboard-passenger.html";

  } catch (err) {
    alert(err.message);
  }

};


/* ROUTE USER */
async function routeUser(user) {

  const snap = await getDoc(doc(db, "users", user.uid));

  if (!snap.exists()) {
    alert("User profile missing");
    return;
  }

  const role = snap.data().role;

  if (role === "driver") {
    location.href = "dashboard-driver.html";
  } else {
    location.href = "dashboard-passenger.html";
  }

}


/* AUTO LOGIN */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    await routeUser(user);
  }
});