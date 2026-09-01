<?php
declare(strict_types=1);

require_once __DIR__ . '/analytics-lib.php';

$configuredDataDir = trim((string) getenv('MANI_DATA_DIR'));
$privateDataDir = dirname(__DIR__, 3) . '/private/mani-waitlist';
$dataDir = $configuredDataDir !== ''
    ? rtrim($configuredDataDir, '/\\')
    : (is_dir($privateDataDir) ? $privateDataDir : dirname(__DIR__) . '/data');
$tokenFile = $dataDir . '/admin-token.txt';
$dataFile = $dataDir . '/waitlist-submissions.jsonl';
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
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'");

$sessionAuthenticated = ($_SESSION['authenticated'] ?? false) === true;
$headerAuthenticated = $token !== '' && $provided !== '' && hash_equals($token, $provided);
if (!$sessionAuthenticated && !$headerAuthenticated) {
    header('Location: /api/waitlist-admin.php', true, 303);
    exit;
}

function analyticsRows(string $file): array {
    if (!is_file($file)) return [];
    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!is_array($lines)) return [];
    $rows = [];
    foreach ($lines as $line) {
        $decoded = json_decode(preg_replace('/^\xEF\xBB\xBF/', '', $line) ?? $line, true);
        if (is_array($decoded)) $rows[] = $decoded;
    }
    return $rows;
}

function analyticsGroup(array $rows, callable $key): array {
    $groups = [];
    foreach ($rows as $row) {
        $value = trim((string) $key($row));
        $value = $value !== '' ? $value : 'Не определено';
        $groups[$value] = ($groups[$value] ?? 0) + 1;
    }
    arsort($groups);
    return $groups;
}

function analyticsScalar(PDO $pdo, string $sql, array $params): int {
    $statement = $pdo->prepare($sql);
    $statement->execute($params);
    return (int) $statement->fetchColumn();
}

function analyticsQuery(PDO $pdo, string $sql, array $params): array {
    $statement = $pdo->prepare($sql);
    $statement->execute($params);
    return $statement->fetchAll();
}

function analyticsPercent(int $part, int $whole): string {
    return $whole > 0 ? number_format(($part / $whole) * 100, 1, ',', ' ') . '%' : 'Нет данных';
}

function analyticsP75(array $values): ?float {
    $numbers = array_values(array_map('floatval', $values));
    if ($numbers === []) return null;
    sort($numbers, SORT_NUMERIC);
    return $numbers[(int) max(0, ceil(count($numbers) * 0.75) - 1)];
}

function analyticsH($value): string {
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function analyticsTable(array $rows, string $first, string $second): void {
    ?><table><thead><tr><th><?= analyticsH($first) ?></th><th><?= analyticsH($second) ?></th></tr></thead><tbody><?php
    if ($rows === []): ?><tr><td colspan="2">Пока нет данных</td></tr><?php endif;
    foreach ($rows as $name => $value): ?><tr><td><?= analyticsH($name) ?></td><td><?= analyticsH($value) ?></td></tr><?php endforeach;
    ?></tbody></table><?php
}

$period = (int) ($_GET['period'] ?? 7);
if (!in_array($period, [1, 7, 30], true)) $period = 7;
$moscow = new DateTimeZone('Europe/Moscow');
$utc = new DateTimeZone('UTC');
$nowMoscow = new DateTimeImmutable('now', $moscow);
$startMoscow = $period === 1
    ? $nowMoscow->setTime(0, 0)
    : $nowMoscow->setTime(0, 0)->modify('-' . ($period - 1) . ' days');
$start = $startMoscow->setTimezone($utc)->format('Y-m-d H:i:s');
$end = $nowMoscow->setTimezone($utc)->format('Y-m-d H:i:s');
$params = [':start' => $start, ':end' => $end];
$sqlWindow = 'occurred_at >= :start AND occurred_at <= :end';

try {
    $pdo = maniAnalyticsPdo();
    $views = analyticsScalar($pdo, "SELECT COUNT(*) FROM mani_analytics_events WHERE $sqlWindow AND event_name = 'page_view' AND is_bot = 0", $params);
    $sessions = analyticsScalar($pdo, "SELECT COUNT(DISTINCT session_hash) FROM mani_analytics_events WHERE $sqlWindow AND event_name = 'page_view' AND is_bot = 0", $params);
    $ctaClicks = analyticsScalar($pdo, "SELECT COUNT(*) FROM mani_analytics_events WHERE $sqlWindow AND event_name = 'cta_click' AND is_bot = 0", $params);
    $formOpens = analyticsScalar($pdo, "SELECT COUNT(*) FROM mani_analytics_events WHERE $sqlWindow AND event_name = 'waitlist_form_open' AND is_bot = 0", $params);
    $formStarts = analyticsScalar($pdo, "SELECT COUNT(DISTINCT session_hash) FROM mani_analytics_events WHERE $sqlWindow AND event_name = 'waitlist_form_start' AND is_bot = 0", $params);

    $waitlistRows = array_values(array_filter(analyticsRows($dataFile), static function (array $row) use ($start, $end): bool {
        $stamp = strtotime((string) ($row['createdAt'] ?? ''));
        return $stamp !== false && $stamp >= strtotime($start . ' UTC') && $stamp <= strtotime($end . ' UTC');
    }));
    $registrations = count($waitlistRows);

    $headlineRows = analyticsQuery($pdo, "SELECT hero_headline_variant AS name, COUNT(*) AS total
        FROM mani_analytics_events WHERE $sqlWindow AND event_name = 'experiment_view'
        AND control_name = 'hero_headline_v1' AND is_bot = 0 AND hero_headline_variant IS NOT NULL
        GROUP BY hero_headline_variant", $params);
    $headlineImpressions = [];
    foreach ($headlineRows as $row) $headlineImpressions[(string) $row['name']] = (int) $row['total'];
    $headlineRegistrations = analyticsGroup($waitlistRows, static fn(array $row): string => (string) ($row['heroHeadlineVariant'] ?? ''));
    $headline = [];
    foreach (['chaos' => 'Хаос', 'order' => 'Порядок'] as $key => $label) {
        $impressions = $headlineImpressions[$key] ?? 0;
        $registered = $headlineRegistrations[$key] ?? 0;
        $headline[$label] = "$impressions показов · $registered заявок · " . analyticsPercent($registered, $impressions);
    }

    $eventGroups = static function (PDO $pdo, string $column, string $event, array $params, int $limit = 12): array {
        $allowed = ['cta_location', 'section_name', 'network', 'device_class', 'browser_family', 'os_family', 'error_type', 'event_name', 'action_name'];
        if (!in_array($column, $allowed, true)) return [];
        $rows = analyticsQuery($pdo, "SELECT COALESCE(NULLIF($column, ''), 'Не определено') AS name, COUNT(*) AS total
            FROM mani_analytics_events WHERE occurred_at >= :start AND occurred_at <= :end
            AND event_name = :event AND is_bot = 0 GROUP BY $column ORDER BY total DESC LIMIT $limit",
            $params + [':event' => $event]);
        $result = [];
        foreach ($rows as $row) $result[(string) $row['name']] = (int) $row['total'];
        return $result;
    };
    $cta = $eventGroups($pdo, 'cta_location', 'cta_click', $params);
    $sections = $eventGroups($pdo, 'section_name', 'section_view', $params);
    $social = $eventGroups($pdo, 'network', 'social_click', $params);
    $devices = $eventGroups($pdo, 'device_class', 'page_view', $params);
    $browsers = $eventGroups($pdo, 'browser_family', 'page_view', $params);
    $systems = $eventGroups($pdo, 'os_family', 'page_view', $params);
    $formErrors = $eventGroups($pdo, 'error_type', 'form_error', $params);
    $errorRows = analyticsQuery($pdo, "SELECT CONCAT(event_name, ': ', COALESCE(NULLIF(error_type, ''), 'unknown')) AS name, COUNT(*) AS total
        FROM mani_analytics_events WHERE $sqlWindow AND event_name IN ('api_error', 'js_error', 'http_error')
        GROUP BY event_name, error_type ORDER BY total DESC LIMIT 20", $params);
    $apiErrors = [];
    foreach ($errorRows as $row) $apiErrors[(string) $row['name']] = (int) $row['total'];
    $dailyRows = analyticsQuery($pdo, "SELECT DATE(CONVERT_TZ(occurred_at, '+00:00', '+03:00')) AS name, COUNT(*) AS total
        FROM mani_analytics_events WHERE $sqlWindow AND event_name = 'page_view' AND is_bot = 0
        GROUP BY name ORDER BY name DESC", $params);
    $daily = [];
    foreach ($dailyRows as $row) $daily[(string) $row['name']] = (int) $row['total'];
    $pageRows = analyticsQuery($pdo, "SELECT page_path AS name, COUNT(*) AS total
        FROM mani_analytics_events WHERE $sqlWindow AND event_name = 'page_view' AND is_bot = 0
        GROUP BY page_path ORDER BY total DESC LIMIT 12", $params);
    $pages = [];
    foreach ($pageRows as $row) $pages[(string) $row['name']] = (int) $row['total'];

    $sources = analyticsGroup($waitlistRows, static fn(array $row): string => (string) (($row['lastTouch']['source'] ?? '') ?: 'direct'));
    $campaigns = analyticsGroup($waitlistRows, static fn(array $row): string => (string) (($row['lastTouch']['campaign'] ?? '') ?: 'Без UTM campaign'));
    $registrationCtas = analyticsGroup($waitlistRows, static fn(array $row): string => (string) ($row['ctaLocation'] ?? ''));
    $tone = $eventGroups($pdo, 'action_name', 'tone_switch', $params);
    if ($tone === []) {
        $rows = analyticsQuery($pdo, "SELECT COALESCE(NULLIF(tone, ''), 'Не определено') AS name, COUNT(*) AS total
            FROM mani_analytics_events WHERE $sqlWindow AND event_name = 'tone_switch' AND is_bot = 0 GROUP BY tone", $params);
        foreach ($rows as $row) $tone[(string) $row['name']] = (int) $row['total'];
    }

    $referral = [];
    foreach (['referral_visit' => 'Переходы', 'referral_signup' => 'Регистрации', 'referral_share' => 'Поделиться'] as $event => $label) {
        $referral[$label] = analyticsScalar($pdo, "SELECT COUNT(*) FROM mani_analytics_events WHERE $sqlWindow AND event_name = :event AND is_bot = 0", $params + [':event' => $event]);
    }
    $calculator = [];
    foreach (['calculator_view' => 'Просмотры', 'calculator_start' => 'Начали', 'calculator_complete' => 'Завершили', 'calculator_share' => 'Поделились'] as $event => $label) {
        $calculator[$label] = analyticsScalar($pdo, "SELECT COUNT(DISTINCT session_hash) FROM mani_analytics_events WHERE $sqlWindow AND event_name = :event AND is_bot = 0", $params + [':event' => $event]);
    }
    $vitalRows = analyticsQuery($pdo, "SELECT metric_name, metric_value FROM mani_analytics_events
        WHERE $sqlWindow AND event_name = 'web_vital' AND is_bot = 0 AND metric_name IS NOT NULL", $params);
    $vitalValues = ['LCP' => [], 'CLS' => [], 'INP' => []];
    foreach ($vitalRows as $row) $vitalValues[(string) $row['metric_name']][] = (float) $row['metric_value'];
    $vitals = [];
    foreach ($vitalValues as $metric => $values) {
        $p75 = analyticsP75($values);
        $vitals[$metric . ' p75'] = $p75 === null ? 'Нет данных' : ($metric === 'CLS' ? number_format($p75, 3, ',', '') : number_format($p75, 0, ',', ' ') . ' мс');
    }
    $botViews = analyticsScalar($pdo, "SELECT COUNT(*) FROM mani_analytics_events WHERE $sqlWindow AND event_name = 'page_view' AND is_bot = 1", $params);
    $visitorRows = analyticsQuery($pdo, "SELECT
        SUM(first_seen >= :visitor_start_new) AS new_visitors,
        SUM(first_seen < :visitor_start_repeat) AS repeat_visitors
        FROM (
          SELECT visitor_hash, MIN(occurred_at) AS first_seen, MAX(occurred_at) AS last_seen
          FROM mani_analytics_events WHERE visitor_hash IS NOT NULL GROUP BY visitor_hash
        ) visitors WHERE last_seen >= :visitor_window_start AND last_seen <= :visitor_window_end", [
            ':visitor_start_new' => $start,
            ':visitor_start_repeat' => $start,
            ':visitor_window_start' => $start,
            ':visitor_window_end' => $end,
        ]);
    $consentedVisitors = [
        'Новые' => (int) ($visitorRows[0]['new_visitors'] ?? 0),
        'Повторные' => (int) ($visitorRows[0]['repeat_visitors'] ?? 0),
    ];
    $storageError = '';
} catch (Throwable $error) {
    $views = $sessions = $ctaClicks = $formOpens = $formStarts = $registrations = $botViews = 0;
    $headline = $cta = $sections = $social = $devices = $browsers = $systems = $formErrors = $apiErrors = $daily = $pages = [];
    $sources = $campaigns = $registrationCtas = $tone = $referral = $calculator = $vitals = $consentedVisitors = [];
    $storageError = 'Хранилище аналитики временно недоступно.';
}

header('Content-Type: text/html; charset=utf-8');
?>
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Аналитика mani</title>
  <style>
    *{box-sizing:border-box}body{margin:0;padding:24px;background:#f5f8fc;color:#101a2d;font-family:Inter,Arial,sans-serif}
    header{display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;margin-bottom:22px}
    h1{margin:0;font-size:30px}.nav,.periods{display:flex;gap:8px;flex-wrap:wrap}a{color:#101a2d;text-decoration:none}
    .button{display:inline-flex;align-items:center;min-height:40px;padding:0 14px;border:1px solid #dbe4f0;border-radius:10px;background:#fff;font-weight:800}
    .button.active{border-color:#ff6020;background:#ff6020;color:#fff}.summary{display:grid;grid-template-columns:repeat(6,minmax(130px,1fr));gap:12px;margin-bottom:18px}
    .metric{padding:18px;border:1px solid #e0e8f3;border-radius:14px;background:#fff;box-shadow:0 12px 32px rgba(37,64,101,.06)}
    .metric small{display:block;color:#68758b}.metric strong{display:block;margin-top:8px;font-size:27px}
    .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.panel{padding:20px;border:1px solid #e0e8f3;border-radius:16px;background:#fff}
    .panel h2{margin:0 0 14px;font-size:19px}table{width:100%;border-collapse:collapse;font-size:14px}th,td{padding:9px;border-bottom:1px solid #edf1f6;text-align:left;vertical-align:top}th:last-child,td:last-child{text-align:right}
    .error{padding:14px;margin-bottom:16px;border-radius:12px;background:#fff0eb;color:#a63d1c;font-weight:800}.note{color:#68758b;font-size:13px;line-height:1.5}
    @media(max-width:1000px){.summary{grid-template-columns:repeat(3,1fr)}}@media(max-width:700px){body{padding:14px}.summary,.grid{grid-template-columns:1fr 1fr}.metric strong{font-size:22px}.panel{grid-column:1/-1}}@media(max-width:430px){.summary{grid-template-columns:1fr 1fr}}
  </style>
</head>
<body>
  <header>
    <div><h1>Аналитика mani</h1><div class="note">Период с <?= analyticsH($startMoscow->format('d.m.Y')) ?> по <?= analyticsH($nowMoscow->format('d.m.Y H:i')) ?> МСК</div></div>
    <div class="nav"><a class="button" href="/api/waitlist-admin.php">Заявки</a><a class="button active" href="/api/analytics-admin.php">Аналитика</a></div>
    <div class="periods"><?php foreach ([1 => 'Сегодня', 7 => '7 дней', 30 => '30 дней'] as $days => $label): ?><a class="button <?= $period === $days ? 'active' : '' ?>" href="?period=<?= $days ?>"><?= $label ?></a><?php endforeach; ?></div>
  </header>
  <?php if ($storageError !== ''): ?><div class="error"><?= analyticsH($storageError) ?></div><?php endif; ?>
  <section class="summary">
    <div class="metric"><small>Сессии</small><strong><?= $sessions ?></strong></div>
    <div class="metric"><small>Просмотры</small><strong><?= $views ?></strong></div>
    <div class="metric"><small>CTA-клики</small><strong><?= $ctaClicks ?></strong></div>
    <div class="metric"><small>Открыли форму</small><strong><?= $formOpens ?></strong></div>
    <div class="metric"><small>Начали форму</small><strong><?= $formStarts ?></strong></div>
    <div class="metric"><small>Новые заявки</small><strong><?= $registrations ?></strong></div>
  </section>
  <section class="grid">
    <article class="panel"><h2>Воронка</h2><?php analyticsTable([
      'Просмотр → CTA' => analyticsPercent($ctaClicks, $sessions),
      'CTA → открытие формы' => analyticsPercent($formOpens, $ctaClicks),
      'Форма → начало' => analyticsPercent($formStarts, $formOpens),
      'Начало → заявка' => analyticsPercent($registrations, $formStarts),
      'Сессия → заявка' => analyticsPercent($registrations, $sessions),
    ], 'Этап', 'Конверсия'); ?></article>
    <article class="panel"><h2>Заголовки hero</h2><?php analyticsTable($headline, 'Вариант', 'Показы · заявки · CR'); ?><p class="note">Конверсия считается по показам. В заявке используется последний заголовок перед отправкой.</p></article>
    <article class="panel"><h2>CTA-клики</h2><?php analyticsTable($cta, 'Расположение', 'Клики'); ?></article>
    <article class="panel"><h2>CTA заявок</h2><?php analyticsTable($registrationCtas, 'Расположение', 'Заявки'); ?></article>
    <article class="panel"><h2>Источники заявок</h2><?php analyticsTable($sources, 'Источник', 'Заявки'); ?></article>
    <article class="panel"><h2>UTM-кампании заявок</h2><?php analyticsTable($campaigns, 'Кампания', 'Заявки'); ?></article>
    <article class="panel"><h2>Просмотры по дням</h2><?php analyticsTable($daily, 'Дата', 'Просмотры'); ?></article>
    <article class="panel"><h2>Страницы</h2><?php analyticsTable($pages, 'Страница', 'Просмотры'); ?></article>
    <article class="panel"><h2>Популярные блоки</h2><?php analyticsTable($sections, 'Блок', 'Просмотры'); ?></article>
    <article class="panel"><h2>Социальные переходы</h2><?php analyticsTable($social, 'Площадка', 'Переходы'); ?></article>
    <article class="panel"><h2>Реферальная механика</h2><?php analyticsTable($referral, 'Действие', 'Количество'); ?></article>
    <article class="panel"><h2>Тест-драйв</h2><?php analyticsTable($calculator, 'Этап', 'Сессии'); ?><p class="note">Финансовые суммы не сохраняются.</p></article>
    <article class="panel"><h2>Режим Мани</h2><?php analyticsTable($tone, 'Режим', 'Выборы'); ?></article>
    <article class="panel"><h2>Устройства</h2><?php analyticsTable($devices, 'Тип', 'Сессии'); ?></article>
    <article class="panel"><h2>Браузеры</h2><?php analyticsTable($browsers, 'Браузер', 'Просмотры'); ?></article>
    <article class="panel"><h2>Операционные системы</h2><?php analyticsTable($systems, 'ОС', 'Просмотры'); ?></article>
    <article class="panel"><h2>Core Web Vitals</h2><?php analyticsTable($vitals, 'Метрика', 'p75'); ?></article>
    <article class="panel"><h2>Ошибки формы</h2><?php analyticsTable($formErrors, 'Тип', 'Количество'); ?></article>
    <article class="panel"><h2>Ошибки API</h2><?php analyticsTable($apiErrors, 'Тип', 'Количество'); ?></article>
    <article class="panel"><h2>Новые и повторные</h2><?php analyticsTable($consentedVisitors, 'Согласившиеся пользователи', 'Количество'); ?><p class="note">Только посетители, разрешившие аналитику. Без согласия считаются сессии, но не постоянные пользователи.</p></article>
    <article class="panel"><h2>Боты</h2><?php analyticsTable(['События просмотра от распознанных ботов' => $botViews, 'Просмотры людьми' => $views], 'Тип', 'Просмотры'); ?><p class="note">Счётчик показывает только ботов, которые обратились к endpoint аналитики. Поисковые роботы без JavaScript здесь не учитываются.</p></article>
  </section>
</body>
</html>
