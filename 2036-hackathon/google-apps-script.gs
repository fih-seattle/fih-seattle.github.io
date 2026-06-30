const SPREADSHEET_ID = "PASTE_PRIVATE_SPREADSHEET_ID_HERE";
const SHEET_NAME = "Submissions";
const VOTES_SHEET_NAME = "Votes";
const PUBLIC_REVIEW_STATUSES = ["approved", "published", "public"];
const MAX_FIELD_LENGTH = 5000;

const HEADERS = [
  "received_at",
  "source",
  "team_lead_name",
  "email",
  "age_confirmation",
  "student_status",
  "school",
  "country_region",
  "team_members",
  "project_title",
  "scenario_definition",
  "problem_and_users",
  "solution_summary",
  "poc_website_url",
  "english_pitch_video_url",
  "permission_to_publish",
  "submitted_at_page_time",
  "review_status",
  "public_id",
  "judge_notes",
];

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(5000);
    const payload = parsePayload_(e);
    const validation = validateSubmission_(payload);

    if (!validation.ok) {
      return jsonResponse_({
        status: "error",
        message: validation.message,
      });
    }

    const sheet = getSubmissionSheet_();
    const row = HEADERS.map((header) => {
      if (header === "received_at") {
        return new Date();
      }
      if (header === "review_status") {
        return "New";
      }
      return cleanText_(payload[header] || "");
    });

    sheet.appendRow(row);

    return jsonResponse_({
      status: "success",
      message: "Submission recorded.",
    });
  } catch (error) {
    return jsonResponse_({
      status: "error",
      message: error.message,
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (error) {
      // No active lock to release.
    }
  }
}

function parsePayload_(e) {
  const contents = e && e.postData && e.postData.contents;

  if (contents) {
    try {
      return JSON.parse(contents);
    } catch (error) {
      return e.parameter || {};
    }
  }

  return e && e.parameter ? e.parameter : {};
}

function doGet(e) {
  const callback = e && e.parameter && e.parameter.callback;

  try {
    if (e && e.parameter && e.parameter.action === "vote") {
      return recordVote_(e.parameter.project || "");
    }

    const body = {
      status: "success",
      submissions: getPublicSubmissions_(),
    };

    return callbackResponse_(callback, body);
  } catch (error) {
    return callbackResponse_(callback, {
      status: "error",
      message: error.message,
    });
  }
}

function getSubmissionSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  const existingHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const needsHeaders = existingHeaders.every((cell) => !cell);

  if (needsHeaders) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function getPublicSubmissions_() {
  const sheet = getSubmissionSheet_();
  const values = sheet.getDataRange().getValues();
  const voteCounts = getVoteCounts_();

  if (values.length <= 1) {
    return [];
  }

  const headers = values[0];
  const indexOf = (name) => headers.indexOf(name);

  return values
    .slice(1)
    .map((row, index) => {
      const value = (name) => {
        const index = indexOf(name);
        return index >= 0 ? row[index] : "";
      };
      const publicId = cleanText_(value("public_id") || `FIH2036-${String(index + 1).padStart(3, "0")}`);
      const permission = cleanText_(value("permission_to_publish"));
      const reviewStatus = cleanText_(value("review_status"));

      const submission = {
        id: publicId,
        team: cleanText_(value("team_lead_name")),
        studentStatus: cleanText_(value("student_status")),
        school: cleanText_(value("school")),
        country: cleanText_(value("country_region")),
        project: cleanText_(value("project_title")),
        scenario: cleanText_(value("scenario_definition")),
        problem: cleanText_(value("problem_and_users")),
        solution: cleanText_(value("solution_summary")),
        pocUrl: cleanUrl_(value("poc_website_url")),
        videoUrl: cleanUrl_(value("english_pitch_video_url")),
        permission,
        reviewStatus,
        voteCount: voteCounts[publicId] || 0,
      };

      return submission;
    })
    .filter((item) => {
      const hasConsent = item.permission.toLowerCase().startsWith("yes");
      const isApproved = PUBLIC_REVIEW_STATUSES.includes(item.reviewStatus.toLowerCase());

      return hasConsent && isApproved && item.project && item.pocUrl && item.videoUrl;
    });
}

function recordVote_(projectId) {
  const lock = LockService.getScriptLock();
  const cleanProjectId = String(projectId || "").trim();
  const returnUrl = "https://fih-seattle.github.io/2036-hackathon/index.html#works";

  if (!/^[A-Za-z0-9._-]{1,80}$/.test(cleanProjectId)) {
    return votePage_("Vote not recorded", "Missing project ID.", returnUrl);
  }

  const publicProjectIds = getPublicSubmissions_().map((item) => item.id);

  if (!publicProjectIds.includes(cleanProjectId)) {
    return votePage_(
      "Vote not recorded",
      "This project is not currently open for public voting.",
      returnUrl,
    );
  }

  const voterKey = Session.getTemporaryActiveUserKey();

  if (!voterKey) {
    return votePage_(
      "Please sign in with Google",
      "A Google sign-in is required before your vote can be recorded.",
      returnUrl,
    );
  }

  try {
    lock.waitLock(5000);
    const sheet = getVotesSheet_();
    const values = sheet.getDataRange().getValues();
    const alreadyVoted = values
      .slice(1)
      .some((row) => row[1] === cleanProjectId && row[2] === voterKey);

    if (alreadyVoted) {
      return votePage_(
        "Vote already recorded",
        "This Google account has already voted for this project.",
        returnUrl,
      );
    }

    sheet.appendRow([new Date(), cleanProjectId, voterKey]);
  } finally {
    try {
      lock.releaseLock();
    } catch (error) {
      // No active lock to release.
    }
  }

  return votePage_(
    "Vote recorded",
    "Thank you. Your vote has been recorded for this project.",
    returnUrl,
  );
}

function getVotesSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(VOTES_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(VOTES_SHEET_NAME);
  }

  const existingHeaders = sheet.getRange(1, 1, 1, 3).getValues()[0];
  const needsHeaders = existingHeaders.every((cell) => !cell);

  if (needsHeaders) {
    sheet.getRange(1, 1, 1, 3).setValues([["voted_at", "project_id", "voter_key"]]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function getVoteCounts_() {
  const sheet = getVotesSheet_();
  const values = sheet.getDataRange().getValues();

  return values.slice(1).reduce((counts, row) => {
    const projectId = row[1];
    if (projectId) {
      counts[projectId] = (counts[projectId] || 0) + 1;
    }
    return counts;
  }, {});
}

function votePage_(title, message, returnUrl) {
  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${escapeHtml_(title)}</title>
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            font-family: Arial, sans-serif;
            background: #050505;
            color: #fff;
          }
          main {
            width: min(680px, calc(100% - 40px));
            padding: 42px;
            border-left: 4px solid #ffb21a;
            background: rgba(255, 255, 255, 0.08);
          }
          h1 {
            margin: 0 0 16px;
            font-size: clamp(2rem, 6vw, 4rem);
            line-height: 1.05;
          }
          p {
            color: rgba(255, 255, 255, 0.8);
            font-size: 1.1rem;
          }
          a {
            display: inline-flex;
            min-height: 46px;
            align-items: center;
            margin-top: 18px;
            padding: 10px 18px;
            background: #ffb21a;
            color: #14100a;
            font-weight: 800;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <main>
          <h1>${escapeHtml_(title)}</h1>
          <p>${escapeHtml_(message)}</p>
          <a href="${escapeHtml_(returnUrl)}">Return to Submitted Works</a>
        </main>
      </body>
    </html>
  `;

  return HtmlService.createHtmlOutput(html)
    .setTitle(title);
}

function validateSubmission_(payload) {
  const requiredFields = [
    "team_lead_name",
    "email",
    "age_confirmation",
    "student_status",
    "school",
    "country_region",
    "project_title",
    "scenario_definition",
    "problem_and_users",
    "solution_summary",
    "poc_website_url",
    "english_pitch_video_url",
    "permission_to_publish",
  ];

  const missing = requiredFields.filter((field) => !cleanText_(payload[field]));

  if (missing.length) {
    return {
      ok: false,
      message: `Missing required fields: ${missing.join(", ")}`,
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanText_(payload.email))) {
    return {
      ok: false,
      message: "Invalid email address.",
    };
  }

  if (!isSafeUrl_(payload.poc_website_url) || !isSafeUrl_(payload.english_pitch_video_url)) {
    return {
      ok: false,
      message: "Project and video links must start with http:// or https://.",
    };
  }

  return {
    ok: true,
  };
}

function cleanText_(value) {
  return String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_FIELD_LENGTH);
}

function isSafeUrl_(value) {
  const text = cleanText_(value);
  return /^https?:\/\/[^\s]+$/i.test(text);
}

function cleanUrl_(value) {
  const text = cleanText_(value);
  return isSafeUrl_(text) ? text : "";
}

function escapeHtml_(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function jsonResponse_(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

function callbackResponse_(callback, body) {
  if (!callback) {
    return jsonResponse_(body);
  }

  if (!/^[A-Za-z_$][0-9A-Za-z_$]{0,80}$/.test(callback)) {
    return jsonResponse_({
      status: "error",
      message: "Invalid callback.",
    });
  }

  return ContentService
    .createTextOutput(`${callback}(${JSON.stringify(body)});`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
