<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function contactRespond(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function contactAllowedOrigins(): array {
    $configured = trim((string) getenv('MANI_ALLOWED_ORIGINS'));
    $value = $configured !== '' ? $configured : 'https://moimani.ai,https://www.moimani.ai';
    return array_values(array_filter(array_map(
        static fn(string $origin): string => rtrim(trim($origin), '/'),
        explode(',', $value)
    )));
}

function contactLength(string $value): int {
    return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    header('Allow: POST');
    contactRespond(405, ['message' => 'Method not allowed']);
}

$origin = rtrim(trim((string) ($_SERVER['HTTP_ORIGIN'] ?? '')), '/');
if ($origin !== '' && !in_array($origin, contactAllowedOrigins(), true)) {
    contactRespond(403, ['message' => 'Request origin is not allowed']);
}

$contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
if (!str_contains($contentType, 'application/json')) {
    contactRespond(415, ['message' => 'Content type must be application/json']);
}

$raw = file_get_contents('php://input');
$body = json_decode(is_string($raw) ? $raw : '', true);
if (!is_array($body)) {
    contactRespond(400, ['message' => 'Некорректный запрос']);
}

$name = trim((string) ($body['name'] ?? ''));
$replyTo = trim((string) ($body['replyTo'] ?? ''));
$topic = trim((string) ($body['topic'] ?? ''));
$message = trim((string) ($body['message'] ?? ''));
$website = trim((string) ($body['website'] ?? ''));
$consent = ($body['pdnConsent'] ?? false) === true;
$allowedTopics = ['Предложение', 'Техподдержка', 'Другое'];

if ($website !== '') {
    contactRespond(200, ['ok' => true]);
}
if (!$consent || $name === '' || contactLength($name) > 80 || $replyTo === '' || contactLength($replyTo) > 120 ||
    !in_array($topic, $allowedTopics, true) || contactLength($message) < 10 || contactLength($message) > 3000) {
    contactRespond(422, ['message' => 'Проверь обязательные поля формы']);
}
if (preg_match('/[\r\n]/', $replyTo) || preg_match('/[\r\n]/', $name)) {
    contactRespond(422, ['message' => 'Некорректные данные']);
}

$dataDir = trim((string) getenv('MANI_DATA_DIR'));
$privateDataDir = dirname(__DIR__, 3) . '/private/mani-waitlist';
$dataDir = $dataDir !== ''
    ? rtrim($dataDir, '/\\')
    : (is_dir($privateDataDir) ? $privateDataDir : dirname(__DIR__) . '/data');
if (!is_dir($dataDir) && !mkdir($dataDir, 0700, true) && !is_dir($dataDir)) {
    contactRespond(500, ['message' => 'Сервис временно недоступен']);
}
$rateFile = $dataDir . '/contact-rate-limit.json';
$remote = trim((string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
$rateKey = hash('sha256', $remote . '|' . date('Y-m-d-H'));
$rateData = [];
if (is_file($rateFile)) {
    $decoded = json_decode((string) file_get_contents($rateFile), true);
    if (is_array($decoded)) $rateData = $decoded;
}
$rateData = array_filter($rateData, static fn($item): bool => is_array($item) && (int) ($item['expires'] ?? 0) > time());
$attempts = (int) ($rateData[$rateKey]['count'] ?? 0);
if ($attempts >= 5) {
    contactRespond(429, ['message' => 'Слишком много сообщений. Попробуй немного позже.']);
}
$rateData[$rateKey] = ['count' => $attempts + 1, 'expires' => time() + 7200];
file_put_contents($rateFile, json_encode($rateData), LOCK_EX);
@chmod($rateFile, 0600);

$recipient = 'moimani.ai@gmail.com';
$subjectText = 'mani: ' . $topic . ' от ' . $name;
$subject = '=?UTF-8?B?' . base64_encode($subjectText) . '?=';
$safeReplyEmail = filter_var($replyTo, FILTER_VALIDATE_EMAIL) ? $replyTo : '';
$ticketNumber = 'MANI-' . gmdate('ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
$lines = [
    'Новое обращение с moimani.ai',
    '',
    'Номер обращения: ' . $ticketNumber,
    'Тема: ' . $topic,
    'Имя: ' . $name,
    'Контакт для ответа: ' . $replyTo,
    'Дата: ' . date(DATE_ATOM),
    '',
    'Сообщение:',
    $message,
];
$headers = [
    'From: mani <no-reply@moimani.ai>',
    'Content-Type: text/plain; charset=UTF-8',
    'MIME-Version: 1.0',
];
if ($safeReplyEmail !== '') $headers[] = 'Reply-To: ' . $safeReplyEmail;

if (!mail($recipient, $subject, implode("\r\n", $lines), implode("\r\n", $headers))) {
    contactRespond(503, ['message' => 'Не удалось отправить сообщение. Напиши нам в Telegram.']);
}

contactRespond(200, ['ok' => true, 'message' => 'Сигнал принят', 'ticket' => $ticketNumber]);
