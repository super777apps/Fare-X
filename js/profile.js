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
const dob = document.getElementById("dob");

const resAddress = document.getElementById("resAddress");
const postalAddress = document.getElementById("postalAddress");

const licenceNo = document.getElementById("licenceNo");
const taxiLicence = document.getElementById("taxiLicence");

const carReg = document.getElementById("carReg");
const carMake = document.getElementById("carMake");
const carYear = document.getElementById("carYear");

const saveBtn = document.getElementById("saveBtn");

let currentUser = null;

/* ---------- AUTH ---------- */
onAuthStateChanged(auth, async (user) => {

  if (!user) {
    location.href = "index.html";
    return;
  }

  currentUser = user;

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const d = snap.data();

    // save role locally (for back button)
    localStorage.setItem("role", d.role || "driver");

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
  }

});

/* ---------- SAVE ---------- */
saveBtn.onclick = async () => {

  if (!currentUser) return;

  try {

    await updateDoc(doc(db, "users", currentUser.uid), {

      firstName: firstName.value.trim(),
      middleName: middleName.value.trim(),
      dob: dob.value,

      resAddress: resAddress.value.trim(),
      postalAddress: postalAddress.value.trim(),

      licenceNo: licenceNo.value.trim(),
      taxiLicence: taxiLicence.value.trim(),

      carReg: carReg.value.trim(),
      carMake: carMake.value.trim(),
      carYear: carYear.value.trim()

    });

    alert("Profile updated successfully");

  } catch (err) {
    console.error(err);
    alert("Error saving profile");
  }

};