import { db } from "./firebase.js";

import {
collection,
getDocs,
doc,
updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function dispatchNearest(jobId,lat,lng){

const drivers=await getDocs(collection(db,"users"));

let nearest=null;
let min=999999;

drivers.forEach(d=>{
const u=d.data();

if(!u.lat || !u.lng) return;

const dist=Math.sqrt((lat-u.lat)**2+(lng-u.lng)**2);

if(dist<min){
min=dist;
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