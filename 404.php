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
  <title>Страница не найдена. mani</title>
  <link rel="stylesheet" href="/newmani.css?v=20260820-perf-1" />
  <link rel="stylesheet" href="/site-chrome.css?v=20260902-mobile-polish-1" />
  <link rel="stylesheet" href="/secondary-pages-modern.css?v=20260903-unified-1" />
  <style>
    .nm-error-page{min-height:100vh;display:flex;flex-direction:column;background:#f6f9ff;color:#071632}
    .nm-error-page main{width:min(560px,calc(100% - 32px));min-height:calc(100vh - 190px);display:grid;place-content:center;margin:auto;padding:120px 0 48px;text-align:center}
    .nm-error-page main h1{margin:0 0 12px;font-size:clamp(42px,8vw,72px)}
    .nm-error-page main p{margin:0;color:#5d6b86;font-size:18px;line-height:1.5}
    .nm-error-page main a{display:inline-flex;align-items:center;justify-content:center;min-height:52px;margin:20px auto 0;padding:0 24px;border-radius:16px;background:#ff641f;color:#fff;font-weight:800;text-decoration:none}
    @media(max-width:700px){.nm-error-page main{min-height:62vh;padding:48px 0}}
  </style>
</head>
<body class="nm-page nm-secondary-page nm-error-page">
  <header class="header nm-header">
    <a class="logo nm-logo" href="/" aria-label="mani, на главную"><img src="/assets/brand/mani-black.png" width="626" height="213" alt="mani" data-brand-logo /></a>
    <nav class="nav nm-nav" aria-label="Основная навигация"><a href="/#about">О приложении</a><a href="/#features">Возможности</a><a href="/bezopasnost">Безопасность</a><a href="/#future">Будущее</a><a href="/guides">Гайды</a><a href="/faq">FAQ</a><a href="/#contacts">Контакты</a></nav>
    <a class="nm-button nm-button-primary nm-header-cta" href="/#early-access">Получить приглашение</a>
    <button class="menu nm-menu" type="button" aria-label="Открыть меню" aria-expanded="false"><span></span><span></span><span></span></button>
  </header>
  <div class="mobile-menu-panel nm-mobile-menu" aria-hidden="true"><nav aria-label="Мобильная навигация"><a href="/#about">О приложении</a><a href="/#features">Возможности</a><a href="/bezopasnost">Безопасность</a><a href="/#future">Будущее</a><a href="/guides">Гайды</a><a href="/faq">FAQ</a><a href="/#contacts">Контакты</a></nav><a class="nm-button nm-button-primary" href="/#early-access">Получить приглашение</a></div>
  <main><p class="nm-error-kicker">Потерялись</p><h1>404</h1><p>Эта страница куда-то ушла. Вернись на главную, там mani уже собрал всё важное</p><a href="/">Вернуться на главную</a></main>
  <footer class="nm-footer"><div class="nm-container nm-footer-grid"><div class="nm-footer-brand"><a href="/" aria-label="mani, на главную"><img src="/assets/brand/mani-black.png" width="626" height="213" alt="mani" data-brand-logo /></a><p>mani. Финансовый радар с характером</p></div><nav aria-label="Навигация в подвале"><a href="/#about">О приложении</a><a href="/#features">Возможности</a><a href="/bezopasnost">Безопасность</a><a href="/#contacts">Контакты</a><a href="/guides">Гайды</a><a href="/faq">FAQ</a></nav><nav aria-label="Юридические документы"><a href="/privacy">Privacy</a><a href="/cookie">Cookie</a><a href="/soglasie">Согласие</a><a href="/delete-account">Удаление аккаунта</a></nav><p class="nm-copyright">© 2026 mani</p></div></footer>
  <noscript><div><img src="https://top-fwz1.mail.ru/counter?id=3681438;js=na" style="position:absolute;left:-9999px" alt="Top.Mail.Ru" /></div></noscript>
  <script src="/analytics-client.js?v=20260902-topmail-1"></script>
  <script>const menu=document.querySelector('.nm-menu'),nav=document.querySelector('.nm-mobile-menu');menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.setAttribute('aria-hidden',String(!open));document.body.classList.toggle('menu-open',open);});</script>
</body>
</html>
