import { db } from "./firebase.js";

import {
collection,
getDocs,
doc,
updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* FIND NEAREST DRIVER */

export async function dispatchNearest(jobId,lat,lng){

const drivers=await getDocs(collection(db,"users"));

let nearest=null;
let minDist=999999;

drivers.forEach(d=>{

const data=d.data();

if(data.role!=="driver") return;

if(!data.lat || !data.lng) return;

const dist=Math.sqrt(
Math.pow(lat-data.lat,2)+
Math.pow(lng-data.lng,2)
);

if(dist<minDist){

minDist=dist;
nearest=d.id;

}

});

if(nearest){

await updateDoc(doc(db,"fares",jobId),{

status:"assigned",
dispatchType:"auto",
assignedTo:nearest,
currentDriverUID:nearest

});

}

}