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
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
const authReady = setPersistence(auth, browserLocalPersistence);
const PHASES = {
  SUBMISSIONS_OPEN: "submissions_open",
  EVALUATION_OPEN: "evaluation_open",
  RESULTS_PUBLISHED: "results_published",
};
const countdownLabels = {
  "2026-07-15T00:00:00-07:00": "Open now",
  "2026-09-30T23:59:59-07:00": "Closed",
  "2026-10-01T00:00:00-07:00": "Reviewing now",
  "2026-10-15T00:00:00-07:00": "Announced",
};
const participantGroups = [
  "Group A - Junior",
  "Group B - Senior",
  "Group C - Young Innovators",
  "Group D - Team Challenge",
];
const defaultParticipantGroup = "Group A - Junior";

const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const toggle = document.querySelector("[data-nav-toggle]");
const gallery = document.querySelector("[data-submission-gallery]");
const emptyState = document.querySelector("[data-empty-state]");
const scoreBody = document.querySelector("[data-score-body]");
const exportButton = document.querySelector("[data-export-scores]");
const submissionForm = document.querySelector("[data-submission-form]");
const submitButton = document.querySelector("[data-submit-button]");
const formStatus = document.querySelector("[data-form-status]");
const submittedAt = document.querySelector("[data-submitted-at]");
const authButtons = document.querySelectorAll("[data-auth-button]");
const signOutButtons = document.querySelectorAll("[data-sign-out]");
const authStatus = document.querySelector("[data-auth-status]");
const participantStatus = document.querySelector("[data-participant-status]");
const participantStatusTitle = document.querySelector("[data-participant-status-title]");
const participantStatusDetail = document.querySelector("[data-participant-status-detail]");
const countdownNodes = document.querySelectorAll("[data-countdown]");

let currentUser = null;
let approvedSubmissions = [];
let approvedUnsubscribe = null;
let competitionSettings = {
  phase: PHASES.SUBMISSIONS_OPEN,
  submissionDeadlineLabel: "the submission deadline",
};

const isSubmissionOpen = () => competitionSettings.phase === PHASES.SUBMISSIONS_OPEN;
const isShowcaseOpen = () =>
  competitionSettings.phase === PHASES.EVALUATION_OPEN || competitionSettings.phase === PHASES.RESULTS_PUBLISHED;
const isVotingOpen = () => competitionSettings.phase === PHASES.EVALUATION_OPEN;

const formatCountdown = (targetDate, fallback) => {
  const diff = targetDate.getTime() - Date.now();

  if (diff <= 0) {
    return fallback || "Now";
  }

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const days = Math.floor(diff / day);
  const hours = Math.floor((diff % day) / hour);
  const minutes = Math.floor((diff % hour) / minute);

  if (days > 1) {
    return `${days} days`;
  }
  if (days === 1) {
    return `1 day ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${Math.max(minutes, 1)}m`;
};

const updateCountdowns = () => {
  countdownNodes.forEach((node) => {
    const targetValue = node.getAttribute("data-countdown");
    const targetDate = new Date(targetValue);

    if (Number.isNaN(targetDate.getTime())) {
      node.textContent = "--";
      return;
    }

    node.textContent = formatCountdown(targetDate, countdownLabels[targetValue]);
  });
};

const updateHeader = () => {
  if (header) {
    header.classList.toggle("is-scrolled", window.scrollY > 16);
  }
};

updateHeader();
updateCountdowns();
window.addEventListener("scroll", updateHeader, { passive: true });
window.setInterval(updateCountdowns, 60000);

if (toggle && nav && header) {
  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!isOpen));
    nav.classList.toggle("is-open", !isOpen);
    header.classList.toggle("is-open", !isOpen);
  });

  nav.addEventListener("click", (event) => {
    if (event.target.matches("a")) {
      toggle.setAttribute("aria-expanded", "false");
      nav.classList.remove("is-open");
      header.classList.remove("is-open");
    }
  });
}

const signIn = async () => {
  await authReady;
  const result = await signInWithPopup(auth, provider);
  return result.user;
};

authButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    try {
      await signIn();
    } catch (error) {
      updateFormStatus(`Google sign-in failed: ${error.message}. If a popup was blocked, allow popups for this site and try again.`);
    }
  });
});

signOutButtons.forEach((button) => {
  button.addEventListener("click", () => signOut(auth));
});

function updateFormStatus(message) {
  if (formStatus) {
    formStatus.textContent = message;
  }
}

const STATUS_LABELS = {
  pre_registration_received: "Pre-registration received",
  eligibility_review: "Eligibility review",
  payment_notice_sent: "Payment notice sent",
  payment_pending: "Payment pending",
  registration_complete: "Registration complete",
  pending: "Pre-registration received",
  approved: "Approved for public showcase",
};

const PAYMENT_LABELS = {
  not_sent: "Payment notice has not been sent yet.",
  sent: "Payment notice has been sent by email.",
  stripe_pending: "Payment is pending.",
  paid: "Payment confirmed.",
};

const setParticipantStatus = (title, detail, visible = true) => {
  if (participantStatus) {
    participantStatus.hidden = !visible;
  }
  if (participantStatusTitle) {
    participantStatusTitle.textContent = title;
  }
  if (participantStatusDetail) {
    participantStatusDetail.textContent = detail;
  }
};

const loadParticipantStatus = async (user) => {
  if (!user || !participantStatus) {
    setParticipantStatus("", "", false);
    return;
  }

  setParticipantStatus("Checking your current record", "Loading your pre-registration status...");

  try {
    const snapshot = await getDoc(doc(db, "submissions", user.uid));

    if (!snapshot.exists()) {
      setParticipantStatus(
        "No pre-registration found",
        "Submit the form below to enter the eligibility review queue.",
      );
      return;
    }

    const data = snapshot.data();
    const registrationStatus = data.registration_status || data.status || "pre_registration_received";
    const paymentStatus = data.payment_notification_status || data.stripe_payment_status || "not_sent";
    const registrationLabel = STATUS_LABELS[registrationStatus] || registrationStatus;
    const paymentLabel = PAYMENT_LABELS[paymentStatus] || paymentStatus;

    setParticipantStatus(
      registrationLabel,
      `${paymentLabel} FIH will email official payment instructions after eligibility review and payment setup activation.`,
    );
  } catch (error) {
    setParticipantStatus("Status unavailable", `Your status could not be loaded: ${error.message}`);
  }
};

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  const signedIn = Boolean(user);
  const label = signedIn ? `Signed in as ${user.displayName || user.email}` : "Sign in with Google to submit or vote.";

  if (authStatus) {
    authStatus.textContent = label;
  }

  authButtons.forEach((button) => {
    button.hidden = signedIn;
  });
  signOutButtons.forEach((button) => {
    button.hidden = !signedIn;
  });
  loadParticipantStatus(user);
});

const applyPhaseToPage = () => {
  if (submitButton) {
    submitButton.disabled = !isSubmissionOpen();
    submitButton.textContent = isSubmissionOpen() ? "Submit Future Blueprint" : "Submission Closed";
  }

  if (!isSubmissionOpen()) {
    updateFormStatus(`Submissions are closed. Current phase: ${competitionSettings.phase}.`);
  } else {
    updateFormStatus("Submissions are open as pre-registration records. Payment instructions will be emailed later.");
  }

  renderSubmissionGallery(approvedSubmissions);
  renderScoreTable();
};

const submissions = Array.isArray(window.hackathonSubmissions) ? window.hackathonSubmissions : [];
const isDemoSubmission = (item) => Boolean(item.isDemo || item.demo);
const demoSubmissions = submissions.filter(isDemoSubmission);
const publicStaticSubmissions = submissions.filter((item) => !isDemoSubmission(item));

const getProjectId = (item, index = 0) => item.id || `FIH2036-${String(index + 1).padStart(3, "0")}`;

const getSubmissionDocId = (item, index = 0) => item.firestoreId || item.id || `FIH2036-${String(index + 1).padStart(3, "0")}`;

const getProjectAnchor = (item, index = 0) => `project-${encodeURIComponent(getProjectId(item, index))}`;

const getProjectShareUrl = (item, index = 0) => {
  const pageUrl = `${window.location.origin}${window.location.pathname}`;
  return `${pageUrl}#${getProjectAnchor(item, index)}`;
};

const getSortedSubmissions = (items) =>
  publicStaticSubmissions
    .concat(items)
    .slice()
    .sort((a, b) => Number(b.voteCount || 0) - Number(a.voteCount || 0));

const getParticipantGroup = (item) => item.participantGroup || item.participant_group || defaultParticipantGroup;

const getSuggestedTopic = (item) => item.suggestedTopic || item.suggested_topic || "";

if (submissionForm) {
  submissionForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      if (!isSubmissionOpen()) {
        updateFormStatus("Submissions are currently closed.");
        return;
      }

      if (!currentUser) {
        await signIn();
        return;
      }
      const user = currentUser;

      if (submittedAt) {
        submittedAt.value = new Date().toISOString();
      }

      const formData = new FormData(submissionForm);
      const payload = Object.fromEntries(formData.entries());

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";
      }

      updateFormStatus("Submitting your pre-registration record to the challenge review queue...");

      await setDoc(doc(db, "submissions", user.uid), {
        source: "Future Solutions Challenge 2036 Edition",
        team_lead_name: cleanText(payload.team_lead_name),
        email: cleanText(payload.email),
        age_confirmation: cleanText(payload.age_confirmation),
        participant_group: cleanText(payload.participant_group),
        registration_fee_category: cleanText(payload.registration_fee_category),
        stripe_payment_status: cleanText(payload.stripe_payment_status),
        registration_status: cleanText(payload.registration_status),
        payment_notification_status: cleanText(payload.payment_notification_status),
        student_status: cleanText(payload.student_status),
        school: cleanText(payload.school),
        country_region: cleanText(payload.country_region),
        team_members: cleanText(payload.team_members),
        project_title: cleanText(payload.project_title),
        suggested_topic: cleanText(payload.suggested_topic),
        scenario_definition: cleanText(payload.scenario_definition),
        problem_and_users: cleanText(payload.problem_and_users),
        solution_summary: cleanText(payload.solution_summary),
        blueprint_pdf_url: cleanText(payload.blueprint_pdf_url),
        poc_website_url: cleanText(payload.poc_website_url),
        bonus_material_url: cleanText(payload.bonus_material_url),
        english_pitch_video_url: cleanText(payload.english_pitch_video_url),
        ai_tools_disclosure: cleanText(payload.ai_tools_disclosure),
        permission_to_publish: cleanText(payload.permission_to_publish),
        submitterUid: user.uid,
        submitterName: user.displayName || "",
        submitterEmail: user.email || "",
        status: "pending",
        voteCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      window.location.href = "thanks.html";
    } catch (error) {
      updateFormStatus(`Submission failed: ${error.message}`);
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Submit Future Blueprint";
      }
    }
  });
}

const cleanText = (value) => String(value || "").replace(/\s+/g, " ").trim();

const linkMarkup = (url, label) => {
  if (!url) {
    return "";
  }

  return `<a class="work-link" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`;
};

const getYouTubeEmbedUrl = (url) => {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "");
    let videoId = "";

    if (hostname === "youtu.be") {
      videoId = parsed.pathname.split("/").filter(Boolean)[0] || "";
    }

    if (hostname === "youtube.com" || hostname === "m.youtube.com" || hostname === "music.youtube.com") {
      if (parsed.pathname === "/watch") {
        videoId = parsed.searchParams.get("v") || "";
      } else if (parsed.pathname.startsWith("/shorts/") || parsed.pathname.startsWith("/embed/")) {
        videoId = parsed.pathname.split("/").filter(Boolean)[1] || "";
      }
    }

    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      return "";
    }

    return `https://www.youtube-nocookie.com/embed/${videoId}`;
  } catch (error) {
    return "";
  }
};

const videoMarkup = (url) => {
  const embedUrl = getYouTubeEmbedUrl(url);

  if (!embedUrl) {
    return linkMarkup(url, "Watch 1-Min Video");
  }

  return `
    <div class="video-embed">
      <iframe
        src="${escapeHtml(embedUrl)}"
        title="One-minute English concept video"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
    </div>
  `;
};

const voteMarkup = (item, index) => {
  if (isDemoSubmission(item)) {
    return `
      <div class="vote-row sample-note">
        <strong>Demo</strong>
        <span>Reference project only</span>
      </div>
    `;
  }

  const projectId = getSubmissionDocId(item, index);
  const voteCount = Number(item.voteCount || 0);
  const disabled = isVotingOpen() ? "" : "disabled";
  const label = isVotingOpen() ? "Vote with Google" : "Voting Closed";

  return `
    <div class="vote-row">
      <strong>${voteCount}</strong>
      <span>${voteCount === 1 ? "vote" : "votes"}</span>
      <button class="vote-button" type="button" data-vote="${escapeHtml(projectId)}" ${disabled}>${label}</button>
    </div>
  `;
};

const shareMarkup = (item, index) => {
  if (isDemoSubmission(item)) {
    return "";
  }

  const shareUrl = getProjectShareUrl(item, index);
  const title = `Vote for ${item.project || "this Future Solutions Challenge project"}`;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  return `
    <div class="share-row" aria-label="Share this project">
      <span>Share to rally votes</span>
      <a href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" target="_blank" rel="noopener">Facebook</a>
      <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}" target="_blank" rel="noopener">LinkedIn</a>
      <a href="https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}" target="_blank" rel="noopener">X</a>
      <button type="button" data-copy-link="${escapeHtml(shareUrl)}">Copy Link</button>
    </div>
  `;
};

const escapeHtml = (value) => {
  const div = document.createElement("div");
  div.textContent = value || "";
  return div.innerHTML;
};

const normalizeSubmission = (docSnap) => {
  const data = docSnap.data();

  return {
    firestoreId: docSnap.id,
    id: data.public_id || docSnap.id,
    team: data.team_lead_name || data.submitterName || "Student team",
    participantGroup: data.participant_group || defaultParticipantGroup,
    studentStatus: data.student_status || "",
    school: data.school || "",
    country: data.country_region || "",
    project: data.project_title || "",
    suggestedTopic: data.suggested_topic || "",
    scenario: data.scenario_definition || "",
    problem: data.problem_and_users || "",
    solution: data.solution_summary || "",
    blueprintUrl: data.blueprint_pdf_url || "",
    pocUrl: data.poc_website_url || "",
    bonusUrl: data.bonus_material_url || "",
    videoUrl: data.english_pitch_video_url || "",
    voteCount: Number(data.voteCount || 0),
  };
};

const projectCardMarkup = (item, index) => {
  const group = getParticipantGroup(item);
  const rankLabel = isDemoSubmission(item) ? "Sample Work" : "People's Choice";
  const rankBadge = isDemoSubmission(item) ? "Demo" : `#${index + 1}`;

  return `
    <article class="work-card${isDemoSubmission(item) ? " is-sample" : ""}" id="${getProjectAnchor(item, index)}">
      <div class="rank-row">
        <span class="rank-badge">${escapeHtml(rankBadge)}</span>
        <strong>${escapeHtml(rankLabel)}</strong>
      </div>
      <div>
        <span class="project-id">${escapeHtml(getProjectId(item, index))}</span>
        <h3>${escapeHtml(item.project)}</h3>
        <p class="team-line">${escapeHtml(item.team)}${item.school ? ` / ${escapeHtml(item.school)}` : ""}${item.country ? ` / ${escapeHtml(item.country)}` : ""}</p>
        <p class="student-line">${escapeHtml(group)}${item.studentStatus ? ` / ${escapeHtml(item.studentStatus)}` : ""}</p>
        ${getSuggestedTopic(item) ? `<p class="topic-line">${escapeHtml(getSuggestedTopic(item))}</p>` : ""}
      </div>
      <p><strong>2036 Scenario:</strong> ${escapeHtml(item.scenario)}</p>
      ${item.problem ? `<p><strong>Target Problem:</strong> ${escapeHtml(item.problem)}</p>` : ""}
      <p><strong>Solution:</strong> ${escapeHtml(item.solution)}</p>
      ${videoMarkup(item.videoUrl)}
      <div class="work-actions">
        ${linkMarkup(item.blueprintUrl, "Open Future Blueprint")}
        ${linkMarkup(item.pocUrl, isDemoSubmission(item) ? "Open Sample Prototype" : "Open Optional Prototype")}
        ${linkMarkup(item.bonusUrl, "Open Bonus Material")}
        ${linkMarkup(item.videoUrl, "Open Video")}
      </div>
      ${voteMarkup(item, index)}
      ${shareMarkup(item, index)}
    </article>
  `;
};

const renderSubmissionGallery = (items) => {
  if (!gallery) {
    return;
  }

  const sortedItems = getSortedSubmissions(items);
  const demoMarkup = demoSubmissions.length
    ? `
      <section class="work-group sample-work-group" aria-label="Sample project">
        <div class="work-group-heading">
          <span>Sample Project</span>
          <strong>Open now</strong>
        </div>
        <div class="gallery-grid">
          ${demoSubmissions
            .map((item, index) => projectCardMarkup(item, index))
            .join("")}
        </div>
      </section>
    `
    : "";

  if (!isShowcaseOpen()) {
    emptyState?.remove();
    gallery.innerHTML = `
      ${demoMarkup}
      <div class="empty-state works-locked">
        Public project browsing opens after the submission deadline. Until then, use the sample project as a reference for topic framing, Future Blueprint structure, and judging expectations.
      </div>
    `;
    return;
  }

  emptyState?.remove();

  const groupedMarkup = sortedItems.length
    ? participantGroups
        .map((group) => {
      const groupItems = sortedItems.filter((item) => getParticipantGroup(item) === group);
      const cards = groupItems.length
        ? groupItems
            .map((item) => {
              const index = sortedItems.indexOf(item);
              return projectCardMarkup(item, index);
            })
            .join("")
        : `<div class="empty-state">No approved works in this group yet.</div>`;

      return `
        <section class="work-group" aria-label="${escapeHtml(group)} works">
          <div class="work-group-heading">
            <span>${escapeHtml(group)}</span>
            <strong>${groupItems.length} ${groupItems.length === 1 ? "work" : "works"}</strong>
          </div>
          <div class="gallery-grid">${cards}</div>
        </section>
      `;
        })
        .join("")
    : `<div class="empty-state">No approved public works are available yet. Approved projects will appear here after review.</div>`;

  gallery.innerHTML = `${demoMarkup}${groupedMarkup}`;

  const targetProject = window.location.hash ? document.getElementById(window.location.hash.slice(1)) : null;
  targetProject?.scrollIntoView({ block: "start" });
};

const renderScoreTable = () => {
  if (!scoreBody) {
    return;
  }

  const scoreSubmissions = submissions.concat(approvedSubmissions);
  scoreBody.innerHTML = scoreSubmissions.length
    ? scoreSubmissions
        .map(
          (item, index) => {
            const id = getProjectId(item, index);

            return `
              <tr data-score-row="${escapeHtml(id)}">
                <th scope="row">
                  <span>${escapeHtml(id)}</span>
                  <strong>${escapeHtml(item.project)}</strong>
                  <small>${escapeHtml(item.team)} | ${escapeHtml(getParticipantGroup(item))}</small>
                  ${getSuggestedTopic(item) ? `<small>${escapeHtml(getSuggestedTopic(item))}</small>` : ""}
                </th>
                ${scoreFields.map(([key, label, max]) => `<td>${numberInput(id, key, max, label)}</td>`).join("")}
                <td class="total-cell" data-total>0</td>
                <td><textarea rows="2" aria-label="Judge notes"></textarea></td>
                <td class="score-links">
                  ${linkMarkup(item.blueprintUrl, "Blueprint")}
                  ${linkMarkup(item.pocUrl, "Prototype")}
                  ${linkMarkup(item.bonusUrl, "Bonus")}
                  ${linkMarkup(item.videoUrl, "Video")}
                </td>
              </tr>
            `;
          },
        )
        .join("")
    : `<tr><td colspan="10" class="empty-table">No approved public submissions are available yet.</td></tr>`;

  scoreBody.querySelectorAll("tr[data-score-row]").forEach((row) => {
    const id = row.getAttribute("data-score-row");
    row.addEventListener("input", () => updateTotal(row, id));
  });
};

const loadApprovedSubmissions = () => {
  if (!gallery && !scoreBody) {
    return;
  }

  if (!isShowcaseOpen()) {
    if (approvedUnsubscribe) {
      approvedUnsubscribe();
      approvedUnsubscribe = null;
    }
    approvedSubmissions = [];
    renderSubmissionGallery([]);
    renderScoreTable();
    return;
  }

  if (approvedUnsubscribe) {
    return;
  }

  const approvedQuery = query(collection(db, "submissions"), where("status", "==", "approved"));

  approvedUnsubscribe = onSnapshot(
    approvedQuery,
    (snapshot) => {
      approvedSubmissions = snapshot.docs.map(normalizeSubmission);
      renderSubmissionGallery(approvedSubmissions);
      renderScoreTable();
    },
    (error) => {
      if (emptyState) {
        emptyState.textContent = `Submitted works could not be loaded from Firebase: ${error.message}`;
      }
      renderScoreTable();
    },
  );
};

const loadCompetitionSettings = () => {
  onSnapshot(
    doc(db, "settings", "competition"),
    (snapshot) => {
      if (snapshot.exists()) {
        competitionSettings = {
          ...competitionSettings,
          ...snapshot.data(),
        };
      }

      applyPhaseToPage();
      loadApprovedSubmissions();
    },
    (error) => {
      updateFormStatus(`Competition settings could not be loaded: ${error.message}`);
      applyPhaseToPage();
    },
  );
};

const scoreFields = [
  ["future", "Future Thinking", 20],
  ["problem", "Problem Definition", 15],
  ["solution", "Solution Design", 20],
  ["impact", "Potential Impact", 20],
  ["feasibility", "Feasibility", 10],
  ["communication", "Communication", 15],
];

const numberInput = (id, key, max, label) =>
  `<input class="score-input" type="number" min="0" max="${max}" step="1" value="0" aria-label="${label} score" data-score="${id}-${key}">`;

const updateTotal = (row, id) => {
  const total = scoreFields.reduce((sum, [key]) => {
    const input = row.querySelector(`[data-score="${id}-${key}"]`);
    return sum + Number(input?.value || 0);
  }, 0);
  const totalCell = row.querySelector("[data-total]");
  if (totalCell) {
    totalCell.textContent = String(total);
  }
};

loadCompetitionSettings();

document.addEventListener("click", async (event) => {
  const voteButton = event.target.closest("[data-vote]");
  const copyButton = event.target.closest("[data-copy-link]");

  if (voteButton) {
    if (!isVotingOpen()) {
      window.alert("Voting is not open right now.");
      return;
    }

    const submissionId = voteButton.getAttribute("data-vote");

    try {
      if (!currentUser) {
        await signIn();
        return;
      }
      const user = currentUser;
      const voteId = user.uid;
      const voteRef = doc(db, "votes", voteId);
      const existingVote = await getDoc(voteRef);

      if (existingVote.exists()) {
        voteButton.textContent = "Already voted";
        window.alert("This Google account has already voted for one project.");
        return;
      }

      const batch = writeBatch(db);
      batch.set(voteRef, {
        submissionId,
        uid: user.uid,
        createdAt: serverTimestamp(),
      });
      batch.update(doc(db, "submissions", submissionId), {
        voteCount: increment(1),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
      voteButton.textContent = "Vote recorded";
    } catch (error) {
      voteButton.textContent = "Vote failed";
      window.alert(`Vote failed: ${error.message}`);
    }

    return;
  }

  if (copyButton) {
    const link = copyButton.getAttribute("data-copy-link");

    try {
      await navigator.clipboard.writeText(link);
      copyButton.textContent = "Copied";
    } catch (error) {
      window.prompt("Copy this project link:", link);
    }
  }
});

if (exportButton && scoreBody) {
  exportButton.addEventListener("click", () => {
    const rows = [["ID", "Project", "Team", ...scoreFields.map((field) => field[1]), "Total", "Notes"]];
    scoreBody.querySelectorAll("tr[data-score-row]").forEach((row) => {
      const id = row.getAttribute("data-score-row");
      const heading = row.querySelector("th");
      const project = heading?.querySelector("strong")?.textContent || "";
      const team = heading?.querySelector("small")?.textContent || "";
      const scores = scoreFields.map(([key]) => row.querySelector(`[data-score="${id}-${key}"]`)?.value || "0");
      const total = row.querySelector("[data-total]")?.textContent || "0";
      const notes = row.querySelector("textarea")?.value || "";
      rows.push([id, project, team, ...scores, total, notes]);
    });

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "future-solutions-challenge-2036-scores.csv";
    link.click();
    URL.revokeObjectURL(url);
  });
}
