import { db, auth } from "./firebase.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const fullName = document.getElementById("fullName");
const emailInput = document.getElementById("email");
const mobile = document.getElementById("mobile");
const nickname = document.getElementById("nickname");
const carNumber = document.getElementById("carNumber");
const carBrand = document.getElementById("carBrand");
const saveBtn = document.getElementById("saveProfileBtn");
const logoutBtn = document.getElementById("logoutBtn");

let currentUser = null;

// ------------------- AUTH CHECK -------------------
onAuthStateChanged(auth, async user => {
  if(!user){
    window.location.href = "index.html";
    return;
  }
  currentUser = user;

  // Load existing profile if exists
  const driverDoc = doc(db,"drivers",user.uid);
  const snap = await getDoc(driverDoc);
  if(snap.exists()){
    const data = snap.data();
    fullName.value = data.fullName || "";
    emailInput.value = data.email || "";
    mobile.value = data.mobile || "";
    nickname.value = data.nickname || "";
    carNumber.value = data.carNumber || "";
    carBrand.value = data.carBrand || "";
  }
});

// ------------------- SAVE PROFILE -------------------
saveBtn.onclick = async () => {
  const full = fullName.value.trim();
  const em = emailInput.value.trim();
  const mob = mobile.value.trim();
  const nick = nickname.value.trim();
  const carNum = carNumber.value.trim();
  const carBr = carBrand.value.trim();

  if(!full || !em || !mob || !nick || !carNum || !carBr){
    return alert("Please complete all fields!");
  }

  try{
    await setDoc(doc(db,"drivers",currentUser.uid), {
      uid: currentUser.uid,
      fullName: full,
      email: em,
      mobile: mob,
      nickname: nick,
      carNumber: carNum,
      carBrand: carBr,
      updatedAt: serverTimestamp()
    }, { merge: true });

    alert("Profile saved successfully 🚀");
    window.location.href = "dashboard.html";

  }catch(err){
    alert("Failed to save profile: " + err.message);
  }
};

// ------------------- LOGOUT -------------------
logoutBtn.onclick = async () => {
  try{
    await signOut(auth);
    window.location.href = "index.html";
  }catch(err){
    alert("Logout failed: " + err.message);
  }
};