import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const registerDriverBtn = document.getElementById("registerDriverBtn");
const registerPassengerBtn = document.getElementById("registerPassengerBtn");

// Login
loginBtn.onclick = async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (!email || !password) return alert("Fill all fields");

  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, "users", userCred.user.uid));
    if (!userDoc.exists()) throw "User data missing";

    const role = userDoc.data().role;
    if (role === "driver") {
      location.href = "dashboardDriver.html";
    } else if (role === "passenger") {
      location.href = "dashboardPassenger.html";
    } else {
      alert("Invalid user role");
    }

  } catch (e) {
    alert("Login failed: " + e);
  }
};

// Create Driver
registerDriverBtn.onclick = async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (!email || !password) return alert("Fill all fields");

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", userCred.user.uid), {
      email,
      role: "driver",
      nickname: "",
      createdAt: new Date()
    });
    alert("Driver account created. You can login now.");
  } catch (e) {
    alert("Error creating driver: " + e);
  }
};

// Create Passenger
registerPassengerBtn.onclick = async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (!email || !password) return alert("Fill all fields");

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", userCred.user.uid), {
      email,
      role: "passenger",
      nickname: "",
      createdAt: new Date()
    });
    alert("Passenger account created. You can login now.");
  } catch (e) {
    alert("Error creating passenger: " + e);
  }
};