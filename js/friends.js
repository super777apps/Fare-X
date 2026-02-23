import { db, auth } from "./firebase.js";
import {
  collection, query, where, onSnapshot,
  addDoc, getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");
const friendList = document.getElementById("friendList");

let currentUser = null;

/* ---------- AUTH ---------- */

onAuthStateChanged(auth, user => {
  if(!user) location.href="index.html";
  currentUser = user;
  loadFriends();
});

/* ---------- SEARCH DRIVERS ---------- */

searchInput.oninput = async () => {
  const text = searchInput.value.trim().toLowerCase();
  searchResults.innerHTML = "";
  if(text.length < 2) return;

  const snap = await getDocs(collection(db,"drivers"));

  snap.forEach(docSnap => {
    const d = docSnap.data();
    if(d.uid === currentUser.uid) return;

    const match =
      d.nickname?.toLowerCase().includes(text) ||
      d.email?.toLowerCase().includes(text) ||
      d.carNumber?.toLowerCase().includes(text);

    if(match){
      const div = document.createElement("div");
      div.className="fare-card";
      div.innerHTML=`
        <div class="fare-row"><span>Nick :</span><b>${d.nickname}</b></div>
        <div class="fare-row"><span>Car :</span><b>${d.carBrand} - ${d.carNumber}</b></div>
        <div class="fare-row"><span>Email :</span><b>${d.email}</b></div>
        <button class="lux-btn full" onclick="addFriend('${d.uid}','${d.nickname}','${d.email}')">Add Friend</button>
      `;
      searchResults.appendChild(div);
    }
  });
};

/* ---------- ADD FRIEND ---------- */

window.addFriend = async(uid,name,email) => {

  await addDoc(collection(db,"friends"),{
    owner: currentUser.uid,
    friendUID: uid,
    name: name,
    email: email
  });

  alert("Friend added successfully 🤝");
  loadFriends();
};

/* ---------- LOAD FRIEND LIST ---------- */

function loadFriends(){
  onSnapshot(
    query(collection(db,"friends"), where("owner","==",currentUser.uid)),
    snap => {
      friendList.innerHTML = "";
      snap.forEach(doc => {
        const f = doc.data();
        const div = document.createElement("div");
        div.className="fare-card";
        div.innerHTML=`
          <div class="fare-row"><span>Nick :</span><b>${f.name}</b></div>
          <div class="fare-row"><span>Email :</span><b>${f.email}</b></div>
        `;
        friendList.appendChild(div);
      });
    }
  );
}