import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
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

let allUsers = [];

const renderProfiles = (filteredUsers, currentUserId) => {
  const profilesContainer = document.getElementById("profiles");
  const noMsg = document.getElementById("noResultMsg");

  profilesContainer.innerHTML = "";

  if (filteredUsers.length === 0) {
    noMsg.classList.remove("hidden");
    return;
  }

  noMsg.classList.add("hidden");

  filteredUsers.forEach(({ id, data }) => {
    if (id === currentUserId) return; 

    profilesContainer.innerHTML += `
      <div class="bg-white shadow rounded-lg p-5 border border-gray-200">
        <h2 class="text-xl font-bold text-gray-800">${data.fullName || "Unnamed Founder"}</h2>
        <p class="text-gray-600">${data.location || "Unknown"}</p>
        <p class="mt-2 text-sm"><b>Industry:</b> ${data.industry || "-"}</p>
        <p class="text-sm"><b>Skills:</b> ${data.skills || "-"}</p>
        <p class="text-sm"><b>Interests:</b> ${data.interests || "-"}</p>

        <button onclick="openProfile('${id}')"
          class="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
          View Profile
        </button>
      </div>`;
  });
};

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "signup.html";
    return;
  }

  const querySnapshot = await getDocs(collection(db, "users"));
  allUsers = querySnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
  renderProfiles(allUsers, user.uid);

  // Filters
  document.getElementById("searchInput").addEventListener("input", filter);
  document.getElementById("industryFilter").addEventListener("change", filter);
  document.getElementById("skillFilter").addEventListener("input", filter);

  function filter() {
    const search = searchInput.value.toLowerCase();
    const industry = industryFilter.value;
    const skill = skillFilter.value.toLowerCase();

    const filtered = allUsers.filter(({ data }) =>
      (data.fullName?.toLowerCase().includes(search)) &&
      (!industry || data.industry === industry) &&
      (!skill || data.skills?.toLowerCase().includes(skill))
    );

    renderProfiles(filtered, user.uid);
  }
});
