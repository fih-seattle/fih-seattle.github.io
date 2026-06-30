const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const toggle = document.querySelector("[data-nav-toggle]");
const gallery = document.querySelector("[data-submission-gallery]");
const emptyState = document.querySelector("[data-empty-state]");
const scoreBody = document.querySelector("[data-score-body]");
const exportButton = document.querySelector("[data-export-scores]");
const googleSheetForm = document.querySelector("[data-google-sheet-form]");
const submitButton = document.querySelector("[data-submit-button]");
const formStatus = document.querySelector("[data-form-status]");
const submittedAt = document.querySelector("[data-submitted-at]");

const GOOGLE_SHEET_ENDPOINT = "https://script.google.com/macros/s/AKfycbw8iUX51gmQdHjy79aFPLYDBy8dPZcDKi3-uNAxlKUx-yXnIKvQeMpLjc_oE4pJRYiemg/exec";
const sheetSubmissions = [];

const updateHeader = () => {
  if (header) {
    header.classList.toggle("is-scrolled", window.scrollY > 16);
  }
};

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

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

const submissions = Array.isArray(window.hackathonSubmissions) ? window.hackathonSubmissions : [];

const getProjectId = (item, index = 0) => item.id || `FIH2036-${String(index + 1).padStart(3, "0")}`;

const getProjectAnchor = (item, index = 0) => `project-${encodeURIComponent(getProjectId(item, index))}`;

const getProjectShareUrl = (item, index = 0) => {
  const pageUrl = `${window.location.origin}${window.location.pathname}`;
  return `${pageUrl}#${getProjectAnchor(item, index)}`;
};

const getSortedSubmissions = (items) =>
  submissions
    .concat(items)
    .slice()
    .sort((a, b) => Number(b.voteCount || 0) - Number(a.voteCount || 0));

if (googleSheetForm && GOOGLE_SHEET_ENDPOINT) {
  googleSheetForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (submittedAt) {
      submittedAt.value = new Date().toISOString();
    }

    const formData = new FormData(googleSheetForm);
    const payload = Object.fromEntries(formData.entries());

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";
    }

    if (formStatus) {
      formStatus.textContent = "Sending your submission to the hackathon Google Sheet...";
    }

    try {
      await fetch(GOOGLE_SHEET_ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      window.location.href = "thanks.html";
    } catch (error) {
      if (formStatus) {
        formStatus.textContent = "The Google Sheet submission did not go through. Please check the Apps Script deployment URL and permissions.";
      }
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Submit Project";
      }
    }
  });
} else if (submittedAt) {
  googleSheetForm?.addEventListener("submit", () => {
    submittedAt.value = new Date().toISOString();
  });
}

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
        title="One-minute English product introduction video"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
    </div>
  `;
};

const voteMarkup = (item) => {
  const projectId = encodeURIComponent(item.id || "");
  const voteUrl = `${GOOGLE_SHEET_ENDPOINT}?action=vote&project=${projectId}`;
  const voteCount = Number(item.voteCount || 0);

  return `
    <div class="vote-row">
      <strong>${voteCount}</strong>
      <span>${voteCount === 1 ? "vote" : "votes"}</span>
      <a class="vote-button" href="${escapeHtml(voteUrl)}" target="_blank" rel="noopener">Vote with Google</a>
    </div>
  `;
};

const shareMarkup = (item, index) => {
  const shareUrl = getProjectShareUrl(item, index);
  const title = `Vote for ${item.project || "this 2036 Future World Hackathon project"}`;
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

const renderSubmissionGallery = (items) => {
  if (!gallery) {
    return;
  }

  if (items.length) {
    emptyState?.remove();
    const sortedItems = getSortedSubmissions(items);

    gallery.innerHTML = sortedItems
      .map(
        (item, index) => `
          <article class="work-card" id="${getProjectAnchor(item, index)}">
            <div class="rank-row">
              <span class="rank-badge">#${index + 1}</span>
              <strong>People's Choice</strong>
            </div>
            <div>
              <span class="project-id">${escapeHtml(getProjectId(item, index))}</span>
              <h3>${escapeHtml(item.project)}</h3>
              <p class="team-line">${escapeHtml(item.team)}${item.school ? ` / ${escapeHtml(item.school)}` : ""}${item.country ? ` / ${escapeHtml(item.country)}` : ""}</p>
              ${item.studentStatus ? `<p class="student-line">${escapeHtml(item.studentStatus)}</p>` : ""}
            </div>
            <p><strong>2036 Scenario:</strong> ${escapeHtml(item.scenario)}</p>
            ${item.problem ? `<p><strong>Target Problem:</strong> ${escapeHtml(item.problem)}</p>` : ""}
            <p><strong>Solution:</strong> ${escapeHtml(item.solution)}</p>
            ${videoMarkup(item.videoUrl)}
            <div class="work-actions">
              ${linkMarkup(item.pocUrl, "Open POC Website")}
              ${linkMarkup(item.videoUrl, "Open Video")}
            </div>
            ${voteMarkup(item)}
            ${shareMarkup(item, index)}
          </article>
        `,
      )
      .join("");

    const targetProject = window.location.hash ? document.getElementById(window.location.hash.slice(1)) : null;
    targetProject?.scrollIntoView({ block: "start" });
  }
};

const renderScoreTable = () => {
  if (!scoreBody) {
    return;
  }

  const scoreSubmissions = submissions.concat(sheetSubmissions);
  scoreBody.innerHTML = scoreSubmissions.length
    ? scoreSubmissions
        .map(
          (item, index) => {
            const id = item.id || `FIH2036-${String(index + 1).padStart(3, "0")}`;

            return `
              <tr data-score-row="${escapeHtml(id)}">
                <th scope="row">
                  <span>${escapeHtml(id)}</span>
                  <strong>${escapeHtml(item.project)}</strong>
                  <small>${escapeHtml(item.team)}</small>
                </th>
                ${scoreFields.map(([key]) => `<td>${numberInput(id, key)}</td>`).join("")}
                <td class="total-cell" data-total>0</td>
                <td><textarea rows="2" aria-label="Judge notes"></textarea></td>
                <td class="score-links">
                  ${linkMarkup(item.pocUrl, "POC")}
                  ${linkMarkup(item.videoUrl, "Video")}
                </td>
              </tr>
            `;
          },
        )
        .join("")
    : `<tr><td colspan="9" class="empty-table">Loading submissions from the Google Sheet...</td></tr>`;

  scoreBody.querySelectorAll("tr[data-score-row]").forEach((row) => {
    const id = row.getAttribute("data-score-row");
    row.addEventListener("input", () => updateTotal(row, id));
  });
};

const loadSheetSubmissions = () => {
  if ((!gallery && !scoreBody) || !GOOGLE_SHEET_ENDPOINT) {
    renderSubmissionGallery([]);
    renderScoreTable();
    return;
  }

  const callbackName = `handleHackathonSubmissions_${Date.now()}`;
  const script = document.createElement("script");

  window[callbackName] = (data) => {
    const rows = Array.isArray(data?.submissions) ? data.submissions : [];
    sheetSubmissions.splice(0, sheetSubmissions.length, ...rows);
    renderSubmissionGallery(sheetSubmissions);
    renderScoreTable();
    script.remove();
    delete window[callbackName];
  };

  script.onerror = () => {
    renderSubmissionGallery([]);
    if (emptyState) {
      emptyState.textContent = "Submitted works could not be loaded from the Google Sheet yet.";
    }
    renderScoreTable();
    delete window[callbackName];
  };

  script.src = `${GOOGLE_SHEET_ENDPOINT}?callback=${callbackName}`;
  document.body.appendChild(script);
};

const scoreFields = [
  ["scenario", "Scenario Definition"],
  ["solution", "Solution Fit"],
  ["poc", "POC Website"],
  ["video", "English Pitch"],
  ["impact", "Impact"],
];

const numberInput = (id, key) =>
  `<input class="score-input" type="number" min="0" max="20" step="1" value="0" aria-label="${key} score" data-score="${id}-${key}">`;

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

if (gallery || scoreBody) {
  renderSubmissionGallery([]);
  loadSheetSubmissions();
}

document.addEventListener("click", async (event) => {
  const copyButton = event.target.closest("[data-copy-link]");

  if (!copyButton) {
    return;
  }

  const link = copyButton.getAttribute("data-copy-link");

  try {
    await navigator.clipboard.writeText(link);
    copyButton.textContent = "Copied";
  } catch (error) {
    window.prompt("Copy this project link:", link);
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
    link.download = "fih-2036-hackathon-scores.csv";
    link.click();
    URL.revokeObjectURL(url);
  });
}
