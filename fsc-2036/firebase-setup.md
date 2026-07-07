# Firebase Setup

This hackathon page uses Firebase Auth and Cloud Firestore.

## Enable Products

1. Firebase Console > Authentication > Sign-in method.
2. Enable Google sign-in.
3. Firebase Console > Firestore Database.
4. Create a database in production mode.

## Publish Firestore Rules

Open Firestore Database > Rules and paste the contents of `fsc-2036/firestore.rules`.

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
fsc-2036/organizer.html
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

The same organizer page also includes a submission editor. It can:

- View pending and approved submissions.
- Edit project title, POC URL, video URL, scenario, problem, solution, and status.
- Apply the built-in GAF-CNN demo preset for testing.
- Change `status` to `approved` without editing every field in the Firebase Console.

New submissions are written to the `submissions` collection with:

```text
status = pending
registration_status = pre_registration_received
payment_notification_status = not_applicable_pilot_intake
stripe_payment_status = not_applicable_pilot_intake
voteCount = 0
```

## Pilot Intake and Future Fee Status

During the 2026 pilot intake period, submitted forms are treated as pre-registration records and no payment is requested.

Recommended status meanings:

```text
registration_status = pre_registration_received
payment_notification_status = not_applicable_pilot_intake
stripe_payment_status = not_applicable_pilot_intake
```

Do not request payment by email during pilot intake. Any future paid registration should be published only after secure online checkout, refund terms, privacy notice, participation agreement, organizer legal name, and support contact information are available on the public website.

```text
registration_status = eligibility_review
payment_notification_status = not_applicable_pilot_intake
```

After eligibility approval, update:

```text
registration_status = registration_complete
stripe_payment_status = not_applicable_pilot_intake
```

Participants who sign in with the same Google account can read only their own submission status. Pending submissions remain private from the public website and from other participants.

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
