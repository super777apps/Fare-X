import { db, auth } from "./firebase.js";

import {
  doc,
  getDoc,
  updateDoc,
  setDoc
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

/* ---------- NEW IMAGE ELEMENTS ---------- */
const photoInput = document.getElementById("photoInput");
const profileImage = document.getElementById("profileImage");

let currentUser = null;
let uploadedImageUrl = ""; // safe default

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

  /* ---------- LOAD IMAGE ---------- */
  if (data.photoUrl) {
    profileImage.src = data.photoUrl;
    uploadedImageUrl = data.photoUrl;
  }
}

/* ---------- IMAGE UPLOAD (CLOUDINARY SAFE) ---------- */
photoInput.addEventListener("change", async (e) => {

  const file = e.target.files[0];
  if (!file) return;

  // instant preview
  profileImage.src = URL.createObjectURL(file);

  uploadedImageUrl = ""; // reset before upload

  try {

    const formData = new FormData();
    formData.append("file", file);

    formData.append("upload_preset", "Farex_passenger");

    const res = await fetch(
      "https://api.cloudinary.com/v1_1/dgvlsenks/image/upload",
      {
        method: "POST",
        body: formData
      }
    );

    const result = await res.json();

    if (!result.secure_url) {
      throw new Error("Cloudinary upload failed");
    }

    uploadedImageUrl = result.secure_url;

    console.log("UPLOAD SUCCESS:", uploadedImageUrl);

    alert("Photo uploaded successfully");

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    alert("Image upload failed");
  }
});

/* ---------- SAVE PROFILE (FIXED SAFE) ---------- */
saveBtn.onclick = async () => {

  try {

    const data = {
      firstName: firstName.value.trim(),
      middleName: middleName.value.trim(),
      lastName: lastName.value.trim(),
      nickName: nickName.value.trim(),
      phone: phone.value.trim(),
      address: address.value.trim()
    };

    // only add photo if available
    if (uploadedImageUrl && uploadedImageUrl !== "") {
      data.photoUrl = uploadedImageUrl;
    }

    // safer than updateDoc (prevents missing document error)
    await setDoc(doc(db, "users", currentUser.uid), data, {
      merge: true
    });

    alert("Profile updated successfully");

  } catch (err) {
    console.error("SAVE ERROR:", err);
    alert("Error saving profile");
  }
};