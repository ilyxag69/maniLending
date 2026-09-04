<?php
declare(strict_types=1);

ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
session_name('mani_waitlist_admin');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => true,
    'httponly' => true,
    'samesite' => 'Strict',
]);
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('Pragma: no-cache');
header('Referrer-Policy: no-referrer');
header('X-Robots-Tag: noindex, nofollow, noarchive');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'");

function previewSend(int $status, array $payload): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (($_SESSION['authenticated'] ?? false) !== true) {
    previewSend(401, ['error' => ['code' => 'authentication_required', 'message' => 'Сначала войдите в закрытый тест MANI.']]);
}

$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
if (!in_array($method, ['GET', 'HEAD'], true)) {
    $origin = trim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''));
    $originHost = $origin !== '' ? strtolower((string) parse_url($origin, PHP_URL_HOST)) : '';
    $requestHost = strtolower(preg_replace('/:\d+$/', '', (string) ($_SERVER['HTTP_HOST'] ?? '')) ?? '');
    if ($originHost !== '' && !hash_equals($requestHost, $originHost)) {
        previewSend(403, ['error' => ['code' => 'origin_rejected', 'message' => 'Запрос с другого сайта отклонён.']]);
    }
}

$routeValue = (string) ($_GET['route'] ?? '/api/session');
$routePath = (string) (parse_url($routeValue, PHP_URL_PATH) ?: '/api/session');
$routeQuery = [];
parse_str((string) (parse_url($routeValue, PHP_URL_QUERY) ?: ''), $routeQuery);
$body = json_decode((string) file_get_contents('php://input'), true);
$body = is_array($body) ? $body : [];
$fixture = json_decode((string) file_get_contents(__DIR__ . '/preview-data.json'), true);
if (!is_array($fixture)) previewSend(500, ['error' => ['code' => 'preview_data_unavailable', 'message' => 'Тестовые данные временно недоступны.']]);

$privateRoot = dirname(__DIR__, 3) . '/private/mani-app-preview';
if (!is_dir($privateRoot)) @mkdir($privateRoot, 0700, true);
@chmod($privateRoot, 0700);
$eventFile = $privateRoot . '/events.jsonl';

function previewClean($value, int $limit = 100): string {
    $text = trim(preg_replace('/[\x00-\x1F\x7F]+/u', ' ', (string) $value) ?? '');
    return mb_substr($text, 0, $limit, 'UTF-8');
}

function previewDevice(): string {
    $ua = strtolower((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''));
    if (preg_match('/ipad|tablet/', $ua)) return 'tablet';
    if (preg_match('/mobile|iphone|android/', $ua)) return 'mobile';
    return 'desktop';
}

function previewRecord(string $file, string $event, array $metadata = []): void {
    $row = [
        'occurred_at' => gmdate('c'),
        'session_hash' => hash('sha256', session_id()),
        'event' => previewClean($event, 64),
        'device' => previewDevice(),
        'metadata' => $metadata,
    ];
    @file_put_contents($file, json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n", FILE_APPEND | LOCK_EX);
    @chmod($file, 0600);
}

previewRecord($eventFile, 'api_request', ['route' => previewClean($routePath, 100), 'method' => $method]);

$user = $fixture['user'];
$defaultProfile = [
    'display_name' => '',
    'assistant_tone' => 'mentor',
    'onboarding_completed' => false,
    'survey' => [],
    'updated_at' => null,
];
if (!isset($_SESSION['mani_preview_profile']) || !is_array($_SESSION['mani_preview_profile'])) {
    $_SESSION['mani_preview_profile'] = $defaultProfile;
}
if (!isset($_SESSION['mani_preview_chat']) || !is_array($_SESSION['mani_preview_chat'])) {
    $_SESSION['mani_preview_chat'] = [];
}

if ($method === 'POST' && $routePath === '/api/preview-event') {
    $allowedEvents = ['preview_open', 'screen_view', 'control_click', 'js_error'];
    $event = previewClean($body['event'] ?? '', 64);
    if (!in_array($event, $allowedEvents, true)) $event = 'unknown_preview_event';
    previewRecord($eventFile, $event, [
        'page' => previewClean($body['page'] ?? '', 64),
        'action' => previewClean($body['action'] ?? '', 100),
        'viewport' => preg_match('/^\d{2,5}x\d{2,5}$/', (string) ($body['viewport'] ?? '')) ? (string) $body['viewport'] : '',
        'build' => previewClean($body['build'] ?? '', 40),
    ]);
    previewSend(201, ['ok' => true]);
}

if ($method === 'GET' && $routePath === '/api/session') previewSend(200, ['user' => $user]);
if ($method === 'GET' && $routePath === '/api/profile') previewSend(200, ['user' => $user, 'preferences' => $_SESSION['mani_preview_profile']]);
if ($method === 'PATCH' && $routePath === '/api/profile') {
    $profile = $_SESSION['mani_preview_profile'];
    if (array_key_exists('display_name', $body)) $profile['display_name'] = previewClean($body['display_name'], 80);
    if (array_key_exists('assistant_tone', $body) && in_array($body['assistant_tone'], ['mentor', 'roaster'], true)) $profile['assistant_tone'] = $body['assistant_tone'];
    if (array_key_exists('onboarding_completed', $body)) $profile['onboarding_completed'] = $body['onboarding_completed'] === true;
    if (isset($body['survey']) && is_array($body['survey'])) $profile['survey'] = $body['survey'];
    $profile['updated_at'] = gmdate('c');
    $_SESSION['mani_preview_profile'] = $profile;
    previewRecord($eventFile, 'profile_updated', ['assistant_tone' => $profile['assistant_tone'], 'onboarding_completed' => $profile['onboarding_completed']]);
    previewSend(200, ['user' => $user, 'preferences' => $profile]);
}
if ($method === 'DELETE' && $routePath === '/api/profile') {
    $_SESSION['mani_preview_profile'] = $defaultProfile;
    $_SESSION['mani_preview_chat'] = [];
    previewRecord($eventFile, 'preview_reset');
    previewSend(200, ['ok' => true]);
}
if ($method === 'GET' && $routePath === '/api/dashboard') previewSend(200, $fixture['dashboard']);
if ($method === 'GET' && $routePath === '/api/transactions') {
    $items = is_array($fixture['transactions'] ?? null) ? $fixture['transactions'] : [];
    $month = previewClean($routeQuery['month'] ?? '', 7);
    $category = previewClean($routeQuery['category'] ?? '', 100);
    $flow = previewClean($routeQuery['flow'] ?? '', 16);
    $items = array_values(array_filter($items, static function (array $item) use ($month, $category, $flow): bool {
        if ($month !== '' && substr((string) ($item['occurred_at'] ?? ''), 0, 7) !== $month) return false;
        if ($category !== '' && (string) ($item['category'] ?? '') !== $category) return false;
        $amount = (float) ($item['amount'] ?? 0);
        if ($flow === 'income' && $amount <= 0) return false;
        if ($flow === 'expense' && $amount >= 0) return false;
        return true;
    }));
    usort($items, static fn(array $a, array $b): int => strcmp((string) ($b['occurred_at'] ?? ''), (string) ($a['occurred_at'] ?? '')));
    $offset = max(0, (int) ($routeQuery['offset'] ?? 0));
    $limit = min(500, max(1, (int) ($routeQuery['limit'] ?? 100)));
    $total = count($items);
    $page = array_slice($items, $offset, $limit);
    previewSend(200, ['items' => $page, 'total' => $total, 'has_more' => $offset + count($page) < $total]);
}
if ($method === 'GET' && $routePath === '/api/assistant/messages') previewSend(200, ['items' => $_SESSION['mani_preview_chat'], 'total' => count($_SESSION['mani_preview_chat']), 'mode' => 'preview_rules']);
if ($method === 'POST' && $routePath === '/api/assistant/chat') {
    $message = previewClean($body['message'] ?? '', 600);
    if ($message === '') previewSend(400, ['error' => ['code' => 'invalid_message', 'message' => 'Введите вопрос.']]);
    $answer = str_contains(mb_strtolower($message, 'UTF-8'), 'подпис')
        ? 'В демо-наборе MANI нашёл регулярные списания. Откройте главную или отчёт, чтобы посмотреть сумму и уверенность прогноза.'
        : 'Это закрытый мобильный тест. Я использую только синтетический набор и показываю, как будет выглядеть разбор после подключения реальных банков.';
    $now = gmdate('c');
    $_SESSION['mani_preview_chat'][] = ['id' => bin2hex(random_bytes(8)), 'role' => 'user', 'content' => $message, 'created_at' => $now];
    $_SESSION['mani_preview_chat'][] = ['id' => bin2hex(random_bytes(8)), 'role' => 'assistant', 'content' => $answer, 'created_at' => $now];
    previewRecord($eventFile, 'assistant_used');
    previewSend(201, ['answer' => $answer, 'mode' => 'preview_rules']);
}
if ($method === 'POST' && in_array($routePath, ['/api/auth/login', '/api/auth/register'], true)) previewSend(200, ['user' => $user]);
if ($method === 'POST' && $routePath === '/api/auth/logout') previewSend(200, ['ok' => true]);
if ($method === 'POST' && $routePath === '/api/imports/demo') previewSend(201, ['import' => ['import_id' => 'preview-demo', 'accounts' => 2, 'transactions' => 23, 'objects' => 0], 'dashboard' => $fixture['dashboard']]);
if ($method === 'GET' && $routePath === '/api/local-connectors/tbank/status') previewSend(200, ['provider' => 'tbank', 'state' => 'closed', 'remember' => false, 'saved_session_available' => false, 'automatic_sync' => false]);
if ($method === 'POST' && $routePath === '/api/local-connectors/tbank/start') previewSend(200, ['provider' => 'tbank', 'state' => 'error', 'remember' => false, 'saved_session_available' => false, 'automatic_sync' => false, 'error_code' => 'native_shell_required', 'error' => 'На мобильном веб-тесте банковский вход отключён. Он появится в нативной оболочке с постоянным защищённым профилем.']);
if ($method === 'POST' && $routePath === '/api/local-connectors/tbank/close') previewSend(200, ['provider' => 'tbank', 'state' => 'closed', 'remember' => false, 'saved_session_available' => false, 'automatic_sync' => false]);
if ($method === 'POST' && in_array($routePath, ['/api/imports/tbank-statement', '/api/imports/normalized'], true)) previewSend(501, ['error' => ['code' => 'preview_import_disabled', 'message' => 'Импорт реальных финансовых данных отключён в публичном мобильном тесте.']]);
if ($method === 'DELETE' && preg_match('#^/api/banks/[a-z0-9_-]+$#', $routePath)) previewSend(200, ['removed' => ['provider' => basename($routePath), 'transactions' => 0, 'accounts' => 0, 'imports' => 0, 'objects' => 0], 'dashboard' => $fixture['dashboard']]);

previewSend(404, ['error' => ['code' => 'not_found', 'message' => 'Маршрут тестового контура не найден.']]);
