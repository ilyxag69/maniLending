<?php
declare(strict_types=1);

require_once __DIR__ . '/analytics-lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

$positionStart = max(1, (int) (getenv('MANI_WAITLIST_POSITION_START') ?: 306));
$limit = 1000;
$configuredDataDir = trim((string) getenv('MANI_DATA_DIR'));
$privateDataDir = dirname(__DIR__, 3) . '/private/mani-waitlist';
$dataDir = $configuredDataDir !== ''
    ? rtrim($configuredDataDir, '/\\')
    : (is_dir($privateDataDir) ? $privateDataDir : dirname(__DIR__) . '/data');
$dataFile = $dataDir . '/waitlist-submissions.jsonl';
$rateFile = $dataDir . '/waitlist-rate-limit.json';
$lockFile = $dataDir . '/waitlist.lock';
$saltFile = $dataDir . '/referral-salt.txt';
$GLOBALS['waitlistLock'] = null;

function respond(int $status, array $payload): void {
    if (is_resource($GLOBALS['waitlistLock'] ?? null)) {
        flock($GLOBALS['waitlistLock'], LOCK_UN);
        fclose($GLOBALS['waitlistLock']);
        $GLOBALS['waitlistLock'] = null;
    }
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function allowedOrigins(): array {
    $configured = trim((string) getenv('MANI_ALLOWED_ORIGINS'));
    $value = $configured !== ''
        ? $configured
        : 'https://moimani.ai,https://www.moimani.ai';
    return array_values(array_filter(array_map(
        static fn(string $origin): string => rtrim(trim($origin), '/'),
        explode(',', $value)
    )));
}

function validateOrigin(): void {
    $origin = rtrim(trim((string) ($_SERVER['HTTP_ORIGIN'] ?? '')), '/');
    if ($origin !== '' && !in_array($origin, allowedOrigins(), true)) {
        respond(403, ['message' => 'Request origin is not allowed']);
    }
}

function clientIp(): string {
    $remote = trim((string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
    $trusted = array_values(array_filter(array_map(
        'trim',
        explode(',', (string) getenv('MANI_TRUSTED_PROXY_IPS'))
    )));

    if ($trusted !== [] && in_array($remote, $trusted, true)) {
        $forwarded = explode(',', (string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? ''));
        $candidate = trim((string) ($forwarded[0] ?? ''));
        if (filter_var($candidate, FILTER_VALIDATE_IP)) {
            return $candidate;
        }
    }
    return $remote;
}

function ensureStorage(string $directory, array $files): void {
    if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) {
        respond(500, ['message' => 'Storage is unavailable']);
    }
    @chmod($directory, 0700);
    foreach ($files as $file) {
        if (is_file($file)) {
            @chmod($file, 0600);
        }
    }
}

function acquireWaitlistLock(string $file, int $operation): void {
    $GLOBALS['waitlistLock'] = fopen($file, 'c+');
    if (!is_resource($GLOBALS['waitlistLock']) || !flock($GLOBALS['waitlistLock'], $operation)) {
        respond(503, ['message' => 'Waitlist is temporarily busy']);
    }
    @chmod($file, 0600);
}

function submissions(string $file): array {
    if (!is_file($file)) {
        return [];
    }

    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!is_array($lines)) {
        return [];
    }

    $items = [];
    foreach ($lines as $line) {
        $line = preg_replace('/^\xEF\xBB\xBF/', '', $line) ?? $line;
        $decoded = json_decode($line, true);
        if (is_array($decoded)) {
            $items[] = $decoded;
        }
    }
    return $items;
}

function publicPosition(array $record, int $positionStart): int {
    $stored = (int) ($record['position'] ?? 0);
    if ($stored <= 0) {
        return $positionStart;
    }
    if (($record['positionScheme'] ?? '') === 'public-v2') {
        return $stored;
    }
    return $stored + $positionStart - 1;
}

function highestPosition(array $items, int $positionStart): int {
    $max = 0;
    foreach ($items as $item) {
        $max = max($max, publicPosition($item, $positionStart));
    }
    return $max;
}

function nextPosition(array $items, int $positionStart): int {
    return max($positionStart, highestPosition($items, $positionStart) + 1);
}

function rateLimited(string $file, string $key): bool {
    $window = 10 * 60;
    $limit = 20;
    $now = time();
    $state = [];

    if (is_file($file)) {
        $decoded = json_decode((string) file_get_contents($file), true);
        if (is_array($decoded)) {
            $state = $decoded;
        }
    }

    foreach ($state as $storedKey => $stamps) {
        $fresh = array_values(array_filter(
            is_array($stamps) ? $stamps : [],
            static fn($stamp): bool => is_int($stamp) && ($now - $stamp) < $window
        ));
        if ($fresh === []) {
            unset($state[$storedKey]);
        } else {
            $state[$storedKey] = $fresh;
        }
    }

    $hits = $state[$key] ?? [];
    $hits[] = $now;
    $state[$key] = $hits;
    if (file_put_contents($file, json_encode($state, JSON_UNESCAPED_SLASHES), LOCK_EX) === false) {
        respond(503, ['message' => 'Rate limiter is unavailable']);
    }
    @chmod($file, 0600);
    return count($hits) > $limit;
}

function normalizeStoredPhone(string $value): string {
    $raw = trim($value);
    $digits = preg_replace('/\D+/', '', $raw) ?? '';
    if (substr($raw, 0, 1) === '+') {
        return '+' . $digits;
    }
    if (strlen($digits) === 11 && ($digits[0] === '8' || $digits[0] === '7')) {
        return '+7' . substr($digits, 1);
    }
    if (strlen($digits) === 10) {
        return '+7' . $digits;
    }
    return $raw;
}

function queueStatus(int $position): string {
    if ($position <= 100) return 'mani inner circle';
    if ($position <= 305) return 'Closed beta wave';
    if ($position <= 500) return 'Early crew';
    if ($position <= 750) return 'Ahead of hype';
    if ($position <= 900) return 'On time';
    if ($position <= 1000) return 'Final boarding';
    return 'Waiting list';
}

function legacyReferralCode(int $position): string {
    return 'MANI-' . str_pad((string) $position, 4, '0', STR_PAD_LEFT);
}

function uniqueReferralCode(array $items): string {
    $known = array_fill_keys(array_filter(array_map(
        static fn($item): string => (string) ($item['referralCode'] ?? ''),
        $items
    )), true);
    do {
        $code = 'MANI-' . strtoupper(bin2hex(random_bytes(16)));
    } while (isset($known[$code]));
    return $code;
}

function referralCount(array $items, string $code): int {
    if ($code === '') return 0;
    return count(array_filter(
        $items,
        static fn($item): bool => ($item['referredBy'] ?? '') === $code
    ));
}

function findByReferralCode(array $items, string $code): ?array {
    foreach ($items as $item) {
        if (($item['referralCode'] ?? '') === $code) {
            return $item;
        }
    }
    return null;
}

function referralPayload(array $record, array $items, int $positionStart): array {
    $position = publicPosition($record, $positionStart);
    $code = (string) ($record['referralCode'] ?? legacyReferralCode($position));
    $invitedCount = referralCount($items, $code);
    $priorityPosition = max(1, $position - $invitedCount);
    return [
        'position' => $position,
        'priorityPosition' => $priorityPosition,
        'referralCode' => $code,
        'invitedCount' => $invitedCount,
        'status' => queueStatus($priorityPosition),
    ];
}

function sanitizeAttribution($value): array {
    if (!is_array($value)) return [];
    $clean = [];
    foreach (['source', 'medium', 'campaign', 'content', 'term'] as $key) {
        $clean[$key] = substr(trim((string) ($value[$key] ?? '')), 0, 100);
    }
    return $clean;
}

function stats(array $items, int $positionStart, int $limit): array {
    $registered = min(max($positionStart - 1, highestPosition($items, $positionStart)), $limit);
    return [
        'total' => $limit,
        'registered' => $registered,
        'left' => max($limit - $registered, 0),
        'percent' => min((int) round(($registered / $limit) * 100), 100),
    ];
}

ensureStorage($dataDir, [$dataFile, $rateFile, $lockFile]);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    acquireWaitlistLock($lockFile, LOCK_SH);
    $items = submissions($dataFile);
    $code = strtoupper(trim((string) ($_GET['referralCode'] ?? '')));
    if ($code !== '' && !preg_match('/^[A-Z0-9-]{6,64}$/', $code)) {
        respond(400, ['message' => 'Invalid referral code']);
    }
    if ($code !== '') {
        $record = findByReferralCode($items, $code);
        if ($record === null) {
            respond(404, ['message' => 'Referral identity not found']);
        }
        respond(200, referralPayload($record, $items, $positionStart) + [
            'stats' => stats($items, $positionStart, $limit),
        ]);
    }
    respond(200, stats($items, $positionStart, $limit));
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['message' => 'Method not allowed']);
}

validateOrigin();
$contentType = strtolower(trim((string) ($_SERVER['CONTENT_TYPE'] ?? '')));
if (strpos($contentType, 'application/json') !== 0) {
    respond(415, ['message' => 'Content-Type must be application/json']);
}
$contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($contentLength <= 0 || $contentLength > 32768) {
    respond(413, ['message' => 'Request body size is invalid']);
}

$fileSalt = is_file($saltFile) ? trim((string) file_get_contents($saltFile)) : '';
$fraudSalt = trim((string) (getenv('MANI_REFERRAL_SALT') ?: $fileSalt));
if (strlen($fraudSalt) < 32) {
    respond(503, ['message' => 'Waitlist is temporarily unavailable']);
}

$raw = file_get_contents('php://input') ?: '';
$body = json_decode($raw, true);
if (!is_array($body)) {
    respond(400, ['message' => 'Invalid JSON']);
}

$phone = trim((string) ($body['phone'] ?? ''));
$email = strtolower(trim((string) ($body['email'] ?? '')));
$contact = trim((string) ($body['contact'] ?? 'manual'));
$contactDetails = trim((string) ($body['contactDetails'] ?? ''));
$company = trim((string) ($body['company'] ?? ''));
$pdnConsent = ($body['pdnConsent'] ?? false) === true;
$pdnConsentVersion = trim((string) ($body['pdnConsentVersion'] ?? ''));
$pdnConsentAt = trim((string) ($body['pdnConsentAt'] ?? ''));
$referredBy = strtoupper(trim((string) ($body['ref'] ?? '')));
$page = trim((string) ($body['page'] ?? ''));
$idempotencyKey = trim((string) ($_SERVER['HTTP_IDEMPOTENCY_KEY'] ?? ($body['idempotencyKey'] ?? '')));
$heroHeadlineVariant = strtolower(trim((string) ($body['heroHeadlineVariant'] ?? '')));
$ctaLocation = strtolower(trim((string) ($body['ctaLocation'] ?? 'unknown')));
$firstTouch = sanitizeAttribution($body['firstTouch'] ?? []);
$lastTouch = sanitizeAttribution($body['lastTouch'] ?? []);

if ($company !== '') {
    respond(400, ['message' => 'Bot request rejected']);
}
if ($idempotencyKey !== '' && !preg_match('/^[A-Za-z0-9-]{16,100}$/', $idempotencyKey)) {
    respond(400, ['message' => 'Invalid idempotency key']);
}
if ($heroHeadlineVariant !== '' && !in_array($heroHeadlineVariant, ['chaos', 'order'], true)) {
    respond(400, ['message' => 'Invalid hero headline variant']);
}
if (!preg_match('/^[a-z0-9_-]{1,64}$/', $ctaLocation)) {
    respond(400, ['message' => 'Invalid CTA location']);
}
if ($referredBy !== '' && !preg_match('/^[A-Z0-9-]{6,64}$/', $referredBy)) {
    respond(400, ['message' => 'Invalid referral code']);
}
if (
    strlen($email) > 254 ||
    strlen($contact) > 40 ||
    strlen($contactDetails) > 2000 ||
    strlen($page) > 1200 ||
    strlen($pdnConsentVersion) > 400 ||
    strlen($pdnConsentAt) > 200
) {
    respond(400, ['message' => 'One or more fields are too long']);
}
if (!preg_match('/^\+\d{10,15}$/', $phone) || ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL))) {
    respond(400, ['message' => 'Valid international phone is required. Email must be valid if provided.']);
}
if (!$pdnConsent) {
    respond(400, ['message' => 'Personal data consent is required.']);
}

acquireWaitlistLock($lockFile, LOCK_EX);
$allSubmissions = submissions($dataFile);

if ($idempotencyKey !== '') {
    foreach ($allSubmissions as $item) {
        if (($item['idempotencyKey'] ?? '') === $idempotencyKey) {
            respond(200, referralPayload($item, $allSubmissions, $positionStart) + [
                'duplicate' => true,
                'stats' => stats($allSubmissions, $positionStart, $limit),
                'referredByAccepted' => !empty($item['referredBy']),
            ]);
        }
    }
}

$rateKey = hash_hmac('sha256', clientIp(), $fraudSalt);
if (rateLimited($rateFile, $rateKey)) {
    maniAnalyticsServerEvent('api_error', [
        'page_path' => '/api/waitlist',
        'status_code' => 429,
        'error_type' => 'waitlist_rate_limit',
    ]);
    respond(429, ['message' => 'Too many requests. Try again later.']);
}

foreach ($allSubmissions as $item) {
    $samePhone = normalizeStoredPhone((string) ($item['phone'] ?? '')) === normalizeStoredPhone($phone);
    $sameEmail = $email !== '' && strtolower((string) ($item['email'] ?? '')) === $email;
    if ($samePhone || $sameEmail) {
        respond(200, referralPayload($item, $allSubmissions, $positionStart) + [
            'duplicate' => true,
            'stats' => stats($allSubmissions, $positionStart, $limit),
            'referredByAccepted' => false,
        ]);
    }
}

$acceptedReferrer = findByReferralCode($allSubmissions, $referredBy) !== null ? $referredBy : '';
$position = nextPosition($allSubmissions, $positionStart);
$record = [
    'position' => $position,
    'positionScheme' => 'public-v2',
    'status' => queueStatus($position),
    'referralCode' => uniqueReferralCode($allSubmissions),
    'referredBy' => $acceptedReferrer,
    'phone' => $phone,
    'email' => $email,
    'contact' => $contact,
    'contactDetails' => $contactDetails,
    'pdnConsent' => $pdnConsent,
    'pdnConsentVersion' => $pdnConsentVersion,
    'pdnConsentAt' => $pdnConsentAt,
    'page' => $page,
    'idempotencyKey' => $idempotencyKey,
    'heroHeadlineVariant' => $heroHeadlineVariant,
    'ctaLocation' => $ctaLocation,
    'firstTouch' => $firstTouch,
    'lastTouch' => $lastTouch,
    'createdAt' => gmdate('c'),
];

$encoded = json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($encoded === false || file_put_contents($dataFile, $encoded . PHP_EOL, FILE_APPEND | LOCK_EX) === false) {
    respond(500, ['message' => 'Cannot save request']);
}
@chmod($dataFile, 0600);

$updated = array_merge($allSubmissions, [$record]);
respond(200, referralPayload($record, $updated, $positionStart) + [
    'stats' => stats($updated, $positionStart, $limit),
    'referredByAccepted' => $acceptedReferrer !== '',
]);
