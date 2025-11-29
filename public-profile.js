import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { 
  getFirestore, doc, getDoc, setDoc, updateDoc, increment 
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import { 
  getAuth, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

// 🔥 Firebase Config
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

// ✅ Get UID from URL
const params = new URLSearchParams(window.location.search);
const profileUID = params.get("uid");

if (!profileUID) {
  alert("Invalid profile link");
  window.location.href = "explore.html";
}

// ✅ Load Profile Data
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "signup.html";
    return;
  }

  const userRef = doc(db, "users", profileUID);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const data = snap.data();

    document.getElementById("fullName").textContent = data.fullName || "";
    document.getElementById("email").textContent = data.email || "";
    document.getElementById("location").textContent = data.location || "";
    document.getElementById("industry").textContent = data.industry || "";
    document.getElementById("skills").textContent = data.skills || "";
    document.getElementById("interests").textContent = data.interests || "";
    document.getElementById("specialisation").textContent = data.specialisation || "";
    document.getElementById("qualities").textContent = data.qualities || "";

  } else {
    alert("Profile not found");
    window.location.href = "explore.html";
  }
});

// ✅ Send Connection Request (with 3-time limit)
document.getElementById("connectBtn")?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Please login first");

  if (user.uid === profileUID) {
    return alert("You cannot connect with yourself!");
  }

  const requestId = `${user.uid}_${profileUID}`;
  const reverseId = `${profileUID}_${user.uid}`;
  const attemptsRef = doc(db, "request_attempts", requestId);

  const requestRef = doc(db, "connections", requestId);
  const reverseRef = doc(db, "connections", reverseId);

  // 🧾 Check previous attempts
  const attemptsSnap = await getDoc(attemptsRef);
  let attemptCount = 0;

  if (attemptsSnap.exists()) {
    attemptCount = attemptsSnap.data().count || 0;
  }

  if (attemptCount >= 10) {
    alert("🚫 You’ve already sent too many requests to this user.");
    return;
  }

  // 🧠 Check existing connection
  const reqSnap = await getDoc(requestRef);
  const revSnap = await getDoc(reverseRef);

  if (reqSnap.exists() || revSnap.exists()) {
    alert("⚠️ You already have a pending or existing connection with this user.");
    return;
  }

  // ✅ Create new connection request
  await setDoc(requestRef, {
    from: user.uid,
    to: profileUID,
    status: "pending",
    timestamp: Date.now()
  });

  // 📊 Increment attempt count
  if (attemptsSnap.exists()) {
    await updateDoc(attemptsRef, { count: increment(1) });
  } else {
    await setDoc(attemptsRef, { count: 1 });
  }

  alert("✅ Connection request sent successfully!");
});
