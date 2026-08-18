<?php
declare(strict_types=1);

require_once __DIR__ . '/api/analytics-lib.php';
maniAnalyticsServerEvent('http_error', [
    'page_path' => (string) ($_SERVER['REQUEST_URI'] ?? '/'),
    'status_code' => 404,
    'error_type' => 'not_found',
]);

http_response_code(404);
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
?>
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,follow" />
  <title>Страница не найдена — mani</title>
  <style>
    body{min-height:100vh;display:grid;place-items:center;margin:0;padding:24px;background:#f6f9ff;color:#071632;font-family:Arial,sans-serif}
    main{max-width:560px;text-align:center}h1{margin:0 0 12px;font-size:clamp(42px,8vw,72px)}p{color:#5d6b86;font-size:18px;line-height:1.5}
    a{display:inline-flex;align-items:center;min-height:52px;margin-top:16px;padding:0 24px;border-radius:16px;background:#ff641f;color:#fff;font-weight:800;text-decoration:none}
  </style>
</head>
<body><main><h1>404</h1><p>Такой страницы нет. Вернись на главную mani.</p><a href="/">На главную</a></main></body>
</html>
