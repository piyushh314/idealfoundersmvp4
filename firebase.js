// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// ✅ Your Firebase Config
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

// Export for use in other files
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();
