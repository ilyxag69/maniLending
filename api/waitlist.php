<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$baseCount = 0;
$limit = 1000;
$dataDir = dirname(__DIR__) . '/data';
$dataFile = $dataDir . '/waitlist-submissions.jsonl';
$rateFile = $dataDir . '/waitlist-rate-limit.json';

function respond(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function submissionCount(string $file): int {
    if (!is_file($file)) {
        return 0;
    }

    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    return is_array($lines) ? count($lines) : 0;
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

function nextPosition(string $file): int {
    $max = 0;
    foreach (submissions($file) as $item) {
        $position = (int) ($item['position'] ?? 0);
        if ($position > $max) {
            $max = $position;
        }
    }
    return $max + 1;
}

function rateLimited(string $file, string $key): bool {
    $window = 10 * 60;
    $limit = 5;
    $now = time();
    $state = [];

    if (is_file($file)) {
        $decoded = json_decode((string) file_get_contents($file), true);
        if (is_array($decoded)) {
            $state = $decoded;
        }
    }

    $hits = array_values(array_filter($state[$key] ?? [], static fn($stamp) => is_int($stamp) && ($now - $stamp) < $window));
    $hits[] = $now;
    $state[$key] = $hits;
    file_put_contents($file, json_encode($state, JSON_UNESCAPED_SLASHES), LOCK_EX);

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
    if ($position <= 100) {
        return 'Founding users';
    }
    if ($position <= 500) {
        return 'Early crew';
    }
    if ($position <= 1000) {
        return 'Last free access';
    }
    return 'Waiting list';
}

function referralCode(int $position): string {
    return 'MANI-' . str_pad((string) $position, 4, '0', STR_PAD_LEFT);
}

function stats(string $file, int $baseCount, int $limit): array {
    $registered = min($baseCount + submissionCount($file), $limit);
    $left = max($limit - $registered, 0);
    $percent = min((int) round(($registered / $limit) * 100), 100);

    return [
        'total' => $limit,
        'registered' => $registered,
        'left' => $left,
        'percent' => $percent,
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    respond(200, stats($dataFile, $baseCount, $limit));
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['message' => 'Method not allowed']);
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
$referredBy = trim((string) ($body['ref'] ?? ''));
$page = trim((string) ($body['page'] ?? ''));

if ($company !== '') {
    respond(400, ['message' => 'Bot request rejected']);
}

if (!is_dir($dataDir) && !mkdir($dataDir, 0755, true) && !is_dir($dataDir)) {
    respond(500, ['message' => 'Cannot create data directory']);
}

if (rateLimited($rateFile, $_SERVER['REMOTE_ADDR'] ?? 'unknown')) {
    respond(429, ['message' => 'Too many requests. Try again later.']);
}

if (!preg_match('/^\+\d{10,15}$/', $phone) || ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL))) {
    respond(400, ['message' => 'Valid international phone is required. Email must be valid if provided.']);
}

if (!$pdnConsent) {
    respond(400, ['message' => 'Personal data consent is required.']);
}

$existing = null;
foreach (submissions($dataFile) as $item) {
    if (normalizeStoredPhone((string) ($item['phone'] ?? '')) === normalizeStoredPhone($phone) || ($email !== '' && ($item['email'] ?? '') === $email)) {
        $existing = $item;
        break;
    }
}

if (is_array($existing)) {
    $position = (int) ($existing['position'] ?? 0);
    respond(200, [
        'duplicate' => true,
        'position' => $position,
        'referralCode' => $existing['referralCode'] ?? referralCode($position),
        'status' => queueStatus($position),
        'stats' => stats($dataFile, $baseCount, $limit),
    ]);
}

$position = $baseCount + nextPosition($dataFile);
$record = [
    'position' => $position,
    'status' => queueStatus($position),
    'referralCode' => referralCode($position),
    'referredBy' => $referredBy,
    'phone' => $phone,
    'email' => $email,
    'contact' => $contact,
    'contactDetails' => $contactDetails,
    'pdnConsent' => $pdnConsent,
    'pdnConsentVersion' => $pdnConsentVersion,
    'pdnConsentAt' => $pdnConsentAt,
    'page' => $page,
    'createdAt' => gmdate('c'),
    'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
    'userAgent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
];

$written = file_put_contents(
    $dataFile,
    json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL,
    FILE_APPEND | LOCK_EX
);

if ($written === false) {
    respond(500, ['message' => 'Cannot save request']);
}

respond(200, [
    'position' => $position,
    'referralCode' => $record['referralCode'],
    'status' => $record['status'],
    'stats' => stats($dataFile, $baseCount, $limit),
]);
