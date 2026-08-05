# Mani.ai first-party analytics

The site sends anonymous first-party product and operational events to MySQL.
Google Analytics and Yandex Metrica remain disabled until analytics consent is
accepted.

## Privacy boundaries

Events never contain phone numbers, email addresses, comments, calculator
amounts, raw IP addresses, full User-Agent strings, or full URLs with query
parameters. The backend stores only:

- a server-side HMAC of a random session UUID;
- a persistent visitor HMAC only after analytics consent;
- coarse device, browser, and operating-system families;
- allowlisted product event dimensions;
- a daily rotating IP HMAC only in the short-lived rate-limit table.

Anonymous sessions can therefore be measured without creating a persistent
cross-session profile. New and returning visitors are shown only for visitors
who accepted analytics cookies.

## Server configuration

Create a PHP config outside the public document root:

```php
<?php
return [
    'dsn' => 'mysql:host=localhost;dbname=DATABASE;charset=utf8mb4',
    'user' => 'DATABASE_USER',
    'password' => 'DATABASE_PASSWORD',
    'salt' => 'GENERATED_RANDOM_SECRET',
];
```

Recommended path for the REG.RU production layout:

```text
/var/www/ACCOUNT/data/private/mani-analytics.php
```

Generate the HMAC salt on the server:

```bash
php -r 'echo bin2hex(random_bytes(32)), PHP_EOL;'
```

Set the config file to mode `0600`. Never expose or rotate this salt during
normal operation: rotating it changes all future session and visitor hashes,
so historical and new consented visitor records can no longer be correlated.
It does not invalidate waitlist or referral links.

Apply the additive schema:

```bash
mysql -u DATABASE_USER -p DATABASE < database/analytics-schema.sql
```

## Retention

Raw analytics events are retained for 180 days by default. Rate-limit buckets
are retained for two days. Run the CLI cleanup once a day:

```bash
php /path/to/site/tools/cleanup-analytics.php
```

To choose another bounded raw-event retention period:

```bash
MANI_ANALYTICS_RETENTION_DAYS=365 php /path/to/site/tools/cleanup-analytics.php
```

## Admin

Analytics uses the same secure admin session as the waitlist:

```text
https://moimani.ai/api/analytics-admin.php
```

The dashboard provides today, 7-day, and 30-day ranges. Registrations are read
from the existing waitlist JSONL, while interaction and performance events are
read from MySQL.
