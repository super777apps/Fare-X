import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDU3NEj9mXQdHRP9VZ-yfm-XPaKi_QM4q4",
  authDomain: "fare-x.firebaseapp.com",
  projectId: "fare-x",
  storageBucket: "fare-x.firebasestorage.app",
  messagingSenderId: "168549300024",
  appId: "1:168549300024:web:c553faf10ef72bc474b3cd"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);