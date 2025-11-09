// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAnvgH3asfAzdpfCJPS-tgS_LUYAlh8xmw",
  authDomain: "idealfounders.firebaseapp.com",
  projectId: "idealfounders",
  storageBucket: "idealfounders.firebasestorage.app",
  messagingSenderId: "52308573645",
  appId: "1:52308573645:web:c33f8ada45600f47645884"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Google Sign-up
document.getElementById("googleSignUp").addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Save in Firestore
    await addDoc(collection(db, "users"), {
      uid: user.uid,
      name: user.displayName,
      email: user.email,
      roles: [],
      passions: [],
      journey: "",
      workType: "",
      createdAt: new Date().toISOString()
    });

    alert("✅ Signed up with Google!");
    window.location.href = "profile.html";
  } catch (error) {
    console.error(error);
    alert("❌ Google sign-up failed: " + error.message);
  }
});

// Email/Password Signup + Profile data
document.getElementById("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const location = document.querySelector('input[placeholder="City, Country"]').value.trim();
  const roles = Array.from(document.querySelectorAll('#step2 input[type="checkbox"]:checked')).map(i => i.value);
  const passions = Array.from(document.querySelectorAll('#step3 input[type="checkbox"]:checked')).map(i => i.value);
  const journey = document.getElementById("journey").value;
  const workType = document.getElementById("workType").value;

  try {
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // Save profile in Firestore
    await addDoc(collection(db, "users"), {
      uid,
      name,
      email,
      location,
      roles,
      passions,
      journey,
      workType,
      createdAt: new Date().toISOString()
    });

    alert("✅ Profile created successfully!");
    window.location.href = "profile.html";
  } catch (error) {
    console.error(error);
    alert("❌ Error: " + error.message);
  }
});
  