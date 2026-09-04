<?php
declare(strict_types=1);

$privateDataDir = dirname(__DIR__, 3) . '/private/mani-waitlist';
$configuredDataDir = trim((string) getenv('MANI_DATA_DIR'));
$dataDir = $configuredDataDir !== '' ? rtrim($configuredDataDir, '/\\') : $privateDataDir;
$tokenFile = $dataDir . '/admin-token.txt';
$token = is_file($tokenFile) ? trim((string) file_get_contents($tokenFile)) : '';

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
header('X-Robots-Tag: noindex, nofollow, noarchive');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'self'; img-src 'self' data:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");

$authenticated = ($_SESSION['authenticated'] ?? false) === true;
$loginError = '';
$loginCsrf = $token !== '' ? hash_hmac('sha256', 'mani-app-preview-login-v1', $token) : '';
if (!$authenticated && ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $providedCsrf = trim((string) ($_POST['csrf'] ?? ''));
    $providedPassword = (string) ($_POST['password'] ?? '');
    if ($token !== '' && $loginCsrf !== '' && hash_equals($loginCsrf, $providedCsrf) && hash_equals($token, $providedPassword)) {
        session_regenerate_id(true);
        $_SESSION['authenticated'] = true;
        header('Location: /app-preview/', true, 303);
        exit;
    }
    usleep(350000);
    $loginError = 'Неверный пароль.';
}

if (!$authenticated):
?>
<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow,noarchive"><title>MANI — закрытый тест</title><style>
*{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 50% 8%,#fff 0,#e8f8ff 30%,#fff2e8 72%,#ececff 100%);font-family:system-ui,sans-serif;color:#1e1b19}.gate{width:min(100%,390px);padding:28px;border:1px solid rgba(255,255,255,.9);border-radius:30px;background:rgba(255,255,255,.72);box-shadow:0 24px 80px rgba(50,42,37,.14);backdrop-filter:blur(24px)}img{width:92px}.tag{display:inline-block;margin:28px 0 8px;padding:7px 11px;border-radius:999px;background:#fff;color:#ff5e2d;font-size:12px;font-weight:800}.gate h1{margin:0 0 8px;font-size:30px}.gate p{margin:0 0 24px;color:#716e6b;line-height:1.5}.gate label{display:grid;gap:8px;font-weight:700}.gate input{width:100%;height:54px;padding:0 16px;border:1px solid rgba(55,45,40,.12);border-radius:17px;background:rgba(255,255,255,.9);font:inherit}.gate button{width:100%;height:54px;margin-top:14px;border:0;border-radius:17px;background:linear-gradient(110deg,#ff4e2f,#ff792d);color:#fff;font:800 16px system-ui}.error{margin-top:12px!important;color:#c62f3a!important;font-size:14px}</style></head><body><main class="gate"><img src="assets/mani-app-logo.svg" alt="MANI"><span class="tag">ЗАКРЫТЫЙ МОБИЛЬНЫЙ ТЕСТ</span><h1>Вход в MANI</h1><p>Используйте тот же пароль, что и для административного раздела сайта.</p><form method="post"><input type="hidden" name="csrf" value="<?= htmlspecialchars($loginCsrf, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>"><label>Пароль<input type="password" name="password" autocomplete="current-password" required autofocus></label><button type="submit">Открыть приложение</button><?php if ($loginError !== ''): ?><p class="error"><?= htmlspecialchars($loginError, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></p><?php endif; ?></form></main></body></html>
<?php exit; endif; ?>
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="description" content="Личный финансовый кабинет MANI">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta name="theme-color" content="#f4f4f4">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <link rel="manifest" href="manifest.webmanifest">
  <title>MANI — финансовый кабинет</title>
  <link rel="stylesheet" href="styles.css?v=glass7">
</head>
<body>
  <main id="auth-view" class="phone-shell auth-shell" hidden>
    <section class="auth-screen is-active" data-auth-screen="welcome">
      <img class="auth-logo" src="assets/mani-app-logo.svg" alt="MANI">
      <div class="welcome-mascot"><img src="assets/mani-motivator.png" alt="MANI"></div>
      <div class="welcome-copy"><h1>Друг, коуч и весельчак<br>в твоём телефоне</h1><p>Финансы становятся понятными</p></div>
      <div class="stack-actions"><button class="button primary" type="button" data-auth-go="login">Войти</button><button class="button pale" type="button" data-auth-go="register">Зарегистрироваться</button></div>
    </section>
    <section class="auth-screen" data-auth-screen="login">
      <button class="round-control back" type="button" data-auth-go="welcome" aria-label="Назад">‹</button><img class="auth-logo" src="assets/mani-app-logo.svg" alt="MANI">
      <div class="auth-heading"><h1>Авторизация</h1><p>Для входа введите вашу почту и пароль</p></div>
      <form id="login-form" class="mobile-form" novalidate>
        <label><span>Почта</span><input id="login-email" type="email" inputmode="email" autocomplete="email" placeholder="user@gmail.com" required></label>
        <label><span>Пароль</span><span class="password-field"><input id="login-password" type="password" autocomplete="current-password" minlength="10" maxlength="128" placeholder="Пароль" required><button type="button" data-password-toggle="login-password" aria-label="Показать пароль">◉</button></span></label>
        <button class="text-link right" type="button" data-auth-go="recovery">Забыли пароль?</button><p id="login-error" class="form-error" role="alert"></p><button id="login-submit" class="button primary" type="submit">Войти</button>
      </form><p class="auth-switch">Ещё нет аккаунта? <button type="button" data-auth-go="register">Регистрация</button></p>
    </section>
    <section class="auth-screen" data-auth-screen="register">
      <button class="round-control back" type="button" data-auth-go="welcome" aria-label="Назад">‹</button><img class="auth-logo" src="assets/mani-app-logo.svg" alt="MANI">
      <div class="auth-heading"><h1>Регистрация</h1><p>На введённую почту придёт код</p></div>
      <form id="register-form" class="mobile-form" novalidate>
        <label><span>Почта</span><input id="register-email" type="email" inputmode="email" autocomplete="email" placeholder="user@gmail.com" required></label>
        <label><span>Пароль</span><span class="password-field"><input id="register-password" type="password" autocomplete="new-password" minlength="10" maxlength="128" placeholder="Не менее 10 символов" required><button type="button" data-password-toggle="register-password" aria-label="Показать пароль">◉</button></span></label>
        <p id="register-error" class="form-error" role="alert"></p><button class="button primary" type="submit">Продолжить</button>
      </form><p class="legal-copy">Регистрируясь, вы принимаете <button data-open-legal="privacy">Политику приватности</button>, <button data-open-legal="terms">Пользовательское соглашение</button> и <button data-open-legal="cookies">Политику Cookie</button>.</p>
    </section>
    <section class="auth-screen" data-auth-screen="verify">
      <button class="round-control back" type="button" data-auth-go="register" aria-label="Назад">‹</button><img class="auth-logo" src="assets/mani-app-logo.svg" alt="MANI">
      <div class="auth-heading"><h1>Регистрация</h1><p>Код отправлен на почту:<br><b id="verify-email">—</b></p></div>
      <form id="verify-form" class="mobile-form code-form" novalidate><label><span>Код из письма</span><input id="verify-code" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000" required></label><p class="dev-hint">Локальный тестовый код: <b>123456</b></p><p id="verify-error" class="form-error" role="alert"></p><button class="button primary" type="submit">Подтвердить</button></form>
    </section>
    <section class="auth-screen" data-auth-screen="recovery">
      <button class="round-control back" type="button" data-auth-go="login" aria-label="Назад">‹</button><img class="auth-logo" src="assets/mani-app-logo.svg" alt="MANI"><div class="auth-heading"><h1>Восстановление</h1><p>Введите почту, на которую привязан аккаунт</p></div><form id="recovery-form" class="mobile-form"><label><span>Почта</span><input id="recovery-email" type="email" inputmode="email" placeholder="user@gmail.com" required></label><button class="button primary" type="submit">Получить код</button></form>
    </section>
    <section class="auth-screen" data-auth-screen="recovery-code">
      <button class="round-control back" type="button" data-auth-go="recovery" aria-label="Назад">‹</button><img class="auth-logo" src="assets/mani-app-logo.svg" alt="MANI"><div class="auth-heading"><h1>Восстановление</h1><p>Код отправлен на почту: <b id="recovery-code-email">—</b></p></div><form id="recovery-code-form" class="mobile-form code-form"><label><span>Код из письма</span><input id="recovery-code" inputmode="numeric" maxlength="6" placeholder="000000" required></label><p class="dev-hint">Локальный тестовый код: <b>123456</b></p><p id="recovery-code-error" class="form-error"></p><button class="button primary" type="submit">Продолжить</button></form>
    </section>
    <section class="auth-screen" data-auth-screen="recovery-new">
      <button class="round-control back" type="button" data-auth-go="recovery-code" aria-label="Назад">‹</button><img class="auth-logo" src="assets/mani-app-logo.svg" alt="MANI"><div class="auth-heading"><h1>Новый пароль</h1><p>Придумайте и подтвердите новый пароль</p></div><form id="recovery-new-form" class="mobile-form"><label><span>Новый пароль</span><input id="recovery-password" type="password" minlength="10" placeholder="Не менее 10 символов" required></label><label><span>Повторите пароль</span><input id="recovery-confirm" type="password" minlength="10" required></label><p id="recovery-new-error" class="form-error"></p><button class="button primary" type="submit">Сохранить пароль</button></form>
    </section>
  </main>

  <section id="onboarding-view" class="phone-shell onboarding-shell" hidden aria-label="Первый запуск MANI">
    <header class="onboarding-header"><img src="assets/mani-onboarding-logo.svg" alt="MANI"></header><div class="onboarding-track">
      <article class="onboarding-slide is-active" data-onboarding-step="0"><div class="onboarding-art wallet-art"><img class="wallet-back" src="assets/onboard-wallet-b.svg" alt=""><img class="wallet-glow" src="assets/onboard-wallet-d.svg" alt=""><img class="wallet-body" src="assets/onboard-wallet-c.svg" alt=""><img class="wallet-clasp" src="assets/onboard-wallet-a.svg" alt=""></div><div class="onboarding-copy"><h1>Деньги любят <span>порядок</span></h1><p>Собери все карты и счета в один дашборд</p></div></article>
      <article class="onboarding-slide" data-onboarding-step="1"><div class="onboarding-art chart-art"><img class="chart-bar-one" src="assets/onboard-chart-a.svg" alt=""><img class="chart-bar-two" src="assets/onboard-chart-b.svg" alt=""><img class="chart-bar-three" src="assets/onboard-chart-c.svg" alt=""><img class="chart-arrow" src="assets/onboard-chart-arrow.svg" alt=""></div><div class="onboarding-copy"><h1>Куда уходят <span>деньги</span></h1><p>MANI покажет каждую утечку и подписку</p></div></article>
      <article class="onboarding-slide" data-onboarding-step="2"><div class="onboarding-art chat-art"><img class="chat-back" src="assets/onboard-chat-a.svg" alt=""><img class="chat-front" src="assets/onboard-chat-b.svg" alt=""><span class="chat-dots"><img src="assets/onboard-chat-dots.svg" alt=""><img src="assets/onboard-chat-dots.svg" alt=""><img src="assets/onboard-chat-dots.svg" alt=""></span></div><div class="onboarding-copy"><h1>Спроси у <span>MANI</span></h1><p>Любые вопросы о финансах</p></div></article>
      <article class="onboarding-slide" data-onboarding-step="3"><div class="onboarding-art security-art"><img class="security-accent" src="assets/onboard-security-accent.svg" alt=""><img class="security-shield" src="assets/onboard-security.svg" alt=""><img class="security-check" src="assets/onboard-security-check.svg" alt=""></div><div class="onboarding-copy"><h1>Деньги в <span>безопасности</span></h1><p>Только зашифрованные данные</p></div><div class="security-rail"><div><b>◉ Только чтение</b><span>Доступ без права изменений</span></div><div><b>⊘ Без переводов</b><span>Не может оплачивать покупки</span></div><div><b>◌ Не видим данные</b><span>Обработка автоматическая</span></div><div><b>◇ Полный контроль</b><span>Отключи банк в любой момент</span></div></div></article>
      <article class="onboarding-slide persona-slide" data-onboarding-step="4"><button class="persona-choice is-selected" type="button" data-persona="mentor"><img src="assets/mani-motivator.png" alt="Белый MANI — Мотиватор"><strong>Мотиватор</strong></button><button class="persona-choice" type="button" data-persona="roaster"><img src="assets/mani-funny.png" alt="Чёрный MANI — Весельчак"><strong>Весельчак</strong></button><div class="onboarding-copy persona-copy"><h1>Выбери тон <span>общения</span></h1><p id="persona-description">Поддерживает, объясняет и помогает держать темп</p></div></article>
    </div><footer class="onboarding-footer"><div id="onboarding-dots" class="onboarding-dots"></div><div class="onboarding-actions"><button id="onboarding-skip" class="onboarding-skip" type="button">Пропустить</button><button id="onboarding-next" class="button primary" type="button">Продолжить</button></div></footer>
  </section>

  <div id="app-view" class="phone-shell app-shell" hidden>
    <header id="topbar" class="topbar"><img src="assets/mani-app-logo.svg" alt="MANI"><button id="analysis-button" class="analysis-button" type="button" aria-haspopup="dialog" aria-controls="report-popover" aria-expanded="false" aria-label="Открыть отчёт"><img src="assets/nav-analysis.svg" alt=""></button></header>
    <main class="app-content">
      <section class="app-page is-active" data-page-view="overview">
        <section id="home-briefing" class="home-briefing surface" aria-label="Персональный дайджест MANI">
          <div class="home-briefing-copy"><div class="home-briefing-meta"><span id="home-insight-eyebrow">MANI сейчас</span><div id="home-insight-dots" class="home-insight-dots" aria-label="Карточки дайджеста"></div></div><h1 id="home-insight-title">Собираю картину</h1><p id="home-insight-copy">Сейчас покажу главное по вашим деньгам.</p><button id="home-insight-action" class="home-insight-action" type="button">Подробнее</button></div>
          <div id="home-mascot" class="home-mascot"><img src="assets/mani-home-good.png" alt="MANI" data-persona-avatar></div><button id="home-insight-next" class="home-insight-next" type="button" aria-label="Следующая карточка">›</button>
        </section>
        <section id="empty-state" class="home-empty" hidden><button class="button primary" data-page="bank-connect">Добавить банк</button><div class="trust-list"><article><i>◔</i><div><b>Только для анализа</b><p>Ваши пароли остаются в банке.</p></div></article><article><i>◉</i><div><b>Никаких платежей</b><p>Доступ только для чтения.</p></div></article><article><i>◇</i><div><b>Банковское шифрование</b><p>Данные защищены шифрованием.</p></div></article><article><i>⚙</i><div><b>Полный контроль</b><p>Отключите банк в любой момент.</p></div></article></div></section>
        <div id="dashboard-content" class="home-summary" hidden>
          <div class="balance-stack"><button class="balance-card surface" data-page="balance"><span><small>Общий баланс</small><strong id="kpi-balance">—</strong></span><span class="balance-actions"><span id="balance-visibility" role="button" tabindex="0"><img src="assets/home-eye.svg" alt=""></span><img src="assets/home-chevron.svg" alt=""></span></button><p id="coverage-copy" class="update-strip">Нет данных</p></div>
          <div class="cashflow-card surface" aria-label="Доходы и расходы"><button type="button" data-flow-filter="income"><i><img src="assets/cashflow-up.svg" alt=""></i><em><small>Доходы</small><strong id="kpi-income">—</strong></em><b>›</b></button><button type="button" data-flow-filter="expense"><i><img src="assets/cashflow-down.svg" alt=""></i><em><small>Расходы</small><strong id="kpi-spending">—</strong></em><b>›</b></button></div>
          <section id="home-upcoming" class="home-block" hidden><h2>Прогноз регулярных списаний</h2><div id="home-upcoming-list" class="list-card surface"></div><p class="prediction-note">Это прогноз по повторяемости операций, а не выставленный банком счёт.</p></section><section class="home-block"><h2>Банки</h2><div class="bank-grid"><button class="bank-tile add" data-page="bank-connect"><span><i>＋</i><b>Добавить</b></span><small>Авторизация банка</small></button><div id="home-bank-list" class="bank-list"></div></div></section>
        </div>
      </section>
      <section class="app-page detail-page" data-page-view="balance"><div class="sub-header"><button data-back>‹</button><h1>Баланс по банкам</h1><button data-close>×</button></div><div id="balance-list" class="detail-list"></div></section>
      <section class="app-page detail-page" data-page-view="account-detail"><div class="sub-header"><button id="account-detail-back" data-back="balance">‹</button><h1 id="account-detail-title">Счёт</h1><button data-close>×</button></div><div id="account-detail-content" class="detail-list"></div></section>
      <section class="app-page detail-page" data-page-view="transaction-detail"><div class="sub-header"><button data-back="account-detail">‹</button><h1>Операция</h1><button data-close>×</button></div><div id="transaction-detail-content" class="detail-list"></div></section>
      <section class="app-page detail-page" data-page-view="cashflow"><div class="sub-header"><button data-back>‹</button><h1 id="cashflow-title">Доходы</h1><button data-close>×</button></div><div id="month-list" class="detail-list"></div></section>
      <section class="app-page detail-page" data-page-view="month"><div class="sub-header"><button data-back="cashflow">‹</button><h1 id="month-title">Расходы</h1><button data-close>×</button></div><div id="month-transactions" class="detail-list"></div></section>
      <section class="app-page detail-page" data-page-view="category"><div class="sub-header"><button data-back="cashflow">‹</button><h1 id="category-title">Категория</h1><button data-close>×</button></div><div id="category-content" class="detail-list"></div></section>
      <section class="app-page detail-page" data-page-view="payment"><div class="sub-header"><button data-back>‹</button><h1>Прогноз списания</h1><button data-close>×</button></div><div id="payment-detail" class="detail-list"></div></section>
      <section id="report-popover" class="app-page report-page" data-page-view="report" role="dialog" aria-modal="true" aria-labelledby="report-headline" aria-hidden="true"><div class="report-shell"><div class="report-top"><img src="assets/mani-app-logo.svg" alt="MANI"><span><button id="report-share" aria-label="Поделиться">↗</button><button id="report-close" aria-label="Закрыть">×</button></span></div><div id="report-empty" class="report-state" hidden><small>Общая картина</small><h1>Недостаточно данных</h1><article><b>Действие</b><strong>Добавить банк</strong><p>Перейдите в Банки → Добавить.</p></article><article><b>Влияние</b><strong>Общие советы</strong><p>Рекомендации могут не учитывать последние траты.</p></article><button class="button pale" data-page="bank-connect">Как подключить банк</button></div><div id="report-loading" class="report-state" hidden><small>Общая картина</small><h1>Ожидание данных</h1><article><b>Статус</b><strong>Ожидание</strong><p>Получение данных банка</p></article><article><b>Время</b><strong>~5 мин</strong><p>Займёт процесс обновления</p></article></div><div id="report-content" hidden><article class="report-slide is-active" data-report-slide="0"><small>Общая картина</small><h1 id="report-headline">Финансовая картина</h1><p id="report-explainer">—</p><div class="metric-grid"><button class="metric wide"><small>Средний чек</small><strong id="report-average">—</strong></button><div class="metric"><small>Доход</small><strong id="report-income">—</strong></div><div class="metric"><small>Расход</small><strong id="report-expense">—</strong></div><button class="metric ring" data-page="merchant-detail"><small>Доля топ‑3 продавцов</small><strong id="report-top3">—</strong></button><div class="metric ring"><small>Индекс выходных</small><strong id="report-weekend">—</strong></div><div class="metric wide"><small>Риски</small><strong id="risk-title">—</strong><p id="risk-factors">—</p></div></div></article><article class="report-slide" data-report-slide="1"><small>Доходы и платежи</small><h1>Тратишь всё до копейки</h1><p>Проверяем, остаётся ли запас или месяц уходит в ноль.</p><div class="metric-grid"><div class="metric"><small>Регулярных списаний</small><strong id="report-subscriptions">—</strong></div><div class="metric"><small>Прогноз в месяц</small><strong id="report-recurring">—</strong></div><div class="metric wide gauge"><small>Запас</small><strong id="report-reserve">—</strong></div><div class="metric wide"><small>Доходы</small><strong id="report-income-state">—</strong><p>Насколько предсказуем поток денег</p></div><div class="metric wide"><small>Платежи</small><strong id="report-payment-state">—</strong><p>Доля трат, которую сложно быстро сократить</p></div></div></article></div><div id="report-dots" class="pager" hidden><button class="is-active" data-report-to="0"></button><button data-report-to="1"></button></div></div><button id="report-chat" class="button primary report-chat" type="button">Разбор с MANI</button></section>
      <section class="app-page detail-page" data-page-view="merchant-detail"><div class="sub-header"><button data-back="overview">‹</button><h1>Доля топ‑3 продавцов</h1><button data-close>×</button></div><div id="merchant-detail-list" class="detail-list"></div></section>
      <section class="app-page chat-page" data-page-view="assistant"><header class="chat-header"><img src="assets/mani-onboarding-logo.svg" alt="MANI"></header><div id="quick-prompts" class="quick-prompts"><button data-prompt="Сколько я потратил за месяц?">Траты за месяц</button><button data-prompt="Какие у меня подписки?">Подписки</button><button data-prompt="Какие финансовые риски ты видишь?">Риски</button></div><div id="chat-list" class="chat-list"></div><div id="chat-status" class="chat-status" hidden>MANI получил запрос…</div><form id="chat-form" class="chat-form"><input id="chat-input" maxlength="600" autocomplete="off" placeholder="Написать MANI"><button type="submit" aria-label="Отправить">↑</button></form></section>
      <section class="app-page" data-page-view="profile"><div class="profile-head"><h1>Профиль</h1><button data-page="settings" aria-label="Настройки">⚙</button></div><section class="profile-card"><small>Данные профиля</small><button class="email-row"><span id="profile-email">—</span><i>✎</i></button><button class="button primary" data-page="survey">Пройти опрос</button><small>Выбери ИИ-ассистента</small><label class="tone-row"><img src="assets/mani-motivator.png" alt=""><span><b>Мотиватор</b><small>Поддерживает и помогает держать темп</small></span><input type="radio" name="assistant-tone" value="mentor"></label><label class="tone-row"><img src="assets/mani-funny.png" alt=""><span><b>Весельчак</b><small>Даёт остроумные, но полезные ответы</small></span><input type="radio" name="assistant-tone" value="roaster"></label></section></section>
      <section class="app-page detail-page" data-page-view="settings"><div class="sub-header"><button data-back="profile">‹</button><h1>Настройки</h1><button id="logout-button" aria-label="Выйти">↗</button></div><div class="settings-list"><small>Соглашения</small><button data-open-legal="terms">Пользовательское соглашение <b>›</b></button><button data-open-legal="privacy">Политика конфиденциальности <b>›</b></button><button data-open-legal="cookies">Политика использования Cookie <b>›</b></button></div><div class="settings-bottom"><button class="button pale" id="feedback-button">Обратная связь</button><button class="button dark" id="delete-open">Удалить аккаунт</button></div></section>
      <section class="app-page detail-page survey-page" data-page-view="survey"><div class="sub-header"><span></span><h1>Знакомство</h1><button data-close>×</button></div><div id="survey-chat" class="survey-chat"></div><form id="survey-form" class="chat-form"><input id="survey-input" maxlength="120" placeholder="Написать ответ"><button type="submit">↑</button></form></section>
      <section class="app-page banks-page" data-page-view="banks"><div class="sub-header"><button data-back>‹</button><h1>Банки</h1><button data-close>×</button></div><div id="connected-banks" class="detail-list"></div><button class="button primary bottom-action" data-page="bank-connect">Добавить банк</button></section>
      <section id="bank-connect-popover" class="app-page bank-connect-page" data-page-view="bank-connect" role="dialog" aria-modal="true" aria-label="Добавить банк" aria-hidden="true"><div class="bank-connection-shell"><div class="sub-header inverse"><button id="bank-connect-back" type="button" aria-label="Назад">‹</button><img src="assets/mani-app-logo.svg" alt="MANI"><button id="bank-connect-close" type="button" aria-label="Закрыть">×</button></div><div id="bank-step" class="bank-step"></div></div></section>
      <section class="app-page detail-page" data-page-view="bank-detail"><div class="sub-header"><button data-back="overview">‹</button><h1 id="bank-detail-title">Т-Банк</h1><button data-close>×</button></div><div id="bank-detail-content" class="detail-list"></div></section>
    </main>
    <nav id="mobile-tabbar" class="mobile-tabbar surface" aria-label="Основные разделы"><button class="tab-link is-active" data-page="overview" aria-label="Главная"><img src="assets/nav-home.svg" alt=""></button><button class="tab-link mani-tab" data-page="assistant" aria-label="MANI"><span><img src="assets/mani-motivator.png" alt="" data-persona-avatar></span></button><button class="tab-link" data-page="profile" aria-label="Профиль"><img src="assets/nav-profile.svg" alt=""></button></nav>
  </div>
  <div id="modal" class="modal" hidden><div class="modal-sheet"><div class="modal-handle"></div><div id="modal-content"></div></div></div><div id="toast" class="toast" role="status"></div><input id="json-import" type="file" accept="application/json,.json" hidden><input id="tbank-statement-import" type="file" accept="text/csv,.csv" hidden><script type="module" src="app.js?v=bankprofile1"></script>
</body>
</html>
