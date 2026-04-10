import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ---------- INPUTS ---------- */
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");

const loginBtn = document.getElementById("loginBtn");
const registerDriverBtn = document.getElementById("registerDriverBtn");
const registerPassengerBtn = document.getElementById("registerPassengerBtn");

/* ✅ OPTIONAL ADMIN BUTTON */
const registerAdminBtn = document.getElementById("registerAdminBtn");

/* =========================================================
   LOGIN
========================================================= */
loginBtn.onclick = async () => {

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    return alert("Fill all fields");
  }

  try {

    const userCred = await signInWithEmailAndPassword(auth, email, password);

    const userRef = doc(db, "users", userCred.user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      alert("User profile missing");
      return;
    }

    const userData = userDoc.data();

    if (!userData.role) {
      alert("Account misconfigured");
      return;
    }

    if (userData.role === "driver") {
      location.href = "dashboardDriver.html";
    }
    else if (userData.role === "passenger") {
      location.href = "dashboardPassenger.html";
    }
    else if (userData.role === "admin") {
      location.href = "admin.html";
    }
    else {
      alert("Invalid role");
    }

  } catch (e) {
    alert("Login failed: " + e.message);
  }
};

/* =========================================================
   CREATE DRIVER
========================================================= */
registerDriverBtn.onclick = async () => {

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    return alert("Fill all fields");
  }

  try {

    const userCred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", userCred.user.uid), {
  email,
  role: "driver",
  nickName: "",

  online: false,
  location: { lat: null, lng: null },

  lastActive: null,
  createdAt: new Date()
});

    alert("Driver account created. You can login now.");

  } catch (e) {
    alert("Error creating driver: " + e);
  }
};

/* =========================================================
   CREATE PASSENGER
========================================================= */
registerPassengerBtn.onclick = async () => {

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    return alert("Fill all fields");
  }

  try {

    const userCred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", userCred.user.uid), {
  email,
  role: "passenger",
  nickName: "",
  createdAt: new Date()
});

    alert("Passenger account created. You can login now.");

  } catch (e) {
    alert("Error creating passenger: " + e);
  }
};

/* =========================================================
   CREATE ADMIN (OPTIONAL BUTTON)
========================================================= */
if (registerAdminBtn) {

  registerAdminBtn.onclick = async () => {

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      return alert("Fill all fields");
    }

    try {

      const userCred = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(doc(db, "users", userCred.user.uid), {
        email,
        role: "admin",

        /* ✅ DEFAULT NAME */
        nickName: "Admin",

        createdAt: new Date()
      });

      alert("Admin account created");

    } catch (e) {
      alert("Error creating admin: " + e);
    }
  };
}