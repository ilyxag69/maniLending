# Mani.ai waitlist setup

For the current prelaunch status and analytics configuration also see
`PRELAUNCH_SETUP.md` and `ANALYTICS_SETUP.md`. Production must define
`MANI_REFERRAL_SALT` with at least
32 random characters and `MANI_DATA_DIR` as an absolute directory outside the
public document root. Existing JSONL records do not require conversion.
Alternatively, keep `referral-salt.txt` and `admin-token.txt` with mode `0600`
inside `$HOME/private/mani-waitlist`; the production hosting layout is detected
automatically.
New public registrations start at position `306` by default; this can be
overridden with `MANI_WAITLIST_POSITION_START`.

This is a preview implementation for the early-access queue.

## What it does

- Shows a live counter for the first 1000 places.
- Collects a normalized phone number.
- Collects email optionally.
- Collects an optional comment / preferred contact channel.
- Saves requests to `data/waitlist-submissions.jsonl`.
- Returns the user's queue position.
- Generates a cryptographically random referral code.
- Requires personal data consent.
- Provides an admin view, search, JSONL export, CSV export, and delete action.
- Adds a basic request rate limit.

## Files needed for production

- `api/waitlist.php`
- `api/waitlist-admin.php`
- `.htaccess`
- `index.html`
- `script.js`
- `styles.css`

The `data/` directory is intentionally ignored by Git and blocked from public access by `.htaccess`.

## API endpoints

- `GET /api/waitlist-stats`
- `POST /api/waitlist`
- `GET /api/waitlist-admin.php` (password form with a secure server session)

POST body:

```json
{
  "phone": "+79013696977",
  "email": "user@example.com",
  "contact": "manual",
  "contactDetails": "Telegram after 18:00",
  "pdnConsent": true,
  "pdnConsentVersion": "waitlist-pdn-2026-06-08",
  "pdnConsentAt": "2026-06-08T12:00:00.000Z",
  "ref": "MANI-0001",
  "page": "/#early-access",
  "heroHeadlineVariant": "chaos"
}
```

`phone` is required and must be normalized to E.164 format (`+` and 10-15 digits). `email` and `contactDetails` are optional.
`heroHeadlineVariant`, when present, must be `chaos` or `order` and is stored
with the submission for conversion comparison independent of analytics consent.
`pdnConsent` is required and must be `true`.

## Contact strategy

- collect a valid phone number as the primary contact;
- keep email as an optional backup;
- use the comment field for VK, WhatsApp, preferred time, or other details;
- export JSONL from the admin page and import it into CRM/SMS tooling.
- export CSV from the admin page when a spreadsheet is easier.

## Admin

Set an admin token on the server:

```text
MANI_ADMIN_TOKEN=long-random-token
```

Open the direct admin URL and enter `MANI_ADMIN_TOKEN` in the password form:

```text
https://moimani.ai/api/waitlist-admin.php
```

The authenticated session is stored in a `Secure`, `HttpOnly`, `SameSite=Strict`
cookie. HTTP Basic and Bearer authentication remain available for owner-controlled
automation. Do not use `https://moimani.ai/admin/waitlist` on REG.RU: hosting
nginx intercepts that path before the application.

Export:

```text
https://moimani.ai/api/waitlist-admin.php?format=jsonl
```

CSV export:

```text
https://moimani.ai/api/waitlist-admin.php?format=csv
```

## Local preview

```powershell
node tools\serve-local.mjs
```

Open:

```text
http://127.0.0.1:4179/
http://127.0.0.1:4179/#early-access
```

Run checks:

```powershell
$env:SITE_URL="http://127.0.0.1:4179"
node tools\check-live-site.mjs
```

## Production checks

After deployment:

```powershell
Invoke-RestMethod https://moimani.ai/api/waitlist-stats
```

Submit one real test request through the form, confirm it appears in `data/waitlist-submissions.jsonl`, then remove the test line.
