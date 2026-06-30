# Firebase Setup

This hackathon page uses Firebase Auth and Cloud Firestore.

## Enable Products

1. Firebase Console > Authentication > Sign-in method.
2. Enable Google sign-in.
3. Firebase Console > Firestore Database.
4. Create a database in production mode.

## Publish Firestore Rules

Open Firestore Database > Rules and paste the contents of `2036-hackathon/firestore.rules`.

These rules:

- Allow anyone to read only approved submissions.
- Require Google sign-in to submit.
- Store new submissions as `pending`.
- Limit each Google account to one submission document.
- Allow Google-authenticated voting.
- Limit one Google account to one total vote across the whole competition.
- Allow only registered organizers to change the competition phase.

## Review Flow

Create this document in Firestore:

```text
settings / competition
```

Add a string field:

```text
phase = submissions_open
```

You can switch the public website without code changes:

```text
submissions_open   -> collect submissions, hide evaluation list
evaluation_open    -> show approved works and allow one vote per Google account
results_published  -> show approved works and vote totals, disable voting
```

## Organizer Control Page

The easier way to switch phases is:

```text
2036-hackathon/organizer.html
```

To enable it for your Google account:

1. Open `organizer.html` in the published site.
2. Sign in with Google.
3. Copy the Firebase UID shown on the page.
4. In Firestore, create this document:

```text
admins / {your Firebase UID}
```

Add any field, for example:

```text
role = owner
```

After that, reload `organizer.html`. You can switch between:

- Open submissions
- Close submissions and open voting
- Publish results

The public code can show this page, but Firestore rules prevent non-admin users from changing the phase.

New submissions are written to the `submissions` collection with:

```text
status = pending
voteCount = 0
```

To publish a project after the submission deadline, open Firestore and change:

```text
status = approved
```

Only approved submissions appear on the public leaderboard.

## Voting

Votes are stored in the `votes` collection with document IDs:

```text
{uid}
```

The page increments `voteCount` only when the user's single vote document is created in the same batch.

## Phase Control

Use the Firestore document `settings/competition` to control the whole event. No code deployment is needed when switching phases.
