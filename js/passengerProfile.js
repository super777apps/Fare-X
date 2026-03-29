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

/* ✅ NEW */
const photoInput = document.getElementById("photoInput");
const profileImage = document.getElementById("profileImage");

let currentUser = null;
let uploadedImageUrl = "";

/* ---------- AUTH ---------- */
onAuthStateChanged(auth, async (user) => {

  if (!user) {
    location.href = "index.html";
    return;
  }

  currentUser = user;

  email.value = user.email;

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

  /* ✅ LOAD IMAGE */
  if (data.photoUrl) {
    profileImage.src = data.photoUrl;
    uploadedImageUrl = data.photoUrl;
  }
}

/* ---------- IMAGE UPLOAD ---------- */
photoInput.addEventListener("change", async (e) => {

  const file = e.target.files[0];
  if (!file) return;

  // Preview instantly
  profileImage.src = URL.createObjectURL(file);

  try {

    const formData = new FormData();
    formData.append("file", file);

    /* 🔥 REPLACE THESE */
    formData.append("upload_preset", "YOUR_UPLOAD_PRESET");

    const res = await fetch("https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload", {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    uploadedImageUrl = data.secure_url;

    alert("Photo uploaded");

  } catch (err) {
    console.error(err);
    alert("Image upload failed");
  }
});

/* ---------- SAVE PROFILE ---------- */
saveBtn.onclick = async () => {

  const data = {
    firstName: firstName.value.trim(),
    middleName: middleName.value.trim(),
    lastName: lastName.value.trim(),
    nickName: nickName.value.trim(),
    phone: phone.value.trim(),
    address: address.value.trim(),

    /* ✅ SAVE IMAGE */
    photoUrl: uploadedImageUrl
  };

  try {

    await updateDoc(doc(db, "users", currentUser.uid), data);

    alert("Profile updated successfully");

  } catch (err) {
    console.error(err);
    alert("Error saving profile");
  }
};