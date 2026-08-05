# Mani.ai production runbook

Run these commands over SSH before deploying. They do not deploy the site.

```bash
set -euo pipefail
WEBROOT="/var/www/u3212803/data/www/moimani.ai"
PRIVATE="$HOME/private/mani-waitlist"
STAMP="$(date -u +%Y%m%d-%H%M%S)"

php -v
php -l "$WEBROOT/api/waitlist.php"
php -l "$WEBROOT/api/waitlist-admin.php"

umask 077
mkdir -p "$PRIVATE" "$HOME/backups/mani"
chmod 700 "$PRIVATE" "$HOME/backups/mani"

# Preserve the current production records before changing code or paths.
if [ -f "$WEBROOT/data/waitlist-submissions.jsonl" ]; then
  cp -p "$WEBROOT/data/waitlist-submissions.jsonl" \
    "$HOME/backups/mani/waitlist-submissions-$STAMP.jsonl"
  cp -p "$WEBROOT/data/waitlist-submissions.jsonl" \
    "$PRIVATE/waitlist-submissions.jsonl"
fi
chmod 600 "$PRIVATE"/*.jsonl 2>/dev/null || true
sha256sum "$HOME/backups/mani/waitlist-submissions-$STAMP.jsonl"

# Code rollback copy. Waitlist data is outside this directory and is not rolled back.
cp -a "$WEBROOT" "$HOME/backups/mani/site-$STAMP"

# Generate once. These files stay outside the webroot.
openssl rand -hex 32 > "$PRIVATE/referral-salt.txt"
openssl rand -hex 32 > "$PRIVATE/admin-token.txt"
chmod 600 "$PRIVATE/referral-salt.txt" "$PRIVATE/admin-token.txt"
```

Set these server-side values in ISPmanager. Never put their values in Git,
JavaScript, HTML or deployment archives:

```text
MANI_DATA_DIR=<absolute value of $HOME/private/mani-waitlist>
MANI_ALLOWED_ORIGINS=https://moimani.ai,https://www.moimani.ai
MANI_WAITLIST_POSITION_START=306
```

`MANI_REFERRAL_SALT` and `MANI_ADMIN_TOKEN` may be used instead of the private
files. Environment variables take precedence. On this hosting layout the API
also discovers `$HOME/private/mani-waitlist` automatically.

Leave `MANI_TRUSTED_PROXY_IPS` unset unless the hosting provider confirms the
exact proxy addresses and confirms that it overwrites incoming
`X-Forwarded-For`.

Download the production JSONL backup and audit it before deployment:

```powershell
node tools\audit-waitlist-data.mjs .\waitlist-submissions-production.jsonl
```

Any `ambiguousUnmarkedPositions`, malformed lines or duplicate identifiers are a
deployment blocker and require a manual data review. Do not auto-migrate them.

After deployment:

```bash
curl -fsS https://moimani.ai/api/waitlist-stats
curl -sS -o /dev/null -w 'data=%{http_code}\n' \
  https://moimani.ai/data/waitlist-submissions.jsonl
curl -sS -o /dev/null -w 'bad_origin=%{http_code}\n' \
  -H 'Origin: https://attacker.example' \
  -H 'Content-Type: application/json' \
  --data '{}' \
  https://moimani.ai/api/waitlist
curl -sS -o /dev/null -w 'admin_unauthenticated=%{http_code}\n' \
  https://moimani.ai/api/waitlist-admin.php
find "$PRIVATE" -maxdepth 1 -printf '%m %f\n'
```

Expected statuses: data `403` or `404`, bad origin `403`, unauthenticated admin
`200` with the password form and without the waitlist table. The directory must
be `700`; JSONL, lock, rate-limit and token files must be `600`.

Submit one owner-controlled test contact through the real form, confirm that it
appears in the authenticated admin page, verify the returned position/referral
state, then delete only that test record from the admin page.

Safe code rollback:

```bash
set -euo pipefail
WEBROOT="/var/www/u3212803/data/www/moimani.ai"
BACKUP="$HOME/backups/mani/site-YYYYMMDD-HHMMSS"
FAILED="$HOME/backups/mani/failed-$(date -u +%Y%m%d-%H%M%S)"
mv "$WEBROOT" "$FAILED"
cp -a "$BACKUP" "$WEBROOT"
php -l "$WEBROOT/api/waitlist.php"
curl -fsS https://moimani.ai/api/waitlist-stats
```

Do not restore or overwrite `MANI_DATA_DIR` during code rollback. Keep the
post-deployment JSONL and make another checksum-protected backup first.
