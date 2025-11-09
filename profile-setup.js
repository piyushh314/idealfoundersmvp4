import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

/** ---------- FIREBASE ---------- */
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

/** ---------- STEP STATE ---------- */
const steps = [
  { id: "step1", title: "Platform Principles" },
  { id: "step2", title: "Basics" },
  { id: "step3", title: "What you’ll build" },
  { id: "step4", title: "Partner preferences" },
];
let currentStep = 1;

const el = (id) => document.getElementById(id);
const show = (node) => node.classList.remove("hidden");
const hide = (node) => node.classList.add("hidden");

/** ---------- UI: STEP HELPERS ---------- */
function updateStepper() {
  const s = steps[currentStep - 1];
  el("stepLabel").textContent = `Step ${currentStep} of ${steps.length}`;
  el("stepTitle").textContent = s.title;
  el("progressBar").style.width = `${(currentStep / steps.length) * 100}%`;

  steps.forEach((st, i) => {
    const sec = el(st.id);
    if (i === currentStep - 1) show(sec); else hide(sec);
  });

  // nav buttons
  if (currentStep === 1) el("backBtn").setAttribute("disabled", "true");
  else el("backBtn").removeAttribute("disabled");

  if (currentStep === steps.length) {
    hide(el("nextBtn"));
    show(el("submitBtn"));
  } else {
    show(el("nextBtn"));
    hide(el("submitBtn"));
  }
}

function validateCurrentStep() {
  // Step 1 — all six checkboxes must be ticked
  if (currentStep === 1) {
    const ids = ["agree_cofounder","agree_no_selling","agree_no_hiring","agree_respect","agree_no_cold_external","agree_platform_only"];
    const allChecked = ids.every((id) => el(id).checked);
    if (!allChecked) { alert("Please confirm all principles to continue."); return false; }
  }

  // Step 2 — required: firstName,lastName,email,location,bio,isTechnical,referralSource
  if (currentStep === 2) {
    const requiredIds = ["firstName","lastName","email","location","bio","isTechnical","referralSource"];
    for (const id of requiredIds) {
      const v = (el(id).value || "").trim();
      if (!v) { alert("Please complete all required fields in Basics."); return false; }
    }
    // if LinkedIn is empty but "noLinkedin" not checked, ask user
    if (!el("noLinkedin").checked && !el("linkedinUrl").value.trim()) {
      const ok = confirm("No LinkedIn provided. Continue anyway?");
      if (!ok) return false;
    }
  }

  // Step 3 — required: ideaCommitment, responsibilities, interestsTopics, equityExpectations, fullTimeTiming, hasCofounder
  if (currentStep === 3) {
    const req = ["ideaCommitment","responsibilities","interestsTopics","equityExpectations","fullTimeTiming","hasCofounder"];
    for (const id of req) {
      const v = (el(id).value || "").trim();
      if (!v) { alert("Please finish required questions in this step."); return false; }
    }
  }

  // Step 4 — core required: lookingFor, ideaPreference, profileTypePreference, timingPreference, locationPreference, agePreference, cofounderAreas, interestMatchPreference
  if (currentStep === 4) {
    const req = ["lookingFor","ideaPreference","profileTypePreference","timingPreference","locationPreference","agePreference","cofounderAreas","interestMatchPreference"];
    for (const id of req) {
      const v = (el(id).value || "").trim();
      if (!v) { alert("Please complete required preferences."); return false; }
    }

    // distance required if locationPreference == "Within a distance of me"
    if (el("locationPreference").value === "Within a distance of me") {
      const d = el("maxDistanceKm").value;
      if (!d || Number(d) <= 0) { alert("Please enter a valid max distance."); return false; }
    }

    // age range required if agePreference == "Within an age range"
    if (el("agePreference").value === "Within an age range") {
      const min = Number(el("ageMin").value || 0);
      const max = Number(el("ageMax").value || 0);
      if (!min || !max || min < 16 || max < 16 || min >= max) {
        alert("Please provide a valid age range (min < max, >= 16)."); return false;
      }
    }
  }

  return true;
}

/** ---------- DYNAMIC FIELDS ---------- */
function wireDynamicFields() {
  el("locationPreference").addEventListener("change", () => {
    if (el("locationPreference").value === "Within a distance of me") show(el("distanceWrap"));
    else hide(el("distanceWrap"));
  });

  el("agePreference").addEventListener("change", () => {
    if (el("agePreference").value === "Within an age range") show(el("ageWrap"));
    else hide(el("ageWrap"));
  });

  el("noLinkedin").addEventListener("change", () => {
    if (el("noLinkedin").checked) {
      el("linkedinUrl").value = "";
      el("linkedinUrl").setAttribute("disabled","true");
      el("linkedinUrl").classList.add("bg-gray-100");
    } else {
      el("linkedinUrl").removeAttribute("disabled");
      el("linkedinUrl").classList.remove("bg-gray-100");
    }
  });
}

/** ---------- PREFILL FROM FIRESTORE ---------- */
async function prefillIfAny(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const d = snap.data();

  // Step 1
  el("agree_cofounder").checked = !!d.agreements?.cofounder;
  el("agree_no_selling").checked = !!d.agreements?.noSelling;
  el("agree_no_hiring").checked = !!d.agreements?.noHiring;
  el("agree_respect").checked = !!d.agreements?.respect;
  el("agree_no_cold_external").checked = !!d.agreements?.noColdExternal;
  el("agree_platform_only").checked = !!d.agreements?.platformOnly;

  // Step 2
  el("firstName").value = d.firstName || "";
  el("lastName").value = d.lastName || "";
  el("email").value = d.email || "";
  el("linkedinUrl").value = d.linkedinUrl || "";
  el("noLinkedin").checked = !!d.noLinkedin;
  if (el("noLinkedin").checked) {
    el("linkedinUrl").setAttribute("disabled","true");
    el("linkedinUrl").classList.add("bg-gray-100");
  }
  el("location").value = d.location || "";
  el("bio").value = d.bio || "";
  el("accomplishment").value = d.accomplishment || "";
  el("education").value = d.education || "";
  el("employment").value = d.employment || "";
  el("isTechnical").value = d.isTechnical || "";
  el("gender").value = d.gender || "";
  el("birthday").value = d.birthday || "";
  el("schedulingUrl").value = d.schedulingUrl || "";
  el("twitterUrl").value = d.twitterUrl || "";
  el("instagramUrl").value = d.instagramUrl || "";
  el("referralSource").value = d.referralSource || "";

  // Step 3
  el("ideaCommitment").value = d.ideaCommitment || "";
  el("companyName").value = d.companyName || "";
  el("companyDesc").value = d.companyDesc || "";
  el("progress").value = d.progress || "";
  el("funding").value = d.funding || "";
  el("hasCofounder").value = d.hasCofounder || "";
  el("fullTimeTiming").value = d.fullTimeTiming || "";
  el("responsibilities").value = d.responsibilities || "";
  el("interestsTopics").value = d.interestsTopics || "";
  el("equityExpectations").value = d.equityExpectations || "";

  el("hobbies").value = d.hobbies || "";
  el("lifePath").value = d.lifePath || "";
  el("anythingElse").value = d.anythingElse || "";

  // Step 4
  el("lookingFor").value = d.lookingFor || "";
  el("ideaPreference").value = d.preferences?.idea?.choice || "";
  el("ideaImportance").value = d.preferences?.idea?.importance || "Medium";
  el("profileTypePreference").value = d.preferences?.profileType?.choice || "";
  el("profileTypeImportance").value = d.preferences?.profileType?.importance || "Medium";
  el("timingPreference").value = d.preferences?.timing?.choice || "";
  el("timingImportance").value = d.preferences?.timing?.importance || "Medium";
  el("locationPreference").value = d.preferences?.location?.choice || "";
  el("locationImportance").value = d.preferences?.location?.importance || "Medium";
  if (el("locationPreference").value === "Within a distance of me") {
    show(el("distanceWrap"));
    el("maxDistanceKm").value = d.preferences?.location?.maxDistanceKm || "";
  }
  el("agePreference").value = d.preferences?.age?.choice || "";
  el("ageImportance").value = d.preferences?.age?.importance || "Medium";
  if (el("agePreference").value === "Within an age range") {
    show(el("ageWrap"));
    el("ageMin").value = d.preferences?.age?.min || "";
    el("ageMax").value = d.preferences?.age?.max || "";
  }
  el("cofounderAreas").value = d.preferences?.cofounderAreas?.areas || "";
  el("cofounderAreasImportance").value = d.preferences?.cofounderAreas?.importance || "Medium";
  el("interestMatchPreference").value = d.preferences?.interestMatch?.choice || "";
  el("interestImportance").value = d.preferences?.interestMatch?.importance || "Medium";
  el("alertOnMatch").checked = !!d.alertOnMatch;
}

/** ---------- AUTH + INIT ---------- */
let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "signup.html"; return; }
  currentUser = user;

  // header email
  el("signedEmail").textContent = user.email || "—";

  // try to derive names for first/last if empty
  if (!el("firstName").value && user.displayName) {
    const parts = user.displayName.split(" ");
    el("firstName").value = parts[0] || "";
    el("lastName").value = parts.slice(1).join(" ");
  }
  el("email").value = user.email || "";

  // prefill
  await prefillIfAny(user.uid);
});

wireDynamicFields();
updateStepper();

/** ---------- NAVIGATION ---------- */
el("backBtn").addEventListener("click", () => {
  if (currentStep > 1) { currentStep -= 1; updateStepper(); }
});
el("nextBtn").addEventListener("click", () => {
  if (!validateCurrentStep()) return;
  if (currentStep < steps.length) { currentStep += 1; updateStepper(); }
});

/** ---------- SUBMIT ---------- */
el("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validateCurrentStep()) return;
  if (!currentUser) { alert("Not signed in."); return; }

  // collect
  const payload = {
    uid: currentUser.uid,
    email: el("email").value.trim(),
    firstName: el("firstName").value.trim(),
    lastName: el("lastName").value.trim(),

    agreements: {
      cofounder: el("agree_cofounder").checked,
      noSelling: el("agree_no_selling").checked,
      noHiring: el("agree_no_hiring").checked,
      respect: el("agree_respect").checked,
      noColdExternal: el("agree_no_cold_external").checked,
      platformOnly: el("agree_platform_only").checked
    },

    linkedinUrl: el("linkedinUrl").value.trim(),
    noLinkedin: el("noLinkedin").checked,
    location: el("location").value.trim(),
    bio: el("bio").value.trim(),
    accomplishment: el("accomplishment").value.trim(),
    education: el("education").value.trim(),
    employment: el("employment").value.trim(),
    isTechnical: el("isTechnical").value,
    gender: el("gender").value.trim(),
    birthday: el("birthday").value.trim(),
    schedulingUrl: el("schedulingUrl").value.trim(),
    twitterUrl: el("twitterUrl").value.trim(),
    instagramUrl: el("instagramUrl").value.trim(),
    referralSource: el("referralSource").value.trim(),

    // we only store filenames for now (implement Firebase Storage later)
    profilePhotoName: el("profilePhoto").files[0]?.name || null,
    introVideoName: el("introVideo").files[0]?.name || null,

    ideaCommitment: el("ideaCommitment").value,
    companyName: el("companyName").value.trim(),
    companyDesc: el("companyDesc").value.trim(),
    progress: el("progress").value.trim(),
    funding: el("funding").value.trim(),
    hasCofounder: el("hasCofounder").value,
    fullTimeTiming: el("fullTimeTiming").value,
    responsibilities: el("responsibilities").value.trim(),
    interestsTopics: el("interestsTopics").value.trim(),
    equityExpectations: el("equityExpectations").value.trim(),
    hobbies: el("hobbies").value.trim(),
    lifePath: el("lifePath").value.trim(),
    anythingElse: el("anythingElse").value.trim(),

    preferences: {
      idea: {
        choice: el("ideaPreference").value,
        importance: el("ideaImportance").value
      },
      profileType: {
        choice: el("profileTypePreference").value,
        importance: el("profileTypeImportance").value
      },
      timing: {
        choice: el("timingPreference").value,
        importance: el("timingImportance").value
      },
      location: {
        choice: el("locationPreference").value,
        maxDistanceKm: el("locationPreference").value === "Within a distance of me" 
          ? Number(el("maxDistanceKm").value || 0) 
          : null,
        importance: el("locationImportance").value
      },
      age: {
        choice: el("agePreference").value,
        min: el("agePreference").value === "Within an age range" ? Number(el("ageMin").value || 0) : null,
        max: el("agePreference").value === "Within an age range" ? Number(el("ageMax").value || 0) : null,
        importance: el("ageImportance").value
      },
      cofounderAreas: {
        areas: el("cofounderAreas").value.trim(),
        importance: el("cofounderAreasImportance").value
      },
      interestMatch: {
        choice: el("interestMatchPreference").value,
        importance: el("interestImportance").value
      }
    },

    alertOnMatch: el("alertOnMatch").checked,
    updatedAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, "users", currentUser.uid), payload, { merge: true });
    alert("✅ Profile saved!");
    window.location.href = "dashboard.html";
  } catch (err) {
    console.error(err);
    alert("❌ Couldn’t save profile. Check console.");
  }
});
