# Mani.ai waitlist setup

This is a preview implementation for the early-access queue.

## What it does

- Shows a live counter for the first 1000 places.
- Collects a normalized phone number.
- Collects email optionally.
- Collects an optional comment / preferred contact channel.
- Saves requests to `data/waitlist-submissions.jsonl`.
- Returns the user's queue position.
- Generates a referral code like `MANI-0001`.
- Requires personal data consent.
- Provides an admin view, search, JSONL export, CSV export, and delete action.
- Adds a basic request rate limit.

## Files needed for production

- `api/waitlist.php`
- `api/waitlist-admin.php`
- `.htaccess`
- `index.html`
- `pervye-1000.html`
- `script.js`
- `styles.css`

The `data/` directory is intentionally ignored by Git and blocked from public access by `.htaccess`.

## API endpoints

- `GET /api/waitlist-stats`
- `POST /api/waitlist`
- `GET /admin/waitlist?token=...`

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
  "page": "/pervye-1000"
}
```

`phone` is required and must be normalized to E.164 format (`+` and 10-15 digits). `email` and `contactDetails` are optional.
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

Then open:

```text
https://moimani.ai/admin/waitlist?token=long-random-token
```

On REG.RU production, the `/admin/waitlist` shortcut can be intercepted by hosting protection. Use the direct PHP URL if that happens:

```text
https://moimani.ai/api/waitlist-admin.php?token=long-random-token
```

Export:

```text
https://moimani.ai/admin/waitlist?token=long-random-token&format=jsonl
```

CSV export:

```text
https://moimani.ai/admin/waitlist?token=long-random-token&format=csv
```

## Local preview

```powershell
node tools\serve-local.mjs
```

Open:

```text
http://127.0.0.1:4179/
http://127.0.0.1:4179/pervye-1000
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
