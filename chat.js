import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

// --- FIREBASE CONFIG (Same as dashboard) ---
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

let currentUser = null;
let otherUserUID = null;
let chatId = null;
let typingTimeout = null;

// --- 1. AUTHENTICATION & SETUP ---
onAuthStateChanged(auth, async (user) => {
  if (!user) return (window.location.href = "login.html");
  currentUser = user;

  otherUserUID = new URLSearchParams(window.location.search).get("uid");
  if (!otherUserUID) {
    alert("Error: No user specified.");
    return (window.location.href = "dashboard.html");
  }

  chatId = [currentUser.uid, otherUserUID].sort().join("_");

  loadOtherUserInfo();
  checkConnection(); // This function will now handle everything
});

// --- 2. LOAD OTHER USER'S INFO ---
async function loadOtherUserInfo() {
  const userSnap = await getDoc(doc(db, "users", otherUserUID));
  if (!userSnap.exists()) {
    alert("Error: User does not exist.");
    return (window.location.href = "dashboard.html");
  }
  const userData = userSnap.data();
  $("chatUserName").textContent = `${userData.firstName || ""} ${userData.lastName || ""}`;
  if (userData.profilePhotoURL) $("chatUserPhoto").src = userData.profilePhotoURL;
  $("viewProfileBtn").href = `public-profile.html?uid=${otherUserUID}`;
}

// --- 3. CHECK CONNECTION & CHAT DOC (Updated) ---
async function checkConnection() {
  const connectionRef = doc(db, "connections", chatId);
  const connectionSnap = await getDoc(connectionRef);

  if (!connectionSnap.exists()) {
    // Not connected, block chat
    $("messageList").innerHTML = `
      <div class="flex justify-center items-center h-full">
        <p class="text-gray-500 bg-gray-200 p-4 rounded-lg">
          You must be connected to this founder to chat.
        </p>
      </div>`;
    $("messageForm").style.display = "none"; // Hide input
  } else {
    // They are connected. NOW check if the chat doc exists.
    const chatRef = doc(db, "chats", chatId);
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
      console.warn("Chat document missing. Creating one now...");
      // Create the chat doc to enable typing/messaging
      try {
        await setDoc(chatRef, {
          members: [currentUser.uid, otherUserUID],
          createdAt: serverTimestamp(),
          typing: {
            [currentUser.uid]: false,
            [otherUserUID]: false
          },
          // Initialize lastMessage for the inbox
          lastMessage: {
            text: "",
            sender: "",
            createdAt: serverTimestamp()
          }
        });
      } catch (err) {
        console.error("Failed to create chat doc:", err);
        alert("Error initializing chat room.");
        return;
      }
    }

    // Now it's safe to start all listeners
    listenForMessages();
    listenForTyping();
    setupMessageForm();
  }
}

// --- 4. REAL-TIME MESSAGE LISTENER ---
function listenForMessages() {
  const messageList = $("messageList");
  const messagesRef = collection(db, "chats", chatId, "messages");
  const q = query(messagesRef, orderBy("createdAt"));

  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      messageList.innerHTML = `<p class="text-gray-500 text-center text-sm">No messages yet. Say hello! 👋</p>`;
      return;
    }

    messageList.innerHTML = ""; // Clear list
    snapshot.forEach((docSnap) => {
      const message = docSnap.data();
      const isMe = message.sender === currentUser.uid;

      const decryptedText = decryptMessage(message.text, chatId);

      const messageEl = document.createElement("div");
      messageEl.className = `flex ${isMe ? "justify-end" : "justify-start"}`;
      messageEl.innerHTML = `
        <div class="max-w-xs lg:max-w-md p-3 rounded-2xl ${
          isMe
            ? "bg-blue-600 text-white rounded-br-none"
            : "bg-white text-gray-800 rounded-bl-none shadow-sm border"
        }">
          <p class="text-sm">${decryptedText.replace(/\n/g, '<br>')}</p>
        </div>
      `;
      messageList.appendChild(messageEl);
    });

    messageList.scrollTop = messageList.scrollHeight;
  });
}

// --- 5. REAL-TIME TYPING INDICATOR ---
function listenForTyping() {
  const typingIndicator = $("typingIndicator");
  const chatDocRef = doc(db, "chats", chatId);

  onSnapshot(chatDocRef, (docSnap) => {
    if (!docSnap.exists()) return; // Should not happen due to checkConnection
    const typingData = docSnap.data().typing;

    if (typingData && typingData[otherUserUID]) {
      typingIndicator.textContent = "typing...";
    } else {
      typingIndicator.textContent = "";
    }
  });
}

// --- 6. MESSAGE FORM & SENDING LOGIC (***UPDATED***) ---
function setupMessageForm() {
  const form = $("messageForm");
  const input = $("messageInput");
  const sendBtn = $("sendBtn");

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${input.scrollHeight}px`;
    handleTyping();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event("submit"));
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const messageText = input.value.trim();
    if (!messageText) return;

    const encryptedText = encryptMessage(messageText, chatId);
    const messagesRef = collection(db, "chats", chatId, "messages");

    try {
      sendBtn.disabled = true;
      
      // 1. Add the new message to the subcollection
      await addDoc(messagesRef, {
        sender: currentUser.uid,
        text: encryptedText,
        createdAt: serverTimestamp(),
      });

      // 2. ***THIS IS THE UPDATE***
      // Update the parent chat document with the last message
      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: {
          text: encryptedText, // Store the encrypted text
          sender: currentUser.uid,
          createdAt: serverTimestamp() // Use server time
        }
      });

      // 3. Reset the form
      input.value = "";
      input.style.height = "auto";
      sendBtn.disabled = false;
      
    } catch (err) {
      console.error("Error sending message or updating lastMessage:", err);
      alert("Error: Could not send message.");
      sendBtn.disabled = false;
    }
  });
}

// --- 7. TYPING INDICATOR "SETTER" ---
async function handleTyping() {
  const chatDocRef = doc(db, "chats", chatId);

  const chatSnap = await getDoc(chatDocRef);
  if (!chatSnap.exists()) return; 

  await updateDoc(chatDocRef, {
    [`typing.${currentUser.uid}`]: true,
  });

  if (typingTimeout) clearTimeout(typingTimeout);

  typingTimeout = setTimeout(async () => {
    await updateDoc(chatDocRef, {
      [`typing.${currentUser.uid}`]: false,
    });
  }, 3000);
}

// --- 8. ENCRYPTION / DECRYPTION HELPERS ---
function encryptMessage(text, secretKey) {
  if (!text) return "";
  try {
    return CryptoJS.AES.encrypt(text, secretKey).toString();
  } catch (e) {
    console.error("Encryption failed:", e);
    return text;
  }
}

function decryptMessage(ciphertext, secretKey) {
  if (!ciphertext) return "";
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    console.error("Decryption failed:", e);
    return "Message cannot be decrypted";
  }
}