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
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "farex_driver");

    const res = await fetch(
      "https://api.cloudinary.com/v1_1/dgvlsenks/image/upload",
      { method: "POST", body: formData }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || "Upload failed");
    }

    return data.secure_url;

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    alert("Image upload failed: " + err.message);
    return null;
  }
}

/* =========================
   AUTH
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
   SAVE PROFILE (ALL PHOTOS FIXED)
========================= */
document.getElementById("saveBtn").addEventListener("click", async () => {
  try {
    const ref = doc(db, "users", currentUser.uid);
    const oldData = (await getDoc(ref)).data() || {};

    // 🔥 KEEP OLD IMAGES
    let profilePhotoUrl = oldData.profilePhotoUrl || "";
    let licenceFrontUrl = oldData.licenceFrontUrl || "";
    let licenceBackUrl = oldData.licenceBackUrl || "";
    let taxiPhotoUrl = oldData.taxiPhotoUrl || "";
    let carRegPhotoUrl = oldData.carRegPhotoUrl || "";
    let carFrontPhotoUrl = oldData.carFrontPhotoUrl || "";

    // 🔥 ONLY UPLOAD IF NEW FILE SELECTED

    const profileFile = document.getElementById("profilePhoto").files[0];
    if (profileFile) profilePhotoUrl = await uploadToCloudinary(profileFile);

    const lf = document.getElementById("licenceFront").files[0];
    if (lf) licenceFrontUrl = await uploadToCloudinary(lf);

    const lb = document.getElementById("licenceBack").files[0];
    if (lb) licenceBackUrl = await uploadToCloudinary(lb);

    const taxi = document.getElementById("taxiPhoto").files[0];
    if (taxi) taxiPhotoUrl = await uploadToCloudinary(taxi);

    const reg = document.getElementById("carRegPhoto").files[0];
    if (reg) carRegPhotoUrl = await uploadToCloudinary(reg);

    const carFront = document.getElementById("carFrontPhoto").files[0];
    if (carFront) carFrontPhotoUrl = await uploadToCloudinary(carFront);

    await setDoc(ref, {
      nickName: document.getElementById("nickName").value,
      email: document.getElementById("email").value,
      firstName: document.getElementById("firstName").value,
      middleName: document.getElementById("middleName").value,
      
      mobileNumber: document.getElementById("mobileNumber").value,
      
      dob: document.getElementById("dob").value,
      resAddress: document.getElementById("resAddress").value,
      postalAddress: document.getElementById("postalAddress").value,
      licenceNo: document.getElementById("licenceNo").value,
      taxiLicence: document.getElementById("taxiLicence").value,
      carReg: document.getElementById("carReg").value,
      carMake: document.getElementById("carMake").value,
      carYear: document.getElementById("carYear").value,

      // 🔥 ALL IMAGES SAVED PROPERLY
      profilePhotoUrl,
      licenceFrontUrl,
      licenceBackUrl,
      taxiPhotoUrl,
      carRegPhotoUrl,
      carFrontPhotoUrl
    }, { merge: true });

    alert("Profile saved successfully");

  } catch (err) {
    console.error("SAVE ERROR:", err);
    alert("Error saving profile: " + err.message);
  }
});

/* =========================
   LOAD PROFILE (ALL IMAGES FIXED)
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
    
    document.getElementById("mobileNumber").value = data.mobileNumber || "";
    
    
    document.getElementById("dob").value = data.dob || "";
    document.getElementById("resAddress").value = data.resAddress || "";
    document.getElementById("postalAddress").value = data.postalAddress || "";
    document.getElementById("licenceNo").value = data.licenceNo || "";
    document.getElementById("taxiLicence").value = data.taxiLicence || "";
    document.getElementById("carReg").value = data.carReg || "";
    document.getElementById("carMake").value = data.carMake || "";
    document.getElementById("carYear").value = data.carYear || "";

    // 🔥 RESTORE ALL IMAGES
    if (data.profilePhotoUrl)
      document.getElementById("profilePhotoPreview").src = data.profilePhotoUrl;

    if (data.licenceFrontUrl)
      document.getElementById("licenceFrontPreview").src = data.licenceFrontUrl;

    if (data.licenceBackUrl)
      document.getElementById("licenceBackPreview").src = data.licenceBackUrl;

    if (data.taxiPhotoUrl)
      document.getElementById("taxiPhotoPreview").src = data.taxiPhotoUrl;

    if (data.carRegPhotoUrl)
      document.getElementById("carRegPhotoPreview").src = data.carRegPhotoUrl;

    if (data.carFrontPhotoUrl)
      document.getElementById("carFrontPhotoPreview").src = data.carFrontPhotoUrl;

  } catch (err) {
    console.error("LOAD ERROR:", err);
    alert("Error loading profile: " + err.message);
  }
}