const SPREADSHEET_ID = "124Q81zTEvloLB-fQ9KS1_wDIwqZrqgZr3MUaEAS9TP4";
const SHEET_NAME = "Submissions";

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
  try {
    const payload = JSON.parse(e.postData.contents || "{}");
    const sheet = getSubmissionSheet_();
    const row = HEADERS.map((header) => {
      if (header === "received_at") {
        return new Date();
      }
      if (header === "review_status") {
        return "New";
      }
      return payload[header] || "";
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
  }
}

function doGet() {
  return jsonResponse_({
    status: "ok",
    message: "FIH 2036 Hackathon submission endpoint is running.",
  });
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

function jsonResponse_(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
