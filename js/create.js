import { db, auth } from "./firebase.js";

import {
collection,
addDoc,
query,
where,
getDocs,
serverTimestamp,
doc,
getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser=null;
let role="driver";

const driverSelect=document.getElementById("friendSelect");
const btn=document.getElementById("createFareBtn");


onAuthStateChanged(auth,async user=>{

if(!user){
location.href="index.html";
return;
}

currentUser=user;

const userDoc=await getDoc(doc(db,"users",user.uid));

if(userDoc.exists()){
role=userDoc.data().role || "driver";
}

loadDrivers();

});


async function loadDrivers(){

const q=query(
collection(db,"users"),
where("role","==","driver")
);

const snap=await getDocs(q);

driverSelect.innerHTML='<option value="">Select Driver</option>';

snap.forEach(d=>{

const opt=document.createElement("option");

opt.value=d.id;
opt.textContent=d.data().nickname || d.data().email;

driverSelect.appendChild(opt);

});

}


btn.onclick=async()=>{

const pickup=document.getElementById("pickup").value;
const drop=document.getElementById("drop").value;
const price=document.getElementById("price").value;

const selectedDriver=driverSelect.value;

if(!selectedDriver){
alert("Select driver");
return;
}


await addDoc(collection(db,"fares"),{

pickup,
drop,
price,

createdByUID:currentUser.uid,
createdByRole:role,

originalDriverUID:selectedDriver,
currentDriverUID:selectedDriver,

status:"assigned",
dispatchType:"direct",

createdAt:serverTimestamp()

});

alert("Job created");

location.href="dashboard.html";

};