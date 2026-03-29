import { db, auth } from "./firebase.js";
import {
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;

/* =========================
   CLOUDINARY UPLOAD (FIXED)
========================= */
async function uploadToCloudinary(file) {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "farex_driver");

    const response = await fetch(
      "https://api.cloudinary.com/v1_1/dgvlsenks/image/upload",
      {
        method: "POST",
        body: formData
      }
    );

    const data = await response.json();

    console.log("Cloudinary response:", data);

    if (!response.ok) {
      throw new Error(data.error?.message || "Cloudinary upload failed");
    }

    return data.secure_url;

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    alert("Image upload failed: " + err.message);
    return null;
  }
}

/* =========================
   AUTH CHECK
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
   SAVE PROFILE
========================= */
document.getElementById("saveBtn").addEventListener("click", async () => {
  try {
    const ref = doc(db, "users", currentUser.uid);
    const oldData = (await getDoc(ref)).data() || {};

    let profilePhotoUrl = oldData.profilePhotoUrl || "";

    const file = document.getElementById("profilePhoto").files[0];

    // 🔥 ONLY UPLOAD IF FILE EXISTS
    if (file) {
      const uploaded = await uploadToCloudinary(file);
      if (uploaded) {
        profilePhotoUrl = uploaded;
      } else {
        alert("Profile NOT saved because image upload failed.");
        return;
      }
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

      profilePhotoUrl: profilePhotoUrl
    }, { merge: true });

    alert("Profile saved successfully");

  } catch (err) {
    console.error("SAVE ERROR:", err);
    alert("Error saving profile: " + err.message);
  }
});

/* =========================
   LOAD PROFILE
========================= */
async function loadProfile() {
  try {
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

    // 🔥 IMAGE RESTORE FIX
    if (data.profilePhotoUrl) {
      document.getElementById("profilePhotoPreview").src = data.profilePhotoUrl;
    }

  } catch (err) {
    console.error("LOAD ERROR:", err);
    alert("Error loading profile: " + err.message);
  }
}