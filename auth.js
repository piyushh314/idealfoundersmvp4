// js/auth.js
import { auth, db, provider } from "./firebase.js";
import { createUserWithEmailAndPassword, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// --------------------------
// 🟦 GOOGLE SIGN-UP
// --------------------------
const googleBtn = document.getElementById("googleSignUp");
if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      await addDoc(collection(db, "users"), {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        createdAt: new Date().toISOString()
      });

      alert("✅ Signed up with Google!");
      window.location.href = "profile-setup.html";
    } catch (error) {
      console.error("❌ Google sign-up failed:", error.message);
      alert("❌ Google sign-up failed: " + error.message);
    }
  });
}

// --------------------------
// 🟦 EMAIL SIGN-UP
// --------------------------
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const name = document.getElementById("fullName").value.trim();

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await addDoc(collection(db, "users"), {
        uid: user.uid,
        name,
        email,
        createdAt: new Date().toISOString()
      });

      alert("✅ Account created successfully!");
      window.location.href = "profile-setup.html";
    } catch (error) {
      console.error(error);
      alert("❌ " + error.message);
    }
  });
}
