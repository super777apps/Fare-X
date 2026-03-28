import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ---------- BACK BUTTON ---------- */
const backBtn = document.getElementById("backBtn");

/* ---------- WHATSAPP ---------- */
const whatsappBtn = document.getElementById("whatsappBtn");

whatsappBtn.onclick = () => {
  // ✅ opens WhatsApp chat
  window.open("https://wa.me/61431859673", "_blank");
};

/* ---------- AUTH ---------- */
onAuthStateChanged(auth, async (user) => {

  if (!user) {
    location.href = "index.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));

  let role = "driver";

  if (snap.exists()) {
    role = snap.data().role || "driver";
  }

  /* ✅ SMART BACK NAVIGATION */
  backBtn.onclick = () => {
    if (role === "passenger") {
      location.href = "dashboardPassenger.html";
    } else {
      location.href = "dashboardDriver.html";
    }
  };

});