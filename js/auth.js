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

    const userDoc = await getDoc(doc(db, "users", userCred.user.uid));

    if (!userDoc.exists()) {
      throw "User data missing";
    }

    const userData = userDoc.data();
    const role = userData.role;

    /* ✅ ROUTING BASED ON ROLE */
    if (role === "driver") {
      location.href = "dashboardDriver.html";
    }
    else if (role === "passenger") {
      location.href = "dashboardPassenger.html";
    }
    else if (role === "admin") {
      location.href = "admin.html";
    }
    else {
      alert("Invalid user role");
    }

  } catch (e) {
    alert("Login failed: " + e);
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

      /* ✅ CONSISTENT FIELD */
      nickName: "",

      /* ✅ DRIVER SYSTEM FIELDS */
      online: false,
      location: null,

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

      /* ✅ CONSISTENT FIELD */
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