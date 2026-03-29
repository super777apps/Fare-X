import { auth } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ---------- AUTH CHECK ---------- */
onAuthStateChanged(auth, (user) => {

  if (!user) {
    location.href = "index.html";
    return;
  }

});

/* ---------- BACK BUTTON (FIXED) ---------- */
document.getElementById("backBtn").onclick = () => {
  window.location.href = "dashboardDriver.html";
};

/* ---------- WHATSAPP BUTTON ---------- */
document.getElementById("whatsappBtn").onclick = () => {

  const phone = "61431859673"; // no + sign
  const message = encodeURIComponent("Hello Fare-X Support, I need help with...");

  window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
};