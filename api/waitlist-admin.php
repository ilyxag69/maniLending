<?php
declare(strict_types=1);

$configuredDataDir = trim((string) getenv('MANI_DATA_DIR'));
$privateDataDir = dirname(__DIR__, 3) . '/private/mani-waitlist';
$dataDir = $configuredDataDir !== ''
    ? rtrim($configuredDataDir, '/\\')
    : (is_dir($privateDataDir) ? $privateDataDir : dirname(__DIR__) . '/data');
$tokenFile = $dataDir . '/admin-token.txt';
$dataFile = $dataDir . '/waitlist-submissions.jsonl';
$lockFile = $dataDir . '/waitlist.lock';
$fileToken = is_file($tokenFile) ? trim((string) file_get_contents($tokenFile)) : '';
$token = trim((string) (getenv('MANI_ADMIN_TOKEN') ?: $fileToken));
$authorization = trim((string) ($_SERVER['HTTP_AUTHORIZATION'] ?? ''));
$bearer = stripos($authorization, 'Bearer ') === 0 ? trim(substr($authorization, 7)) : '';
$basicPassword = trim((string) ($_SERVER['PHP_AUTH_PW'] ?? ''));
$provided = $bearer !== '' ? $bearer : $basicPassword;

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

header('Cache-Control: no-store, private');
header('Pragma: no-cache');
header('Referrer-Policy: no-referrer');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");

$loginCsrf = (string) ($_SESSION['loginCsrf'] ?? '');
if ($loginCsrf === '') {
    $loginCsrf = bin2hex(random_bytes(24));
    $_SESSION['loginCsrf'] = $loginCsrf;
}
$loginError = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && array_key_exists('loginPassword', $_POST)) {
    $origin = rtrim(trim((string) ($_SERVER['HTTP_ORIGIN'] ?? '')), '/');
    $allowedOrigins = ['https://moimani.ai', 'https://www.moimani.ai'];
    $providedLoginCsrf = (string) ($_POST['loginCsrf'] ?? '');
    $loginPassword = trim((string) ($_POST['loginPassword'] ?? ''));
    if (
        ($origin === '' || in_array($origin, $allowedOrigins, true))
        && hash_equals($loginCsrf, $providedLoginCsrf)
        && $token !== ''
        && hash_equals($token, $loginPassword)
    ) {
        session_regenerate_id(true);
        $_SESSION['authenticated'] = true;
        unset($_SESSION['loginCsrf']);
        header('Location: /api/waitlist-admin.php', true, 303);
        exit;
    }
    usleep(700000);
    $loginError = 'Неверный пароль';
}

$sessionAuthenticated = ($_SESSION['authenticated'] ?? false) === true;
$headerAuthenticated = $token !== '' && $provided !== '' && hash_equals($token, $provided);
if (!$sessionAuthenticated && !$headerAuthenticated) {
    header('Content-Type: text/html; charset=utf-8');
    ?>
    <!doctype html>
    <html lang="ru">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Вход в админку mani</title>
        <style>
          * { box-sizing: border-box; }
          body { min-height: 100vh; display: grid; place-items: center; margin: 0; padding: 20px; background: #f5f8fc; color: #101a2d; font-family: Inter, Arial, sans-serif; }
          main { width: min(420px, 100%); padding: 30px; border: 1px solid #e1e8f2; border-radius: 24px; background: #fff; box-shadow: 0 24px 70px rgba(37,64,101,.12); }
          h1 { margin: 0 0 8px; font-size: 28px; }
          p { margin: 0 0 22px; color: #66738a; line-height: 1.5; }
          label { display: grid; gap: 8px; font-weight: 700; }
          input { width: 100%; min-height: 50px; border: 1px solid #d8e1ee; border-radius: 13px; padding: 0 14px; font: inherit; }
          input:focus { outline: 3px solid rgba(255,96,32,.14); border-color: #ff6020; }
          button { width: 100%; min-height: 50px; margin-top: 14px; border: 0; border-radius: 13px; background: #ff6020; color: #fff; font: inherit; font-weight: 800; cursor: pointer; }
          .error { margin: 12px 0 0; color: #b74225; font-weight: 700; }
        </style>
      </head>
      <body>
        <main>
          <h1>Админка mani</h1>
          <p>Введи пароль администратора, чтобы открыть список заявок.</p>
          <form method="post" action="/api/waitlist-admin.php">
            <input type="hidden" name="loginCsrf" value="<?= htmlspecialchars($loginCsrf, ENT_QUOTES) ?>" />
            <label>Пароль<input name="loginPassword" type="password" autocomplete="current-password" required autofocus /></label>
            <button type="submit">Войти</button>
            <?php if ($loginError !== ''): ?><div class="error" role="alert"><?= htmlspecialchars($loginError, ENT_QUOTES) ?></div><?php endif; ?>
          </form>
        </main>
      </body>
    </html>
    <?php
    exit;
}

$positionStart = max(1, (int) (getenv('MANI_WAITLIST_POSITION_START') ?: 306));
$csrfToken = hash_hmac('sha256', 'waitlist-admin-csrf-v1', $token);

function publicPosition(array $record, int $positionStart): int {
    $stored = (int) ($record['position'] ?? 0);
    if ($stored <= 0) return $positionStart;
    if (($record['positionScheme'] ?? '') === 'public-v2') return $stored;
    return $stored + $positionStart - 1;
}

function rows(string $file): array {
    if (!is_file($file)) return [];
    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!is_array($lines)) return [];
    $items = [];
    foreach ($lines as $line) {
        $line = preg_replace('/^\xEF\xBB\xBF/', '', $line) ?? $line;
        $decoded = json_decode($line, true);
        if (is_array($decoded)) $items[] = $decoded;
    }
    return $items;
}

function csvSafe($value): string {
    $text = (string) $value;
    return preg_match('/^[=+\-@]/', $text) ? "'" . $text : $text;
}

function withLock(string $lockFile, int $operation, callable $callback) {
    $lock = fopen($lockFile, 'c+');
    if (!is_resource($lock) || !flock($lock, $operation)) {
        http_response_code(503);
        echo 'Waitlist is temporarily busy';
        exit;
    }
    @chmod($lockFile, 0600);
    try {
        return $callback();
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

function originAllowed(): bool {
    $origin = rtrim(trim((string) ($_SERVER['HTTP_ORIGIN'] ?? '')), '/');
    if ($origin === '') return true;
    $configured = trim((string) getenv('MANI_ALLOWED_ORIGINS'));
    $allowed = array_values(array_filter(array_map(
        static fn(string $value): string => rtrim(trim($value), '/'),
        explode(',', $configured !== '' ? $configured : 'https://moimani.ai,https://www.moimani.ai')
    )));
    return in_array($origin, $allowed, true);
}

if (!is_dir($dataDir)) {
    http_response_code(503);
    echo 'Storage is unavailable';
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!originAllowed()) {
        http_response_code(403);
        echo 'Request origin is not allowed';
        exit;
    }
    $providedCsrf = (string) ($_POST['csrf'] ?? '');
    if ($providedCsrf === '' || !hash_equals($csrfToken, $providedCsrf)) {
        http_response_code(403);
        echo 'Invalid CSRF token';
        exit;
    }
    $code = trim((string) ($_POST['code'] ?? ''));
    if (!preg_match('/^[A-Z0-9-]{6,64}$/', $code)) {
        http_response_code(400);
        echo 'Invalid referral code';
        exit;
    }
    withLock($lockFile, LOCK_EX, static function () use ($dataFile, $dataDir, $code): void {
        $currentRows = rows($dataFile);
        $kept = array_values(array_filter(
            $currentRows,
            static fn($row): bool => ($row['referralCode'] ?? '') !== $code
        ));
        $encoded = array_map(
            static fn($row): string => (string) json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            $kept
        );
        $temporary = tempnam($dataDir, 'waitlist-');
        if ($temporary === false || file_put_contents($temporary, implode(PHP_EOL, $encoded) . ($encoded ? PHP_EOL : '')) === false) {
            http_response_code(500);
            echo 'Cannot update waitlist';
            exit;
        }
        @chmod($temporary, 0600);
        if (PHP_OS_FAMILY === 'Windows' && is_file($dataFile)) {
            unlink($dataFile);
        }
        if (!rename($temporary, $dataFile)) {
            @unlink($temporary);
            http_response_code(500);
            echo 'Cannot update waitlist';
            exit;
        }
        @chmod($dataFile, 0600);
    });
    header('Location: ' . strtok((string) ($_SERVER['REQUEST_URI'] ?? '/api/waitlist-admin.php'), '?'));
    exit;
}

$allRows = withLock($lockFile, LOCK_SH, static fn(): array => rows($dataFile));
$query = strtolower(trim((string) ($_GET['q'] ?? '')));
$visibleRows = $query === ''
    ? $allRows
    : array_values(array_filter(
        $allRows,
        static fn($row): bool => strpos(
            strtolower(json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: ''),
            $query
        ) !== false
    ));

if (($_GET['format'] ?? '') === 'jsonl') {
    header('Content-Type: application/x-ndjson; charset=utf-8');
    header('Content-Disposition: attachment; filename="waitlist-submissions.jsonl"');
    foreach ($allRows as $row) {
        echo json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;
    }
    exit;
}

if (($_GET['format'] ?? '') === 'csv') {
    $columns = ['position', 'phone', 'email', 'contactDetails', 'heroHeadlineVariant', 'ctaLocation', 'pdnConsent', 'pdnConsentVersion', 'referralCode', 'referredBy', 'idempotencyKey', 'createdAt', 'page'];
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="waitlist-submissions.csv"');
    $out = fopen('php://output', 'wb');
    fputcsv($out, $columns);
    foreach ($allRows as $row) {
        $row['position'] = publicPosition($row, $positionStart);
        fputcsv($out, array_map(static fn($column): string => csvSafe($row[$column] ?? ''), $columns));
    }
    fclose($out);
    exit;
}

header('Content-Type: text/html; charset=utf-8');
?>
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>mani waitlist admin</title>
    <style>
      body { margin: 24px; color: #222329; font-family: Inter, Arial, sans-serif; }
      .top { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 18px; }
      .tools { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
      table { width: 100%; border-collapse: collapse; font-size: 14px; }
      th, td { padding: 10px; border: 1px solid #ececf0; text-align: left; vertical-align: top; }
      th { background: #f4f4f6; }
      input { min-height: 38px; border: 1px solid #ddd; border-radius: 10px; padding: 0 10px; }
      button, .btn { min-height: 38px; border: 0; border-radius: 10px; background: #fa5d27; color: #fff; padding: 0 12px; font-weight: 800; text-decoration: none; cursor: pointer; }
      .btn.secondary { background: #f4f4f6; color: #222329; }
      a { color: #fa5d27; font-weight: 800; }
    </style>
  </head>
  <body>
    <div class="top">
      <h1>Waitlist: <?= count($allRows) ?><?= $query !== '' ? ' / найдено ' . count($visibleRows) : '' ?></h1>
      <div class="tools">
        <form method="get">
          <input name="q" value="<?= htmlspecialchars($query, ENT_QUOTES) ?>" placeholder="Телефон, email или код" />
          <button>Найти</button>
        </form>
        <a class="btn secondary" href="?">Сбросить</a>
        <a class="btn secondary" href="?format=jsonl">JSONL</a>
        <a class="btn secondary" href="?format=csv">CSV</a>
        <a class="btn secondary" href="/api/analytics-admin.php">Аналитика</a>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Место</th>
          <th>Телефон</th>
          <th>Email</th>
          <th>Комментарий / канал связи</th>
          <th>Заголовок</th>
          <th>Согласие</th>
          <th>Версия согласия</th>
          <th>Код</th>
          <th>Пригласил</th>
          <th>Приглашено</th>
          <th>Дата</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($visibleRows as $row): ?>
          <tr>
            <td>#<?= publicPosition($row, $positionStart) ?></td>
            <td><?= htmlspecialchars((string) ($row['phone'] ?? ''), ENT_QUOTES) ?></td>
            <td><?= htmlspecialchars((string) ($row['email'] ?? ''), ENT_QUOTES) ?></td>
            <td><?= htmlspecialchars((string) ($row['contactDetails'] ?? ''), ENT_QUOTES) ?></td>
            <td><?= htmlspecialchars(match ($row['heroHeadlineVariant'] ?? '') {
                'chaos' => 'Хаос',
                'order' => 'Порядок',
                default => '—',
            }, ENT_QUOTES) ?></td>
            <td><?= !empty($row['pdnConsent']) ? 'да' : '' ?></td>
            <td><?= htmlspecialchars((string) ($row['pdnConsentVersion'] ?? ''), ENT_QUOTES) ?></td>
            <td><?= htmlspecialchars((string) ($row['referralCode'] ?? ''), ENT_QUOTES) ?></td>
            <td><?= htmlspecialchars((string) ($row['referredBy'] ?? ''), ENT_QUOTES) ?></td>
            <td><?= count(array_filter($allRows, static fn($candidate) => ($candidate['referredBy'] ?? '') === ($row['referralCode'] ?? ''))) ?></td>
            <td><?= htmlspecialchars((string) ($row['createdAt'] ?? ''), ENT_QUOTES) ?></td>
            <td>
              <form method="post" onsubmit="return confirm('Удалить заявку?')">
                <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrfToken, ENT_QUOTES) ?>" />
                <input type="hidden" name="code" value="<?= htmlspecialchars((string) ($row['referralCode'] ?? ''), ENT_QUOTES) ?>" />
                <button>Удалить</button>
              </form>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </body>
</html>
