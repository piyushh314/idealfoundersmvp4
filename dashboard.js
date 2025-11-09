import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  setDoc,
  serverTimestamp,
  writeBatch, // Import writeBatch for atomic operations
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

// --- FIREBASE CONFIG (No change) ---
const firebaseConfig = {
  apiKey: "AIzaSyAnvgH3asfAzdpfCJPS-tgS_LUYAlh8xmw",
  authDomain: "idealfounders.firebaseapp.com",
  projectId: "idealfounders",
  storageBucket: "idealfounders.firebasestorage.app",
  messagingSenderId: "52308573645",
  appId: "1:52308573645:web:c33f8ada45600f47645884"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const $ = (id) => document.getElementById(id);

onAuthStateChanged(auth, async (user) => {
  if (!user) return (window.location.href = "login.html");

  $("userName").textContent = user.displayName || "Founder";

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return (window.location.href = "profile-setup.html");

  const data = snap.data();
  $("fullName").textContent = `${data.firstName || ""} ${data.lastName || ""}` || "Founder";
  $("email").textContent = data.email || user.email;
  $("location").textContent = data.location || "—";
  $("interestsTopics").textContent = data.interestsTopics || "—";
  $("responsibilities").textContent = data.responsibilities || "—";
  $("connectionsCount").textContent = data.connectionsCount || 0;
  if (data.profilePhotoURL) $("userPhoto").src = data.profilePhotoURL;

  // Load sections
  loadRecentFounders(user.uid);
  listenForConnections(user.uid);
  listenForIncomingRequests(user.uid);
  listenForSentRequests(user.uid);
});

// 🔹 Real-time incoming requests (Updated to use 'connectionRequests')
function listenForIncomingRequests(uid) {
  const incomingList = $("incomingList");
  const empty = $("incomingEmpty");
  const badge = $("navReqBadge");

  // UPDATED: Query 'connectionRequests' collection
  const q = query(
    collection(db, "connectionRequests"),
    where("receiver", "==", uid), // Use 'receiver'
    where("status", "==", "pending")
  );

  onSnapshot(q, async (snapshot) => {
    // Clear list, but keep the 'empty' node template
    const nodesToKeep = [empty];
    incomingList.childNodes.forEach(child => {
        if (!nodesToKeep.includes(child)) {
            incomingList.removeChild(child);
        }
    });

    if (snapshot.empty) {
      empty.style.display = "block";
      badge.classList.add("hidden");
      badge.textContent = "0";
      return;
    }

    empty.style.display = "none";
    badge.classList.remove("hidden");
    badge.textContent = snapshot.size;

    for (const docSnap of snapshot.docs) {
      const req = docSnap.data();
      const senderSnap = await getDoc(doc(db, "users", req.sender)); // Use 'sender'
      const sender = senderSnap.data() || {};

      const card = document.createElement("div");
      card.className =
        "border rounded-lg p-4 bg-gray-50 flex justify-between items-center shadow-sm";
      card.innerHTML = `
        <div>
          <h3 class="font-bold text-gray-800">${sender.firstName || "Unnamed Founder"}</h3>
          <p class="text-gray-600 text-sm">${sender.industry || "No industry"} • ${sender.location || "Unknown"}</p>
        </div>
        <div class="flex gap-2">
          <button class="bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700" data-accept="${docSnap.id}">Accept</button>
          <button class="bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-600" data-decline="${docSnap.id}">Decline</button>
        </div>
      `;
      incomingList.appendChild(card);
    }
  });

  // 🔹 Accept/Decline logic (Updated for new schema)
  incomingList.addEventListener("click", async (e) => {
    const id = e.target.dataset.accept || e.target.dataset.decline;
    if (!id) return;

    // Get the request from 'connectionRequests'
    const reqRef = doc(db, "connectionRequests", id);
    const reqSnap = await getDoc(reqRef);
    if (!reqSnap.exists()) return;

    const req = reqSnap.data();

    if (e.target.dataset.accept) {
      const connectionId = [req.sender, req.receiver].sort().join("_");

      // Use a batch write to make this atomic
      const batch = writeBatch(db);

      // 1. Update the request status
      batch.update(reqRef, { status: "accepted" });

      // 2. Create the connection document
      const connectionRef = doc(db, "connections", connectionId);
      batch.set(connectionRef, {
        members: [req.sender, req.receiver],
        createdAt: serverTimestamp(),
      });

      // 3. ⭐ Create the chat document
      const chatRef = doc(db, "chats", connectionId);
      batch.set(chatRef, {
        members: [req.sender, req.receiver],
        createdAt: serverTimestamp(),
        // Fields for typing indicator
        typing: {
          [req.sender]: false,
          [req.receiver]: false
        }
      });

      // 4. Increment connectionsCount (This requires reading first, so can't be in batch)
      // Note: For production, use a Cloud Function to increment counters reliably.
      // Simple client-side increment (can fail, but good for now):
      try {
          const senderDoc = await getDoc(doc(db, "users", req.sender));
          const receiverDoc = await getDoc(doc(db, "users", req.receiver));
          
          const senderCount = (senderDoc.data().connectionsCount || 0) + 1;
          const receiverCount = (receiverDoc.data().connectionsCount || 0) + 1;

          batch.update(doc(db, "users", req.sender), { connectionsCount: senderCount });
          batch.update(doc(db, "users", req.receiver), { connectionsCount: receiverCount });

      } catch (err) {
          console.error("Could not increment counts", err);
      }
      
      // Commit the batch
      await batch.commit();
      alert("✅ Connection accepted! Chat room created.");

    } else if (e.target.dataset.decline) {
      await updateDoc(reqRef, { status: "declined" });
      alert("❌ Request declined.");
    }
  });
}

// 🔹 Real-time sent requests (Updated to use 'connectionRequests')
function listenForSentRequests(uid) {
  const sentList = $("sentList");
  const empty = $("sentEmpty");

  // UPDATED: Query 'connectionRequests' collection
  const q = query(
    collection(db, "connectionRequests"),
    where("sender", "==", uid), // Use 'sender'
    where("status", "==", "pending")
  );

  onSnapshot(q, async (snapshot) => {
    // Clear list, but keep the 'empty' node template
    const nodesToKeep = [empty];
    sentList.childNodes.forEach(child => {
        if (!nodesToKeep.includes(child)) {
            sentList.removeChild(child);
        }
    });
    
    if (snapshot.empty) {
      empty.style.display = "block";
      return;
    }

    empty.style.display = "none";

    for (const docSnap of snapshot.docs) {
      const req = docSnap.data();
      const receiverSnap = await getDoc(doc(db, "users", req.receiver)); // Use 'receiver'
      const receiver = receiverSnap.data() || {};

      const card = document.createElement("div");
      card.className = "border rounded-lg p-4 bg-white shadow-sm";
      card.innerHTML = `
        <h3 class="font-bold text-gray-800">${receiver.firstName || "Unnamed Founder"}</h3>
        <p class="text-gray-600 text-sm">${receiver.industry || "No industry"} • ${receiver.location || "Unknown"}</p>
        <p class="text-blue-600 font-semibold text-sm mt-1">Pending...</p>
      `;
      sentList.appendChild(card);
    }
  });
}

// 🔹 Real-time connections (This function was already correct)
function listenForConnections(uid) {
  const wrap = $("connectionsList");
  const empty = $("connectionsEmpty");
  const count = $("connectionsCount");

  const q = query(collection(db, "connections"), where("members", "array-contains", uid));
  onSnapshot(q, async (snap) => {
    wrap.innerHTML = "";
    if (snap.empty) {
      empty.style.display = "block";
      count.textContent = "0";
      return;
    }

    empty.style.display = "none";
    count.textContent = snap.size;

    for (const docu of snap.docs) {
      const c = docu.data();
      const other = c.members.find((m) => m !== uid);
      const otherSnap = await getDoc(doc(db, "users", other));
      const o = otherSnap.data() || {};

      const div = document.createElement("div");
      div.className =
        "bg-white border border-gray-200 rounded-xl p-4 flex justify-between items-center";
      div.innerHTML = `
        <div>
          <p class="font-semibold text-gray-800">${o.firstName || o.fullName || "Founder"}</p>
          <p class="text-sm text-gray-600">${o.industry || ""} • ${o.location || ""}</p>
        </div>
        <div class="flex gap-2">
          <a class="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
             href="chat.html?uid=${other}">💬 Chat</a>
          <a class="bg-white border border-blue-500 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50"
             href="public-profile.html?uid=${other}">View</a>
        </div>
      `;
      wrap.appendChild(div);
    }
  });
}

// 🔹 Recently Joined Founders (No change needed)
async function loadRecentFounders(myUid) {
  const wrap = $("recentFounders");
  const loading = $("recentLoading");

  const qSnap = await getDocs(query(collection(db, "users"), orderBy("updatedAt", "desc"), limit(6)));
  loading.style.display = "none";

  if (qSnap.empty) {
    wrap.innerHTML = `<p class="col-span-3 text-gray-500 text-sm text-center">No founders yet 🚀</p>`;
    return;
  }

  qSnap.forEach((d) => {
    if (d.id === myUid) return;
    const user = d.data();

    const div = document.createElement("div");
    div.className =
      "bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition text-center";
    div.innerHTML = `
      <img src="${user.profilePhotoURL || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"}"
           class="w-16 h-16 mx-auto rounded-full border-2 border-blue-500 mb-3">
      <h3 class="font-semibold text-gray-800">${user.firstName || user.fullName || "Founder"}</h3>
      <p class="text-sm text-gray-600">${user.location || "Unknown"}</p>
      <p class="text-xs text-gray-500 mt-1">${user.interestsTopics || "—"}</p>
      <a href="public-profile.html?uid=${d.id}"
         class="inline-block mt-3 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
         View Profile →
      </a>
    `;
    wrap.appendChild(div);
  });
}

// 🔹 Logout (No change needed)
$("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = "index.html";
});