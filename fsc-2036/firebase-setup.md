# Firebase Setup

This challenge page uses Firebase Auth and Cloud Firestore. Email confirmation reuses the site's already-active FormSubmit destination and does not require Cloud Functions, SMTP, an email extension, or a Gmail App Password.

## Enable Products

1. Firebase Console > Authentication > Sign-in method.
2. Enable Google sign-in.
3. Firebase Console > Firestore Database.
4. Create a database in production mode.

## Automatic Receipt Email

After Firestore saves the form, `script.js` posts a registration summary to the same FormSubmit destination already used by the site's contact forms. FormSubmit sends it to `peculab.ai@gmail.com`, copies the participant's verified Google sign-in address through `_cc`, and uses the participant email as Reply-To. The organizer can reply in that thread with the Chase payment link. No additional account configuration is required.

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
- Export an attribution CSV for future referral and commission review.

New submissions are written to the `submissions` collection with:

```text
status = pending
registration_status = pre_registration_received
payment_notification_status = pending_checkout_launch
stripe_payment_status = checkout_not_open
notification_email_status = pending
referral_owner = PECULAB-REFERRAL
attribution_review_status = pending_organizer_review
commission_review_status = not_reviewed
voteCount = 0
```

## Referral Attribution for Future Commission Reports

The public form defaults new submissions to:

```text
referral_owner = PECULAB-REFERRAL
referral_source_type = Referred by PecuLab / Seattle technical network
promotion_region = Seattle / United States
```

Participants can select another source if someone else introduced the challenge. The form stores:

```text
participant_city
referral_owner
referral_source_type
promotion_region
referrer_name_or_organization
attribution_review_status
commission_review_status
```

For future commission reports, use `referral_owner` as the first grouping field, then manually review `referrer_name_or_organization`, `promotion_region`, and `country_region` before marking `attribution_review_status` as confirmed. Keep `commission_review_status = not_reviewed` until payment is confirmed and any applicable dispute period and commission terms are resolved.

The organizer CSV export includes the attribution fields plus participant contact, school, location, project title, and registration status. Use it for review only; final commission eligibility should still be confirmed manually.

## Registration and Payment SOP

### 1. Form received

The public form writes the pre-registration record directly to Firestore, then automatically sends the registration summary through FormSubmit to `peculab.ai@gmail.com`, copied to the participant's verified Google sign-in address.

Initial values:

```text
registration_status = pre_registration_received
payment_notification_status = pending_checkout_launch
stripe_payment_status = checkout_not_open
notification_email_status = formsubmit_notification_requested
parent_guardian_consent = participant confirmation
participation_terms_confirmation = participant confirmation
non_refundable_fee_acknowledgement = participant confirmation
privacy_communication_confirmation = participant confirmation
```

### 2. Completeness and eligibility review

Open `fsc-2036/organizer.html` and verify age/group eligibility, required English Future Blueprint and video links, AI disclosure, participant details, and parental consent when applicable. Then update:

```text
registration_status = eligibility_review
```

Do not send a payment link to an incomplete or ineligible entry.

### 3. Send the Chase payment link

After the required materials are complete, reply to the participant's confirmation email. Keep the participant copied, identify PECULAB LLC as the U.S. registration administrator and merchant of record, identify the submission ID and amount, include the official Chase payment link, state the payment deadline, and repeat that the fee is generally non-refundable after payment subject to the published limited exceptions and applicable law. For a participant under 18, address the payment terms to the parent or legal guardian and request that the guardian complete or expressly authorize payment. Then update:

```text
registration_status = payment_pending
payment_notification_status = payment_notice_sent
stripe_payment_status = payment_pending
```

Use only the PECULAB LLC-controlled Chase link. Confirm that the Chase page and receipt display PECULAB LLC. Do not accept emailed card details, bank credentials, or payment through a participant-supplied link. Keep the non-refundable policy, limited exceptions, privacy notice, participation agreement, organizer identity, payment administrator identity, and support contact available before collecting payment.

### 4. Confirm payment and registration

Match the Chase transaction to the submission ID and payer. Do not rely only on a participant screenshot. After confirming receipt, update:

```text
registration_status = registration_complete
stripe_payment_status = paid
payment_notification_status = payment_notice_sent
```

Reply once more in the same email thread with the final registration confirmation and retain the payment reference outside the public Firestore fields. Do not store card or bank information in Firestore.

Suggested subject for the payment reply:

```text
[FSC 2036] Payment required to confirm registration - {Submission ID}
```

Suggested subject for the final reply:

```text
[FSC 2036] Registration confirmed - {Submission ID}
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
