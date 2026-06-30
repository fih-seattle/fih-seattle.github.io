# Google Sheets Submission Setup

Use this when you want the hackathon form to write directly into a Google Sheet.
This setup works as a standalone Apps Script project because `google-apps-script.gs` includes the target spreadsheet ID.

## Security Model

Do not publish or share the Google Sheet edit link on the website.

Keep the submission Sheet as the private backend database:

- Set the Google Sheet `General access` to `Restricted`.
- Give editor access only to the organizer account and trusted administrators.
- Do not use an `Anyone with the link` Sheet URL for applicants, public viewers, or broad judge access.
- Public applicants should only use the website form.
- The website should only contain the Google Apps Script Web App URL, not the Google Sheet URL.
- The Apps Script should append rows to the Sheet and return only a success or error message.

For judges, use one of these safer paths:

- Preferred: give judges the website judge list or a separate judge-only Google Sheet with only public project fields.
- If judges need spreadsheet editing, share that judge sheet with specific judge email addresses only.
- Do not give judges the raw `Submissions` sheet if it includes student emails, ages, private notes, or unpublished entries.

## 1. Create the Sheet

1. Create a new Google Sheet.
2. Rename the first tab to `Submissions`.
3. Click `Share` and set `General access` to `Restricted`.
4. Add only trusted organizers as editors.
5. You may use `Extensions > Apps Script`, or create a standalone Apps Script project from `https://script.google.com/home`.

## 2. Add the Apps Script

1. Create a new Apps Script project if needed.
2. Delete the default code.
3. Paste the contents of `2036-hackathon/google-apps-script.gs`.
4. Save the project.

## 3. Deploy the Web App

1. Click `Deploy > New deployment`.
2. Choose `Web app`.
3. Set `Execute as` to `Me`.
4. Set `Who has access` to `Anyone`.
5. Deploy and approve permissions.
6. Copy the Web App URL.

This makes the form publicly submit-able while the Sheet remains private. Google documents that a web app can run as the script owner, and in that mode the script executes as you regardless of who accesses the web app.

## 4. Connect the Website

Open `2036-hackathon/script.js` and replace:

```js
const GOOGLE_SHEET_ENDPOINT = "";
```

with:

```js
const GOOGLE_SHEET_ENDPOINT = "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";
```

After this is connected, submissions from the public hackathon page will append to the `Submissions` sheet.
The public page sends the form with `no-cors`, so visitors are sent to the thank-you page after submission while the Sheet remains private.

## 5. Public Works and Judge List

The Google Sheet is the private receiving table. After reviewing entries, add accepted public projects to `2036-hackathon/submissions.js`; those entries appear on the public works page and the judge scorecard.

Recommended review flow:

1. Keep all raw submissions in the private `Submissions` sheet.
2. Mark approved entries with `review_status = Approved`.
3. Copy only approved public fields into `2036-hackathon/submissions.js`.
4. Give judges the website judge list or a separate judge-only sheet that excludes emails and private student data.
