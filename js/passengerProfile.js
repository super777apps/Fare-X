import { db, auth } from "./firebase.js";

import {
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ---------- ELEMENTS ---------- */
const firstName = document.getElementById("firstName");
const middleName = document.getElementById("middleName");
const lastName = document.getElementById("lastName");
const nickName = document.getElementById("nickName");
const phone = document.getElementById("phone");
const email = document.getElementById("email");
const address = document.getElementById("address");

const saveBtn = document.getElementById("saveBtn");

let currentUser = null;

/* ---------- AUTH ---------- */
onAuthStateChanged(auth, async (user) => {

  if (!user) {
    location.href = "index.html";
    return;
  }

  currentUser = user;

  email.value = user.email; // always show email

  loadProfile();
});

/* ---------- LOAD PROFILE ---------- */
async function loadProfile() {

  const snap = await getDoc(doc(db, "users", currentUser.uid));

  if (!snap.exists()) return;

  const data = snap.data();

  firstName.value = data.firstName || "";
  middleName.value = data.middleName || "";
  lastName.value = data.lastName || "";
  nickName.value = data.nickName || "";
  phone.value = data.phone || "";
  address.value = data.address || "";
}

/* ---------- SAVE PROFILE ---------- */
saveBtn.onclick = async () => {

  const data = {
    firstName: firstName.value.trim(),
    middleName: middleName.value.trim(),
    lastName: lastName.value.trim(),
    nickName: nickName.value.trim(),
    phone: phone.value.trim(),
    address: address.value.trim()
  };

  try {

    await updateDoc(doc(db, "users", currentUser.uid), data);

    alert("Profile updated successfully");

  } catch (err) {
    console.error(err);
    alert("Error saving profile");
  }
};