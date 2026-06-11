<?php
declare(strict_types=1);

$tokenFile = dirname(__DIR__) . '/data/admin-token.txt';
$fileToken = is_file($tokenFile) ? trim((string) file_get_contents($tokenFile)) : '';
$token = getenv('MANI_ADMIN_TOKEN') ?: $fileToken;
$provided = (string) ($_GET['token'] ?? '');

if ($token === '' || !hash_equals($token, $provided)) {
    http_response_code(403);
    echo 'Forbidden';
    exit;
}

$dataFile = dirname(__DIR__) . '/data/waitlist-submissions.jsonl';

function rows(string $file): array {
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

$rows = rows($dataFile);
$query = strtolower(trim((string) ($_GET['q'] ?? '')));
$visibleRows = $query === ''
    ? $rows
    : array_values(array_filter($rows, static fn($row) => strpos(strtolower(json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: ''), $query) !== false));

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $code = trim((string) ($_POST['code'] ?? ''));
    if ($code !== '') {
        $kept = array_values(array_filter($rows, static fn($row) => ($row['referralCode'] ?? '') !== $code));
        $lines = array_map(static fn($row) => json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $kept);
        file_put_contents($dataFile, implode(PHP_EOL, $lines) . (count($lines) ? PHP_EOL : ''), LOCK_EX);
    }
    header('Location: ?token=' . rawurlencode($provided));
    exit;
}

if (($_GET['format'] ?? '') === 'jsonl') {
    header('Content-Type: application/x-ndjson; charset=utf-8');
    header('Content-Disposition: attachment; filename="waitlist-submissions.jsonl"');
    if (is_file($dataFile)) {
        readfile($dataFile);
    }
    exit;
}

if (($_GET['format'] ?? '') === 'csv') {
    $columns = ['position', 'phone', 'email', 'contactDetails', 'pdnConsent', 'pdnConsentVersion', 'referralCode', 'referredBy', 'createdAt', 'page'];
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="waitlist-submissions.csv"');
    $out = fopen('php://output', 'wb');
    fputcsv($out, $columns);
    foreach ($rows as $row) {
        fputcsv($out, array_map(static fn($column) => $row[$column] ?? '', $columns));
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
    <title>Mani.ai waitlist admin</title>
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
      <h1>Waitlist: <?= count($rows) ?><?= $query !== '' ? ' / found ' . count($visibleRows) : '' ?></h1>
      <div class="tools">
        <form method="get">
          <input type="hidden" name="token" value="<?= htmlspecialchars($provided, ENT_QUOTES) ?>" />
          <input name="q" value="<?= htmlspecialchars($query, ENT_QUOTES) ?>" placeholder="Search phone, email, code" />
          <button>Search</button>
        </form>
        <a class="btn secondary" href="?token=<?= htmlspecialchars($provided, ENT_QUOTES) ?>">Reset</a>
        <a class="btn secondary" href="?token=<?= htmlspecialchars($provided, ENT_QUOTES) ?>&format=jsonl">JSONL</a>
        <a class="btn secondary" href="?token=<?= htmlspecialchars($provided, ENT_QUOTES) ?>&format=csv">CSV</a>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Место</th>
          <th>Телефон</th>
          <th>Email</th>
          <th>Комментарий / канал связи</th>
          <th>Согласие</th>
          <th>Версия согласия</th>
          <th>Код</th>
          <th>Пригласил</th>
          <th>Дата</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($visibleRows as $row): ?>
          <tr>
            <td>#<?= htmlspecialchars((string) ($row['position'] ?? ''), ENT_QUOTES) ?></td>
            <td><?= htmlspecialchars((string) ($row['phone'] ?? ''), ENT_QUOTES) ?></td>
            <td><?= htmlspecialchars((string) ($row['email'] ?? ''), ENT_QUOTES) ?></td>
            <td><?= htmlspecialchars((string) ($row['contactDetails'] ?? ''), ENT_QUOTES) ?></td>
            <td><?= !empty($row['pdnConsent']) ? 'yes' : '' ?></td>
            <td><?= htmlspecialchars((string) ($row['pdnConsentVersion'] ?? ''), ENT_QUOTES) ?></td>
            <td><?= htmlspecialchars((string) ($row['referralCode'] ?? ''), ENT_QUOTES) ?></td>
            <td><?= htmlspecialchars((string) ($row['referredBy'] ?? ''), ENT_QUOTES) ?></td>
            <td><?= htmlspecialchars((string) ($row['createdAt'] ?? ''), ENT_QUOTES) ?></td>
            <td>
              <form method="post" onsubmit="return confirm('Delete this request?')">
                <input type="hidden" name="code" value="<?= htmlspecialchars((string) ($row['referralCode'] ?? ''), ENT_QUOTES) ?>" />
                <button>Delete</button>
              </form>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </body>
</html>
