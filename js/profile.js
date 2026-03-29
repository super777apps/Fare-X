import { db, auth } from "./firebase.js";
import {
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;

/* =========================
   CLOUDINARY UPLOAD
========================= */
async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "farex_driver"); // your preset

  const res = await fetch("https://api.cloudinary.com/v1_1/dgvlsenks/image/upload", {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  return data.secure_url;
}

/* =========================
   AUTH + LOAD PROFILE
========================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "index.html";
    return;
  }

  currentUser = user;
  await loadProfile();
});

/* =========================
   SAVE PROFILE (FIXED)
========================= */
document.getElementById("saveBtn").addEventListener("click", async () => {
  if (!currentUser) return;

  const ref = doc(db, "users", currentUser.uid);
  const oldData = (await getDoc(ref)).data() || {};

  const profileFile = document.getElementById("profilePhoto").files[0];

  let profilePhotoUrl = oldData.profilePhotoUrl || "";

  // 🔥 ONLY UPLOAD IF NEW FILE SELECTED
  if (profileFile) {
    profilePhotoUrl = await uploadToCloudinary(profileFile);
  }

  await setDoc(ref, {
    nickName: document.getElementById("nickName").value,
    email: document.getElementById("email").value,
    firstName: document.getElementById("firstName").value,
    middleName: document.getElementById("middleName").value,
    dob: document.getElementById("dob").value,
    resAddress: document.getElementById("resAddress").value,
    postalAddress: document.getElementById("postalAddress").value,
    licenceNo: document.getElementById("licenceNo").value,
    taxiLicence: document.getElementById("taxiLicence").value,
    carReg: document.getElementById("carReg").value,
    carMake: document.getElementById("carMake").value,
    carYear: document.getElementById("carYear").value,

    // 🔥 ONLY UPDATE IF EXISTS
    profilePhotoUrl: profilePhotoUrl
  }, { merge: true });

  alert("Profile saved");
});

/* =========================
   LOAD PROFILE (FIXED)
========================= */
async function loadProfile() {
  const ref = doc(db, "users", currentUser.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const data = snap.data();

  document.getElementById("nickName").value = data.nickName || "";
  document.getElementById("email").value = data.email || "";
  document.getElementById("firstName").value = data.firstName || "";
  document.getElementById("middleName").value = data.middleName || "";
  document.getElementById("dob").value = data.dob || "";
  document.getElementById("resAddress").value = data.resAddress || "";
  document.getElementById("postalAddress").value = data.postalAddress || "";
  document.getElementById("licenceNo").value = data.licenceNo || "";
  document.getElementById("taxiLicence").value = data.taxiLicence || "";
  document.getElementById("carReg").value = data.carReg || "";
  document.getElementById("carMake").value = data.carMake || "";
  document.getElementById("carYear").value = data.carYear || "";

  // 🔥 IMAGE RESTORE
  if (data.profilePhotoUrl) {
    document.getElementById("profilePhotoPreview").src = data.profilePhotoUrl;
  }
}