// KEEP ALL YOUR CODE ABOVE SAME

/* ---------- JOB LISTENER ---------- */
function listenJobs() {

  const box = document.getElementById("jobList");

  let q = query(collection(db, "fares")); // ✅ NO FILTER (important)

  onSnapshot(q, snap => {

    box.innerHTML = "";

    if (snap.empty) {
      box.innerHTML = `<div class="gold">No jobs found</div>`;
      return;
    }

    snap.forEach(d => {

      const f = d.data();

      const isAssigned = f.assignedTo === currentUser.uid; // ✅ NEW
      const isMine = f.currentDriverUID === currentUser.uid;

      const div = document.createElement("div");
      div.className = "fare-card";

      /* 🔊 SOUND FOR ASSIGNED DRIVER */
      if (isAssigned && f.status === "waiting response" && !f.soundPlayed) {

        jobSound.loop = true;
        jobSound.play();

        setTimeout(()=>{
          jobSound.pause();
          jobSound.currentTime = 0;
        },12000);

        updateDoc(doc(db,"fares",d.id),{
          soundPlayed:true
        });
      }

      div.innerHTML = `
        <div class="fare-row"><span>Pickup:</span><b>${f.pickup}</b></div>
        <div class="fare-row"><span>Drop:</span><b>${f.drop}</b></div>
        <div class="fare-row"><span>Status:</span><b>${f.status}</b></div>
        <div class="fare-row"><span>Passenger:</span><b>${f.passengerName || "-"}</b></div>
        <div class="fare-row"><span>Original Driver:</span><b>${f.originalDriverName || "-"}</b></div>

        ${renderActions(d.id, f, isMine, isAssigned)}
      `;

      box.appendChild(div);
    });

  });
}

/* ---------- ACTIONS ---------- */
function renderActions(id, f, isMine, isAssigned) {

  const viewBtn = `<button class="lux-btn" onclick="viewRoute('${id}')">View Route</button>`;

  if (isAssigned && f.status === "waiting response") {
    return `
      ${viewBtn}
      <div class="fare-actions">
        <button class="accept-btn" onclick="acceptJob('${id}')">Accept</button>
        <button class="cancel-btn" onclick="rejectJob('${id}')">Reject</button>
      </div>
    `;
  }

  return viewBtn;
}

/* ---------- HANDLERS ---------- */
window.acceptJob = async (id) => {

  const snap = await getDoc(doc(db,"fares",id));
  const f = snap.data();

  const userSnap = await getDoc(doc(db,"users",currentUser.uid));
  const myName = userSnap.data().nickName || currentUser.email;

  await updateDoc(doc(db,"fares",id),{
    status:"accepted",
    currentDriverUID: currentUser.uid,
    currentDriverName: myName,
    assignedTo:null
  });

  jobSound.pause();
  acceptSound.play();
};

window.rejectJob = async (id) => {

  const snap = await getDoc(doc(db,"fares",id));
  const f = snap.data();

  await updateDoc(doc(db,"fares",id),{
    status:"returned",
    currentDriverUID: f.originalDriverUID,
    currentDriverName: f.originalDriverName,
    assignedTo:null,
    soundPlayed:false
  });

  jobSound.pause();
  declineSound.play();
};