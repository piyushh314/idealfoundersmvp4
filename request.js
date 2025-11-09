import { getFirestore, collection, query, where, getDocs, updateDoc, doc } 
from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

const db = getFirestore();
const auth = getAuth();

async function loadRequests() {
  const user = auth.currentUser;
  const q = query(collection(db, "connections"), where("to", "==", user.uid), where("status", "==", "pending"));
  const results = await getDocs(q);

  const container = document.getElementById("requestsList");
  container.innerHTML = "";

  results.forEach((req) => {
    const data = req.data();

    container.innerHTML += `
      <div class="p-4 bg-white rounded shadow mb-2">
        New Request from: <b>${data.from}</b>
        <button onclick="accept('${req.id}')" class="ml-3 bg-green-600 text-white px-3 py-1 rounded">Accept</button>
        <button onclick="rejectReq('${req.id}')" class="ml-2 bg-red-600 text-white px-3 py-1 rounded">Reject</button>
      </div>
    `;
  });
}

window.accept = async (id) => {
  await updateDoc(doc(db, "connections", id), { status: "accepted" });
  alert("✅ Connection accepted");
  loadRequests();
};

window.rejectReq = async (id) => {
  await updateDoc(doc(db, "connections", id), { status: "rejected" });
  alert("❌ Request rejected");
  loadRequests();
};

auth.onAuthStateChanged(() => loadRequests());
 