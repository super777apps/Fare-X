import { db, auth } from "./firebase.js";

import {
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* CLOUDINARY */
const CLOUD_NAME = "dgvlsenks";
const UPLOAD_PRESET = "farex_driver";

/* ---------- ELEMENTS ---------- */
const nickName = document.getElementById("nickName");
const emailField = document.getElementById("email");

const firstName = document.getElementById("firstName");
const middleName = document.getElementById("middleName");
const dob = document.getElementById("dob");

const resAddress = document.getElementById("resAddress");
const postalAddress = document.getElementById("postalAddress");

const licenceNo = document.getElementById("licenceNo");
const taxiLicence = document.getElementById("taxiLicence");

const carReg = document.getElementById("carReg");
const carMake = document.getElementById("carMake");
const carYear = document.getElementById("carYear");

const saveBtn = document.getElementById("saveBtn");

/* ---------- PHOTO INPUTS ---------- */
const photos = {
  profilePhoto: document.getElementById("profilePhoto"),
  licenceFront: document.getElementById("licenceFront"),
  licenceBack: document.getElementById("licenceBack"),
  taxiPhoto: document.getElementById("taxiPhoto"),
  carRegPhoto: document.getElementById("carRegPhoto"),
  carFrontPhoto: document.getElementById("carFrontPhoto")
};

let currentUser = null;
let uploaded = {};

/* ---------- IMAGE PREVIEW WHEN SELECT ---------- */
Object.keys(photos).forEach(key => {
  const input = photos[key];
  const preview = document.getElementById(key + "Preview");

  if (!input || !preview) return;

  input.addEventListener("change", () => {
    const file = input.files[0];
    if (file) {
      preview.src = URL.createObjectURL(file);
    }
  });
});

/* ---------- UPLOAD TO CLOUDINARY ---------- */
async function uploadImage(file){
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  return data.secure_url;
}

/* ---------- AUTH ---------- */
onAuthStateChanged(auth, async (user) => {

  if (!user) {
    location.href = "index.html";
    return;
  }

  currentUser = user;

  // show email
  emailField.value = user.email || "";

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {

    const d = snap.data();

    // save role for back button
    localStorage.setItem("role", d.role || "driver");

    /* ---------- LOAD TEXT DATA ---------- */
    nickName.value = d.nickName || "";
    firstName.value = d.firstName || "";
    middleName.value = d.middleName || "";
    dob.value = d.dob || "";

    resAddress.value = d.resAddress || "";
    postalAddress.value = d.postalAddress || "";

    licenceNo.value = d.licenceNo || "";
    taxiLicence.value = d.taxiLicence || "";

    carReg.value = d.carReg || "";
    carMake.value = d.carMake || "";
    carYear.value = d.carYear || "";

    /* ---------- ✅ FIX: LOAD SAVED IMAGES ---------- */
    if (d.profilePhoto) {
      document.getElementById("profilePhotoPreview").src = d.profilePhoto;
    }
    if (d.licenceFront) {
      document.getElementById("licenceFrontPreview").src = d.licenceFront;
    }
    if (d.licenceBack) {
      document.getElementById("licenceBackPreview").src = d.licenceBack;
    }
    if (d.taxiPhoto) {
      document.getElementById("taxiPhotoPreview").src = d.taxiPhoto;
    }
    if (d.carRegPhoto) {
      document.getElementById("carRegPhotoPreview").src = d.carRegPhoto;
    }
    if (d.carFrontPhoto) {
      document.getElementById("carFrontPhotoPreview").src = d.carFrontPhoto;
    }
  }

});

/* ---------- SAVE PROFILE ---------- */
saveBtn.onclick = async () => {

  if (!currentUser) return;

  try {

    /* ---------- UPLOAD NEW IMAGES ---------- */
    for (const key in photos) {

      const file = photos[key]?.files[0];

      if (file) {
        uploaded[key] = await uploadImage(file);
      }
    }

    /* ---------- SAVE TO FIRESTORE ---------- */
    await updateDoc(doc(db, "users", currentUser.uid), {

      nickName: nickName.value.trim(),

      firstName: firstName.value.trim(),
      middleName: middleName.value.trim(),
      dob: dob.value,

      resAddress: resAddress.value.trim(),
      postalAddress: postalAddress.value.trim(),

      licenceNo: licenceNo.value.trim(),
      taxiLicence: taxiLicence.value.trim(),

      carReg: carReg.value.trim(),
      carMake: carMake.value.trim(),
      carYear: carYear.value.trim(),

      ...uploaded

    });

    alert("Profile updated successfully");

  } catch (err) {
    console.error(err);
    alert("Error saving profile");
  }

};