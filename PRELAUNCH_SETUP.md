# Mani.ai prelaunch configuration

## Product status

The public product state is configured in `product-config.js`.

Supported values:

- `waitlist`
- `preorder`
- `launched`

Store URLs live in the same file. Empty URLs are never rendered as working
buttons. Change the cache-busting version of `product-config.js` in `index.html`
when changing the public status.

## Server environment

Set a long random value for:

```text
MANI_REFERRAL_SALT
```

It is used only on the server to create short-lived rate-limit keys. Generate it
with `openssl rand -hex 32`, keep it outside the repository and never expose it
to HTML, JavaScript, analytics or logs.

As a production-safe alternative, save the generated value in
`$HOME/private/mani-waitlist/referral-salt.txt` with mode `0600`. Environment
variables take precedence when both are present.

Changing it does not invalidate referral codes or existing waitlist records
because referral codes are generated independently. Rotation immediately resets
the current rate-limit history, so rotate only during a controlled maintenance
window.

Production should also set an absolute directory outside the public document
root:

```text
MANI_DATA_DIR=/home/u3212803/private/mani-waitlist
```

If the site is behind a reverse proxy, list only proxy addresses that may supply
`X-Forwarded-For`:

```text
MANI_TRUSTED_PROXY_IPS=127.0.0.1,10.0.0.10
```

Do not set this variable unless the proxy overwrites client-supplied forwarding
headers.

The existing admin variable remains:

```text
MANI_ADMIN_TOKEN
```

The public queue starts at position `306` by default. To change that threshold
without rewriting existing rows, set:

```text
MANI_WAITLIST_POSITION_START
```

The next position is always the greater of this threshold and the highest
position already stored plus one.

Legacy unmarked positions are mapped non-destructively: stored `1` is shown as
`306`, stored `2` as `307`, and so on. New records store their public number and
the explicit marker `positionScheme: "public-v2"`. JSONL files are not rewritten.

## Data compatibility

No destructive migration is required. Existing JSONL rows remain valid. New rows
add:

- `idempotencyKey`
- `firstTouch`
- `lastTouch`
- `positionScheme`

Existing `position`, `referralCode` and `referredBy` values are preserved.

## Yandex Metrica

Create goals matching these JavaScript events:

- `landing_view`
- `calculator_view`
- `calculator_start`
- `calculator_complete`
- `calculator_share`
- `cta_click`
- `waitlist_form_open`
- `waitlist_form_start`
- `waitlist_submit`
- `waitlist_success`
- `referral_link_created`
- `referral_share`
- `referral_visit`
- `referral_signup`
- `store_click_appstore`
- `store_click_googleplay`
- `store_click_rustore`

Do not enable Webvisor for the waitlist form. The site sends only allowlisted
technical fields and never sends contact details or calculator amounts.
