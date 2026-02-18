import { auth } from "./firebase.js";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");

document.getElementById("loginBtn").onclick = async () => {
  try {
    await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    window.location.href = "dashboard.html";
  } catch(e) {
    alert(e.message);
  }
};

document.getElementById("registerBtn").onclick = async () => {
  try {
    await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    window.location.href = "dashboard.html";
  } catch(e) {
    alert(e.message);
  }
};