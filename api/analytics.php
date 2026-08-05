<?php
declare(strict_types=1);

require_once __DIR__ . '/analytics-lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    echo '{"message":"Method not allowed"}';
    exit;
}
if (!maniAnalyticsOriginAllowed()) {
    http_response_code(403);
    echo '{"message":"Request origin is not allowed"}';
    exit;
}
$contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
if (!str_contains($contentType, 'application/json')) {
    http_response_code(415);
    echo '{"message":"JSON required"}';
    exit;
}
$raw = file_get_contents('php://input', false, null, 0, 32769);
if (!is_string($raw) || strlen($raw) > 32768) {
    http_response_code(413);
    echo '{"message":"Payload too large"}';
    exit;
}
$payload = json_decode($raw, true);
$events = is_array($payload) && is_array($payload['events'] ?? null) ? $payload['events'] : [];
if ($events === [] || count($events) > 20) {
    http_response_code(400);
    echo '{"message":"Invalid event batch"}';
    exit;
}

try {
    $pdo = maniAnalyticsPdo();
    if (maniAnalyticsRateLimited($pdo, count($events))) {
        http_response_code(429);
        echo '{"message":"Rate limit exceeded"}';
        exit;
    }
    maniAnalyticsInsertEvents($pdo, $events);
    http_response_code(204);
} catch (Throwable $error) {
    error_log('Mani analytics storage error');
    http_response_code(503);
    echo '{"message":"Analytics temporarily unavailable"}';
}
