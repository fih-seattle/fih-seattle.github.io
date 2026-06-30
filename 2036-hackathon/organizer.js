import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCBOEvFK_CDtcFydBm7r0Qd4npHkNpvo8Y",
  authDomain: "fih-2036-hackathon.firebaseapp.com",
  projectId: "fih-2036-hackathon",
  storageBucket: "fih-2036-hackathon.firebasestorage.app",
  messagingSenderId: "760399385669",
  appId: "1:760399385669:web:f0944008ef298f4ff5bf2c",
  measurementId: "G-SMS4CRG32T",
};

const PHASE_LABELS = {
  submissions_open: "Open submissions",
  evaluation_open: "Close submissions and open voting",
  results_published: "Publish results",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

const signInButton = document.querySelector("[data-organizer-sign-in]");
const signOutButton = document.querySelector("[data-organizer-sign-out]");
const statusText = document.querySelector("[data-organizer-status]");
const adminCard = document.querySelector("[data-admin-card]");
const adminUid = document.querySelector("[data-admin-uid]");
const phaseControl = document.querySelector("[data-phase-control]");
const currentPhase = document.querySelector("[data-current-phase]");
const phaseMessage = document.querySelector("[data-phase-message]");
const phaseButtons = document.querySelectorAll("[data-phase-option]");

let currentUser = null;
let currentPhaseValue = "";
let settingsUnsubscribe = null;

const setStatus = (message) => {
  if (statusText) {
    statusText.textContent = message;
  }
};

const showAdminSetup = (user) => {
  if (adminUid) {
    adminUid.value = user.uid;
  }
  if (adminCard) {
    adminCard.hidden = false;
  }
  if (phaseControl) {
    phaseControl.hidden = true;
  }
};

const showPhaseControl = () => {
  if (adminCard) {
    adminCard.hidden = true;
  }
  if (phaseControl) {
    phaseControl.hidden = false;
  }
};

const renderPhase = (phase) => {
  currentPhaseValue = phase || "submissions_open";
  if (currentPhase) {
    currentPhase.textContent = PHASE_LABELS[currentPhaseValue] || currentPhaseValue;
  }

  phaseButtons.forEach((button) => {
    const isActive = button.dataset.phaseOption === currentPhaseValue;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
};

const watchSettings = () => {
  if (settingsUnsubscribe) {
    settingsUnsubscribe();
  }

  settingsUnsubscribe = onSnapshot(
    doc(db, "settings", "competition"),
    (snapshot) => {
      renderPhase(snapshot.data()?.phase);
    },
    (error) => {
      if (phaseMessage) {
        phaseMessage.textContent = `Could not load competition status: ${error.message}`;
      }
    },
  );
};

const checkAdmin = async (user) => {
  const adminSnapshot = await getDoc(doc(db, "admins", user.uid));
  if (!adminSnapshot.exists()) {
    showAdminSetup(user);
    setStatus(`Signed in as ${user.email}. Organizer permission is not set yet.`);
    return;
  }

  showPhaseControl();
  setStatus(`Signed in as ${user.email}. Organizer permission active.`);
  watchSettings();
};

signInButton?.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    setStatus(`Sign-in failed: ${error.message}`);
  }
});

signOutButton?.addEventListener("click", () => signOut(auth));

phaseButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    if (!currentUser) {
      setStatus("Please sign in first.");
      return;
    }

    const nextPhase = button.dataset.phaseOption;
    if (nextPhase === currentPhaseValue) {
      return;
    }

    button.disabled = true;
    if (phaseMessage) {
      phaseMessage.textContent = "Saving...";
    }

    try {
      await setDoc(
        doc(db, "settings", "competition"),
        {
          phase: nextPhase,
          updatedAt: serverTimestamp(),
          updatedBy: currentUser.uid,
          updatedByEmail: currentUser.email || "",
        },
        { merge: true },
      );

      if (phaseMessage) {
        phaseMessage.textContent = `Status changed to ${PHASE_LABELS[nextPhase]}.`;
      }
    } catch (error) {
      if (phaseMessage) {
        phaseMessage.textContent = `Could not change status: ${error.message}`;
      }
    } finally {
      button.disabled = false;
    }
  });
});

onAuthStateChanged(auth, (user) => {
  currentUser = user;

  if (settingsUnsubscribe) {
    settingsUnsubscribe();
    settingsUnsubscribe = null;
  }

  if (signInButton) {
    signInButton.hidden = Boolean(user);
  }
  if (signOutButton) {
    signOutButton.hidden = !user;
  }

  if (!user) {
    setStatus("Not signed in.");
    renderPhase("submissions_open");
    if (adminCard) {
      adminCard.hidden = true;
    }
    if (phaseControl) {
      phaseControl.hidden = true;
    }
    return;
  }

  checkAdmin(user).catch((error) => {
    setStatus(`Organizer check failed: ${error.message}`);
    showAdminSetup(user);
  });
});
