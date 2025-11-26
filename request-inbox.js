import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
  writeBatch, // Import writeBatch
  orderBy // Import orderBy
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

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

let currentUserID = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) return (window.location.href = "login.html");
  currentUserID = user.uid;

  // Start all listeners
  listenForIncomingRequests(currentUserID);
  listenForSentRequests(currentUserID);
  listenForConversations(currentUserID);
});

// --- 1. NEW: Real-time Conversations ---
function listenForConversations(uid) {
  const wrap = $("conversationsList");
  const noConversations = $("noConversations");

  // Listen to the 'chats' collection
  // Order by 'lastMessage.createdAt' to show the most recent chats first
  const q = query(
    collection(db, "chats"),
    where("members", "array-contains", uid),
    orderBy("lastMessage.createdAt", "desc") // This requires the chat.js update
  );

  onSnapshot(q, async (snap) => {
    if (snap.empty) {
      noConversations.style.display = "block";
      wrap.innerHTML = ""; // Clear any old items
      return;
    }

    noConversations.style.display = "none";
    wrap.innerHTML = ""; // Clear list for new snapshot

    for (const chatDoc of snap.docs) {
      const chatData = chatDoc.data();
      const otherUID = chatData.members.find((m) => m !== uid);
      if (!otherUID) continue;

      const userSnap = await getDoc(doc(db, "users", otherUID));
      const userData = userSnap.data() || {};
      
      const chatId = chatDoc.id; // The chat ID is needed for decryption
      let lastMsgText = "No messages yet.";
      
      if (chatData.lastMessage && chatData.lastMessage.text) {
        // Decrypt the last message
        const decrypted = decryptMessage(chatData.lastMessage.text, chatId);
        const prefix = chatData.lastMessage.sender === uid ? "You: " : "";
        lastMsgText = prefix + decrypted;
      }

      const card = document.createElement("a");
      card.href = `chat.html?uid=${otherUID}`;
      card.className =
        "flex items-center gap-4 p-4 border rounded-lg bg-white hover:bg-blue-50 transition shadow-sm";
      
      card.innerHTML = `
        <img src="${userData.profilePhotoURL || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'}"
             class="w-12 h-12 rounded-full border-2 border-blue-500">
        <div class="flex-1 overflow-hidden">
          <h3 class="font-bold text-gray-800">${userData.firstName || "Founder"} ${userData.lastName || ""}</h3>
          <p class="text-sm text-gray-600 truncate">${lastMsgText}</p>
        </div>
        <span class="text-blue-600 text-sm font-semibold">Chat →</span>
      `;
      wrap.appendChild(card);
    }
  });
}


// --- 2. Real-time Incoming Requests (FIXED) ---
function listenForIncomingRequests(uid) {
  const incomingWrap = $("incomingRequests");
  const noIncoming = $("noIncoming");

  // FIXED: Query 'connections' collection
  const incomingQ = query(
    collection(db, "connections"),
    where("to", "==", uid),
    where("status", "==", "pending")
  );

  onSnapshot(incomingQ, async (snap) => {
    if (snap.empty) {
      noIncoming.style.display = "block";
      incomingWrap.innerHTML = ""; // Clear
      return;
    }
    noIncoming.style.display = "none";
    incomingWrap.innerHTML = ""; // Clear

    for (const docSnap of snap.docs) {
      const req = docSnap.data();
      const senderSnap = await getDoc(doc(db, "users", req.from));
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
          <button class_name="accept-btn" class="bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700" data-id="${docSnap.id}">Accept</button>
          <button class_name="decline-btn" class="bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-600" data-id="${docSnap.id}">Decline</button>
        </div>
      `;
      incomingWrap.appendChild(card);
    }
  });
}

// --- 3. Real-time Sent Requests (FIXED) ---
function listenForSentRequests(uid) {
  const sentWrap = $("sentRequests");
  const noSent = $("noSent");

  // FIXED: Query 'connections' collection
  const sentQ = query(
    collection(db, "connections"),
    where("from", "==", uid),
    where("status", "==", "pending")
  );

  onSnapshot(sentQ, async (snap) => {
    if (snap.empty) {
      noSent.style.display = "block";
      sentWrap.innerHTML = ""; // Clear
      return;
    }
    noSent.style.display = "none";
    sentWrap.innerHTML = ""; // Clear

    for (const docSnap of snap.docs) {
      const req = docSnap.data();
      const receiverSnap = await getDoc(doc(db, "users", req.to));
      const receiver = receiverSnap.data() || {};

      const card = document.createElement("div");
      card.className = "border rounded-lg p-4 bg-white shadow-sm";
      card.innerHTML = `
        <h3 class="font-bold text-gray-800">${receiver.firstName || "Unnamed Founder"}</h3>
        <p class="text-gray-600 text-sm">${receiver.industry || "No industry"} • ${receiver.location || "Unknown"}</p>
        <p class="text-blue-600 font-semibold text-sm mt-1">Pending...</p>
      `;
      sentWrap.appendChild(card);
    }
  });
}

// --- 4. Accept / Decline Actions (FIXED) ---
$("incomingRequests").addEventListener("click", async (e) => {
  const reqId = e.target.dataset.id;
  if (!reqId) return;

  const reqRef = doc(db, "connections", reqId);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) return;
  
  const reqData = reqSnap.data();
  const connectionId = [reqData.from, reqData.to].sort().join("_");

  // Use a batch write for atomicity
  const batch = writeBatch(db);

  if (e.target.classList.contains("accept-btn")) {
    // 1. Update request status
    batch.update(reqRef, { status: "accepted" });

    // 2. Create connection doc
    const connectionRef = doc(db, "connections", connectionId);
    batch.set(connectionRef, {
      members: [reqData.from, reqData.to],
      createdAt: serverTimestamp(),
    });

    // 3. Create chat doc
    const chatRef = doc(db, "chats", connectionId);
    batch.set(chatRef, {
      members: [reqData.from, reqData.to],
      createdAt: serverTimestamp(),
      typing: {
        [reqData.from]: false,
        [reqData.to]: false
      },
      lastMessage: { // Initialize lastMessage
        text: "",
        sender: "",
        createdAt: serverTimestamp() 
      }
    });

    // 4. (Optional but good) Increment counters - This part is complex in batches
    // We'll skip it for simplicity, but know that dashboard.js logic does this.

    await batch.commit();
    alert("✅ Connection accepted!");

  } else if (e.target.classList.contains("decline-btn")) {
    await updateDoc(reqRef, { status: "declined" });
    alert("❌ Request declined.");
  }
});


// --- 5. Decryption Helper (Copied from chat.js) ---
function decryptMessage(ciphertext, secretKey) {
  if (!ciphertext) return "";
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    console.error("Decryption failed:", e);
    return "Encrypted message";
  }
}