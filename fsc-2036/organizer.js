import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  browserLocalPersistence,
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  query,
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
const authReady = setPersistence(auth, browserLocalPersistence);

const signInButton = document.querySelector("[data-organizer-sign-in]");
const signOutButton = document.querySelector("[data-organizer-sign-out]");
const statusText = document.querySelector("[data-organizer-status]");
const adminCard = document.querySelector("[data-admin-card]");
const adminUid = document.querySelector("[data-admin-uid]");
const phaseControl = document.querySelector("[data-phase-control]");
const currentPhase = document.querySelector("[data-current-phase]");
const phaseMessage = document.querySelector("[data-phase-message]");
const phaseButtons = document.querySelectorAll("[data-phase-option]");
const submissionManager = document.querySelector("[data-submission-manager]");
const submissionList = document.querySelector("[data-submission-list]");
const exportAttributionButton = document.querySelector("[data-export-attribution]");

let currentUser = null;
let currentPhaseValue = "";
let settingsUnsubscribe = null;
let submissionsUnsubscribe = null;
let currentSubmissions = [];

const DEMO_SUBMISSION = {
  team_lead_name: "PecuLab Demo Team",
  email: "pecu610@gmail.com",
  age_confirmation: "I am between ages 12 and 30",
  participant_group: "Group C - Young Innovators",
  registration_fee_category: "Individual entry - free pilot intake",
  stripe_payment_status: "not_applicable_pilot_intake",
  registration_status: "registration_complete",
  payment_notification_status: "not_applicable_pilot_intake",
  student_status: "Young professional",
  school: "Future Intelligence Hub Demo School",
  country_region: "Taiwan / United States",
  participant_city: "Seattle",
  referral_owner: "PECULAB-REFERRAL",
  referral_source_type: "Referred by PecuLab / Seattle technical network",
  promotion_region: "Seattle / United States",
  referrer_name_or_organization: "",
  attribution_review_status: "pending_organizer_review",
  commission_review_status: "not_reviewed",
  team_members: "FIH demo submission for system testing",
  project_title: "2036 Market Trust Lab",
  suggested_topic: "Impact Capital & Inclusive Growth",
  scenario_definition:
    "In 2036, university finance labs and community investment clubs use transparent AI tools to inspect market-pattern evidence before making learning or portfolio decisions.",
  problem_and_users:
    "Students, early-stage investors, and financial-literacy educators often see price charts but cannot explain repeated technical patterns, uncertainty, or model reasoning. They need an interpretable learning tool that turns market sequences into visual evidence.",
  solution_summary:
    "This POC demonstrates an impact-capital learning workflow: candlestick time-series data is converted into Gramian Angular Field images, then a CNN-style classifier surfaces recurring patterns, confidence, uncertainty, and explanation prompts so learners can discuss risk, evidence, and responsible decision-making.",
  blueprint_pdf_url: "",
  poc_website_url: "https://fiworld.org/fsc-2036/demo-gaf-cnn.html",
  bonus_material_url: "",
  english_pitch_video_url: "https://youtu.be/5bJZOxhV9z4?si=ZKSgUvp_ufUQDc7x",
  ai_tools_disclosure: "Demo entry used AI-assisted drafting and design tools for communication refinement.",
  permission_to_publish:
    "Yes, FIH may publicly display our project title, participant/team name, scenario summary, video link, and approved materials for voting and recognition.",
  status: "approved",
};

const setStatus = (message) => {
  if (statusText) {
    statusText.textContent = message;
  }
};

const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char];
  });

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
  if (submissionManager) {
    submissionManager.hidden = true;
  }
};

const showPhaseControl = () => {
  if (adminCard) {
    adminCard.hidden = true;
  }
  if (phaseControl) {
    phaseControl.hidden = false;
  }
  if (submissionManager) {
    submissionManager.hidden = false;
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

const textField = (id, name, label, value = "", wide = false) => `
  <label class="${wide ? "wide" : ""}">
    ${label}
    <input type="text" name="${name}" value="${escapeHtml(value)}" data-submission-field="${id}:${name}">
  </label>
`;

const statusBadge = (label, value = "") => `
  <div class="submission-status-badge">
    <span>${label}</span>
    <strong>${escapeHtml(value || "Not set")}</strong>
  </div>
`;

const textareaField = (id, name, label, value = "") => `
  <label class="wide">
    ${label}
    <textarea rows="3" name="${name}" data-submission-field="${id}:${name}">${escapeHtml(value)}</textarea>
  </label>
`;

const submissionCard = (submission) => {
  const id = submission.id;
  return `
    <article class="submission-edit-card" data-submission-card="${id}">
      <div class="submission-edit-header">
        <div>
          <strong>${escapeHtml(submission.project_title || "Untitled submission")}</strong>
          <span>${escapeHtml(submission.email || submission.submitterEmail || "No email")} | ${escapeHtml(submission.status || "pending")}</span>
        </div>
        <div class="submission-edit-actions">
          <button type="button" data-apply-demo="${id}">Apply GAF-CNN demo</button>
          <button type="button" data-save-submission="${id}">Save</button>
        </div>
      </div>
      <div class="submission-status-row">
        ${statusBadge("Registration", submission.registration_status || submission.status || "pre_registration_received")}
        ${statusBadge("Referral owner", submission.referral_owner || "PECULAB-REFERRAL")}
        ${statusBadge("Attribution review", submission.attribution_review_status || "pending_organizer_review")}
        ${statusBadge("Pilot fee policy", submission.payment_notification_status || "not_applicable_pilot_intake")}
        ${statusBadge("Checkout status", submission.stripe_payment_status || "not_applicable_pilot_intake")}
      </div>
      <div class="submission-edit-grid">
        ${textField(id, "project_title", "Project title", submission.project_title, true)}
        ${textField(id, "team_lead_name", "Team lead", submission.team_lead_name)}
        ${textField(id, "email", "Email", submission.email)}
        ${textField(id, "participant_group", "Participant group", submission.participant_group)}
        ${textField(id, "registration_fee_category", "Pilot intake category", submission.registration_fee_category)}
        ${textField(id, "stripe_payment_status", "Checkout status", submission.stripe_payment_status)}
        ${textField(id, "registration_status", "Registration status", submission.registration_status)}
        ${textField(id, "payment_notification_status", "Pilot fee policy status", submission.payment_notification_status)}
        ${textField(id, "student_status", "Current role / status", submission.student_status)}
        ${textField(id, "suggested_topic", "Challenge topic", submission.suggested_topic, true)}
        ${textField(id, "school", "School / institution / organization", submission.school)}
        ${textField(id, "country_region", "Country / region", submission.country_region)}
        ${textField(id, "participant_city", "City", submission.participant_city)}
        ${textField(id, "referral_owner", "Referral owner", submission.referral_owner || "PECULAB-REFERRAL")}
        ${textField(id, "referral_source_type", "Referral source type", submission.referral_source_type)}
        ${textField(id, "promotion_region", "Promotion region", submission.promotion_region)}
        ${textField(id, "referrer_name_or_organization", "Referrer name or organization", submission.referrer_name_or_organization, true)}
        ${textField(id, "attribution_review_status", "Attribution review status", submission.attribution_review_status || "pending_organizer_review")}
        ${textField(id, "commission_review_status", "Commission review status", submission.commission_review_status || "not_reviewed")}
        ${textField(id, "blueprint_pdf_url", "Future Blueprint PDF URL", submission.blueprint_pdf_url, true)}
        ${textField(id, "poc_website_url", "Optional prototype / website URL", submission.poc_website_url, true)}
        ${textField(id, "bonus_material_url", "Optional bonus material URL", submission.bonus_material_url, true)}
        ${textField(id, "english_pitch_video_url", "English video URL", submission.english_pitch_video_url, true)}
        ${textField(id, "status", "Status", submission.status)}
        ${textareaField(id, "scenario_definition", "2036 scenario", submission.scenario_definition)}
        ${textareaField(id, "problem_and_users", "Problem and users", submission.problem_and_users)}
        ${textareaField(id, "solution_summary", "Solution summary", submission.solution_summary)}
        ${textareaField(id, "ai_tools_disclosure", "AI tools disclosure", submission.ai_tools_disclosure)}
      </div>
      <p class="small-note" data-submission-message="${id}"></p>
    </article>
  `;
};

const renderSubmissions = (submissions) => {
  if (!submissionList) {
    return;
  }

  submissionList.innerHTML = submissions.length
    ? submissions.map(submissionCard).join("")
    : `<p class="small-note">No submissions yet.</p>`;
};

const watchSubmissions = () => {
  if (submissionsUnsubscribe) {
    submissionsUnsubscribe();
  }

  submissionsUnsubscribe = onSnapshot(
    query(collection(db, "submissions")),
    (snapshot) => {
      const submissions = snapshot.docs
        .map((submissionDoc) => ({
          id: submissionDoc.id,
          ...submissionDoc.data(),
        }))
        .sort((a, b) => String(a.project_title || "").localeCompare(String(b.project_title || "")));
      currentSubmissions = submissions;
      renderSubmissions(submissions);
    },
    (error) => {
      if (submissionList) {
        submissionList.innerHTML = `<p class="small-note">Could not load submissions: ${error.message}</p>`;
      }
    },
  );
};

const csvValue = (value = "") => `"${String(value).replace(/"/g, '""')}"`;

const exportAttributionCsv = () => {
  const fields = [
    ["submission_id", "id"],
    ["referral_owner", "referral_owner"],
    ["referral_source_type", "referral_source_type"],
    ["promotion_region", "promotion_region"],
    ["referrer_name_or_organization", "referrer_name_or_organization"],
    ["attribution_review_status", "attribution_review_status"],
    ["commission_review_status", "commission_review_status"],
    ["team_lead_name", "team_lead_name"],
    ["email", "email"],
    ["participant_group", "participant_group"],
    ["school", "school"],
    ["participant_city", "participant_city"],
    ["country_region", "country_region"],
    ["project_title", "project_title"],
    ["registration_status", "registration_status"],
    ["status", "status"],
  ];

  const rows = [
    fields.map(([label]) => csvValue(label)).join(","),
    ...currentSubmissions.map((submission) =>
      fields.map(([, key]) => csvValue(submission[key] || "")).join(","),
    ),
  ];
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `fsc-2036-attribution-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const setSubmissionMessage = (id, message) => {
  const messageNode = document.querySelector(`[data-submission-message="${id}"]`);
  if (messageNode) {
    messageNode.textContent = message;
  }
};

const fieldValue = (id, name) =>
  document.querySelector(`[data-submission-field="${id}:${name}"]`)?.value.trim() || "";

const saveSubmission = async (id, values) => {
  if (!currentUser) {
    setStatus("Please sign in first.");
    return;
  }

  setSubmissionMessage(id, "Saving...");
  await setDoc(
    doc(db, "submissions", id),
    {
      ...values,
      updatedAt: serverTimestamp(),
      updatedBy: currentUser.uid,
      updatedByEmail: currentUser.email || "",
    },
    { merge: true },
  );
  setSubmissionMessage(id, "Saved.");
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
  watchSubmissions();
};

signInButton?.addEventListener("click", async () => {
  try {
    setStatus("Opening Google sign-in...");
    await authReady;
    await signInWithPopup(auth, provider);
  } catch (error) {
    setStatus(`Sign-in failed: ${error.message}. If a popup was blocked, allow popups for this site and try again.`);
  }
});

signOutButton?.addEventListener("click", () => signOut(auth));

exportAttributionButton?.addEventListener("click", exportAttributionCsv);

submissionList?.addEventListener("click", async (event) => {
  const demoButton = event.target.closest("[data-apply-demo]");
  const saveButton = event.target.closest("[data-save-submission]");

  try {
    if (demoButton) {
      await saveSubmission(demoButton.dataset.applyDemo, DEMO_SUBMISSION);
      return;
    }

    if (saveButton) {
      const id = saveButton.dataset.saveSubmission;
      await saveSubmission(id, {
        project_title: fieldValue(id, "project_title"),
        team_lead_name: fieldValue(id, "team_lead_name"),
        email: fieldValue(id, "email"),
        participant_group: fieldValue(id, "participant_group"),
        registration_fee_category: fieldValue(id, "registration_fee_category"),
        stripe_payment_status: fieldValue(id, "stripe_payment_status"),
        registration_status: fieldValue(id, "registration_status"),
        payment_notification_status: fieldValue(id, "payment_notification_status"),
        student_status: fieldValue(id, "student_status"),
        suggested_topic: fieldValue(id, "suggested_topic"),
        school: fieldValue(id, "school"),
        country_region: fieldValue(id, "country_region"),
        participant_city: fieldValue(id, "participant_city"),
        referral_owner: fieldValue(id, "referral_owner") || "PECULAB-REFERRAL",
        referral_source_type: fieldValue(id, "referral_source_type"),
        promotion_region: fieldValue(id, "promotion_region"),
        referrer_name_or_organization: fieldValue(id, "referrer_name_or_organization"),
        attribution_review_status: fieldValue(id, "attribution_review_status"),
        commission_review_status: fieldValue(id, "commission_review_status"),
        blueprint_pdf_url: fieldValue(id, "blueprint_pdf_url"),
        poc_website_url: fieldValue(id, "poc_website_url"),
        bonus_material_url: fieldValue(id, "bonus_material_url"),
        english_pitch_video_url: fieldValue(id, "english_pitch_video_url"),
        status: fieldValue(id, "status"),
        scenario_definition: fieldValue(id, "scenario_definition"),
        problem_and_users: fieldValue(id, "problem_and_users"),
        solution_summary: fieldValue(id, "solution_summary"),
        ai_tools_disclosure: fieldValue(id, "ai_tools_disclosure"),
      });
    }
  } catch (error) {
    const id = demoButton?.dataset.applyDemo || saveButton?.dataset.saveSubmission;
    if (id) {
      setSubmissionMessage(id, `Save failed: ${error.message}`);
    }
  }
});

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
  if (submissionsUnsubscribe) {
    submissionsUnsubscribe();
    submissionsUnsubscribe = null;
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
    if (submissionManager) {
      submissionManager.hidden = true;
    }
    return;
  }

  checkAdmin(user).catch((error) => {
    setStatus(`Organizer check failed: ${error.message}`);
    showAdminSetup(user);
  });
});
