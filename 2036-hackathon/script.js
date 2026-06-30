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

  return `<a class="work-link" href="${url}" target="_blank" rel="noopener">${label}</a>`;
};

if (gallery) {
  if (submissions.length) {
    emptyState?.remove();
    gallery.innerHTML = submissions
      .map(
        (item) => `
          <article class="work-card">
            <div>
              <span>${item.id || "FIH2036"}</span>
              <h3>${item.project}</h3>
              <p class="team-line">${item.team}${item.school ? ` / ${item.school}` : ""}${item.country ? ` / ${item.country}` : ""}</p>
            </div>
            <p><strong>2036 Scenario:</strong> ${item.scenario}</p>
            <p><strong>Solution:</strong> ${item.solution}</p>
            <div class="work-actions">
              ${linkMarkup(item.pocUrl, "Open POC Website")}
              ${linkMarkup(item.videoUrl, "Watch 1-Min Video")}
            </div>
          </article>
        `,
      )
      .join("");
  }
}

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

if (scoreBody) {
  scoreBody.innerHTML = submissions.length
    ? submissions
        .map(
          (item, index) => `
            <tr data-score-row="${item.id || index + 1}">
              <th scope="row">
                <span>${item.id || `FIH2036-${String(index + 1).padStart(3, "0")}`}</span>
                <strong>${item.project}</strong>
                <small>${item.team}</small>
              </th>
              ${scoreFields.map(([key]) => `<td>${numberInput(item.id || index + 1, key)}</td>`).join("")}
              <td class="total-cell" data-total>0</td>
              <td><textarea rows="2" aria-label="Judge notes"></textarea></td>
              <td class="score-links">
                ${linkMarkup(item.pocUrl, "POC")}
                ${linkMarkup(item.videoUrl, "Video")}
              </td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="9" class="empty-table">No public submissions have been added yet.</td></tr>`;

  scoreBody.querySelectorAll("tr[data-score-row]").forEach((row) => {
    const id = row.getAttribute("data-score-row");
    row.addEventListener("input", () => updateTotal(row, id));
  });
}

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
