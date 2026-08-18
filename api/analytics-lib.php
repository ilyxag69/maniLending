<?php
declare(strict_types=1);

function maniAnalyticsConfig(): array {
    static $config = null;
    if (is_array($config)) return $config;

    $configFile = trim((string) getenv('MANI_ANALYTICS_CONFIG'));
    $candidates = array_filter([
        $configFile,
        dirname(__DIR__, 3) . '/private/mani-analytics.php',
        dirname(__DIR__) . '/data/mani-analytics.php',
    ]);
    foreach ($candidates as $candidate) {
        if (is_file($candidate)) {
            $loaded = require $candidate;
            if (is_array($loaded)) {
                $config = $loaded;
                break;
            }
        }
    }

    if (!is_array($config)) {
        $config = [
            'dsn' => trim((string) getenv('MANI_ANALYTICS_DSN')),
            'user' => trim((string) getenv('MANI_ANALYTICS_DB_USER')),
            'password' => (string) getenv('MANI_ANALYTICS_DB_PASSWORD'),
            'salt' => trim((string) getenv('MANI_ANALYTICS_SALT')),
        ];
    }
    return $config;
}

function maniAnalyticsPdo(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    $config = maniAnalyticsConfig();
    if (($config['dsn'] ?? '') === '' || ($config['salt'] ?? '') === '') {
        throw new RuntimeException('Analytics storage is not configured');
    }
    $pdo = new PDO(
        (string) $config['dsn'],
        (string) ($config['user'] ?? ''),
        (string) ($config['password'] ?? ''),
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
    return $pdo;
}

function maniAnalyticsAllowedOrigins(): array {
    $configured = trim((string) getenv('MANI_ALLOWED_ORIGINS'));
    $value = $configured !== '' ? $configured : 'https://moimani.ai,https://www.moimani.ai';
    return array_values(array_filter(array_map(
        static fn(string $origin): string => rtrim(trim($origin), '/'),
        explode(',', $value)
    )));
}

function maniAnalyticsOriginAllowed(): bool {
    $origin = rtrim(trim((string) ($_SERVER['HTTP_ORIGIN'] ?? '')), '/');
    return $origin === '' || in_array($origin, maniAnalyticsAllowedOrigins(), true);
}

function maniAnalyticsClientIp(): string {
    $remote = trim((string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
    $trusted = array_values(array_filter(array_map(
        'trim',
        explode(',', (string) getenv('MANI_TRUSTED_PROXY_IPS'))
    )));
    if ($trusted !== [] && in_array($remote, $trusted, true)) {
        $candidate = trim((string) (explode(',', (string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? ''))[0] ?? ''));
        if (filter_var($candidate, FILTER_VALIDATE_IP)) return $candidate;
    }
    return $remote;
}

function maniAnalyticsHash(string $namespace, string $value): string {
    $salt = (string) (maniAnalyticsConfig()['salt'] ?? '');
    return hash_hmac('sha256', $namespace . "\0" . $value, $salt, true);
}

function maniAnalyticsCleanText($value, int $limit = 100): string {
    $text = trim(preg_replace('/[\x00-\x1F\x7F]+/u', ' ', (string) $value) ?? '');
    return mb_substr($text, 0, $limit, 'UTF-8');
}

function maniAnalyticsPath($value): string {
    $path = parse_url((string) $value, PHP_URL_PATH);
    $path = is_string($path) ? $path : '/';
    if ($path === '' || $path[0] !== '/') $path = '/';
    return mb_substr($path, 0, 160, 'UTF-8');
}

function maniAnalyticsUuid($value): string {
    $uuid = strtolower(trim((string) $value));
    return preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8a-f][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/', $uuid)
        ? $uuid
        : '';
}

function maniAnalyticsAllowedEvents(): array {
    return [
        'page_view', 'landing_view', 'experiment_view', 'section_view', 'cta_click',
        'navigation_click', 'social_click', 'tone_switch', 'demo_scenario_click',
        'security_detail_open', 'waitlist_form_open', 'waitlist_form_start',
        'waitlist_phone_focus', 'waitlist_submit', 'waitlist_success', 'form_error',
        'referral_visit', 'referral_signup', 'referral_link_created', 'referral_share',
        'calculator_view', 'calculator_start', 'calculator_complete',
        'calculator_share', 'leak_calculator_change', 'store_click_appstore',
        'store_click_googleplay', 'store_click_rustore', 'cookie_consent',
        'web_vital', 'js_error', 'api_error', 'http_error',
        'bank_support_opened', 'bank_support_issue_opened', 'bank_support_search_used',
        'bank_support_diagnostic_started', 'bank_support_recommendation_shown',
        'bank_support_contact_clicked', 'bank_support_copy_link', 'bank_support_feedback',
        'unknown_support_error',
    ];
}

function maniAnalyticsUserAgentDimensions(string $ua, string $screenClass): array {
    $lower = strtolower($ua);
    $isBot = preg_match('/bot|crawler|spider|slurp|preview|facebookexternalhit|telegrambot|whatsapp|curl|wget/', $lower) === 1;
    if ($isBot) {
        return ['device' => 'bot', 'browser' => 'Bot', 'os' => 'Bot', 'bot' => 1];
    }

    $browser = 'Other';
    if (str_contains($lower, 'yabrowser')) $browser = 'Yandex';
    elseif (str_contains($lower, 'edg/')) $browser = 'Edge';
    elseif (str_contains($lower, 'opr/') || str_contains($lower, 'opera')) $browser = 'Opera';
    elseif (str_contains($lower, 'samsungbrowser')) $browser = 'Samsung';
    elseif (str_contains($lower, 'firefox/')) $browser = 'Firefox';
    elseif (str_contains($lower, 'chrome/') || str_contains($lower, 'crios/')) $browser = 'Chrome';
    elseif (str_contains($lower, 'safari/')) $browser = 'Safari';

    $os = 'Other';
    if (str_contains($lower, 'android')) $os = 'Android';
    elseif (preg_match('/iphone|ipad|ipod/', $lower)) $os = 'iOS';
    elseif (str_contains($lower, 'windows')) $os = 'Windows';
    elseif (str_contains($lower, 'mac os') || str_contains($lower, 'macintosh')) $os = 'macOS';
    elseif (str_contains($lower, 'linux')) $os = 'Linux';

    $allowedClasses = ['mobile', 'tablet', 'desktop'];
    $device = in_array($screenClass, $allowedClasses, true)
        ? $screenClass
        : (preg_match('/ipad|tablet/', $lower) ? 'tablet' : (preg_match('/mobile|iphone|android/', $lower) ? 'mobile' : 'desktop'));
    return ['device' => $device, 'browser' => $browser, 'os' => $os, 'bot' => 0];
}

function maniAnalyticsRateLimited(PDO $pdo, int $cost): bool {
    $bucket = (int) floor(time() / 60);
    $ipKey = maniAnalyticsHash('rate:' . gmdate('Y-m-d'), maniAnalyticsClientIp());
    $statement = $pdo->prepare(
        'INSERT INTO mani_analytics_rate_limits (bucket_hash, minute_bucket, hits)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE hits = hits + VALUES(hits)'
    );
    $statement->execute([$ipKey, $bucket, $cost]);
    $read = $pdo->prepare('SELECT hits FROM mani_analytics_rate_limits WHERE bucket_hash = ? AND minute_bucket = ?');
    $read->execute([$ipKey, $bucket]);
    $hits = (int) $read->fetchColumn();
    if (random_int(1, 100) === 1) {
        $pdo->exec('DELETE FROM mani_analytics_rate_limits WHERE updated_at < (NOW() - INTERVAL 2 DAY)');
    }
    return $hits > 240;
}

function maniAnalyticsOccurredAt($value): string {
    try {
        $date = new DateTimeImmutable((string) $value);
        $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
        if (abs($date->getTimestamp() - $now->getTimestamp()) > 86400) throw new RuntimeException();
        return $date->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.v');
    } catch (Throwable) {
        return (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('Y-m-d H:i:s.v');
    }
}

function maniAnalyticsInsertEvents(PDO $pdo, array $events): int {
    $allowedEvents = array_fill_keys(maniAnalyticsAllowedEvents(), true);
    $ua = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');
    $sql = 'INSERT IGNORE INTO mani_analytics_events (
        event_id, occurred_at, event_name, page_path, session_hash, visitor_hash,
        consent_state, hero_headline_variant, hero_copy_variant, source, medium,
        campaign, content, term, cta_location, section_name, network, tone,
        control_name, action_name, error_type, status_code, metric_name, metric_value,
        ref_present, duplicate_event, device_class, browser_family, os_family, is_bot
    ) VALUES (
        :event_id, :occurred_at, :event_name, :page_path, :session_hash, :visitor_hash,
        :consent_state, :hero_headline_variant, :hero_copy_variant, :source, :medium,
        :campaign, :content, :term, :cta_location, :section_name, :network, :tone,
        :control_name, :action_name, :error_type, :status_code, :metric_name, :metric_value,
        :ref_present, :duplicate_event, :device_class, :browser_family, :os_family, :is_bot
    )';
    $statement = $pdo->prepare($sql);
    $inserted = 0;

    foreach (array_slice($events, 0, 20) as $event) {
        if (!is_array($event)) continue;
        $name = maniAnalyticsCleanText($event['name'] ?? '', 64);
        $eventId = maniAnalyticsUuid($event['event_id'] ?? '');
        $sessionId = maniAnalyticsUuid($event['session_id'] ?? '');
        if (!isset($allowedEvents[$name]) || $eventId === '' || $sessionId === '') continue;

        $consent = (string) ($event['consent_state'] ?? 'unknown');
        if (!in_array($consent, ['unknown', 'necessary', 'accepted'], true)) $consent = 'unknown';
        $visitorId = $consent === 'accepted' ? maniAnalyticsUuid($event['visitor_id'] ?? '') : '';
        $heroHeadline = in_array(($event['hero_headline_variant'] ?? ''), ['chaos', 'order'], true)
            ? (string) $event['hero_headline_variant'] : null;
        $heroCopy = in_array(($event['hero_copy_variant'] ?? ''), ['control', 'short'], true)
            ? (string) $event['hero_copy_variant'] : null;
        $metricName = in_array(($event['metric_name'] ?? ''), ['LCP', 'CLS', 'INP'], true)
            ? (string) $event['metric_name'] : null;
        $metricValue = $metricName !== null && is_numeric($event['metric_value'] ?? null)
            ? max(0, min(600000, (float) $event['metric_value'])) : null;
        $statusCode = is_numeric($event['status_code'] ?? null)
            ? max(0, min(599, (int) $event['status_code'])) : null;
        $dimensions = maniAnalyticsUserAgentDimensions($ua, (string) ($event['screen_class'] ?? ''));

        $statement->execute([
            ':event_id' => $eventId,
            ':occurred_at' => maniAnalyticsOccurredAt($event['occurred_at'] ?? ''),
            ':event_name' => $name,
            ':page_path' => maniAnalyticsPath($event['page_path'] ?? '/'),
            ':session_hash' => maniAnalyticsHash('session', $sessionId),
            ':visitor_hash' => $visitorId !== '' ? maniAnalyticsHash('visitor', $visitorId) : null,
            ':consent_state' => $consent,
            ':hero_headline_variant' => $heroHeadline,
            ':hero_copy_variant' => $heroCopy,
            ':source' => maniAnalyticsCleanText($event['source'] ?? '', 100) ?: null,
            ':medium' => maniAnalyticsCleanText($event['medium'] ?? '', 100) ?: null,
            ':campaign' => maniAnalyticsCleanText($event['campaign'] ?? '', 100) ?: null,
            ':content' => maniAnalyticsCleanText($event['app_version'] ?? $event['content'] ?? '', 100) ?: null,
            ':term' => maniAnalyticsCleanText($event['term'] ?? '', 100) ?: null,
            ':cta_location' => maniAnalyticsCleanText($event['cta_location'] ?? '', 64) ?: null,
            ':section_name' => maniAnalyticsCleanText($event['category'] ?? $event['section'] ?? '', 64) ?: null,
            ':network' => maniAnalyticsCleanText($event['bank_slug'] ?? $event['network'] ?? '', 32) ?: null,
            ':tone' => maniAnalyticsCleanText($event['tone'] ?? '', 24) ?: null,
            ':control_name' => maniAnalyticsCleanText($event['platform'] ?? $event['experiment'] ?? $event['control'] ?? $event['field'] ?? '', 32) ?: null,
            ':action_name' => maniAnalyticsCleanText($event['issue_code'] ?? $event['action'] ?? $event['share_target'] ?? $event['target'] ?? '', 32) ?: null,
            ':error_type' => maniAnalyticsCleanText($event['error_type'] ?? '', 48) ?: null,
            ':status_code' => $statusCode,
            ':metric_name' => $metricName,
            ':metric_value' => $metricValue,
            ':ref_present' => !empty($event['ref_present']) ? 1 : 0,
            ':duplicate_event' => !empty($event['duplicate']) ? 1 : 0,
            ':device_class' => $dimensions['device'],
            ':browser_family' => $dimensions['browser'],
            ':os_family' => $dimensions['os'],
            ':is_bot' => $dimensions['bot'],
        ]);
        $inserted += $statement->rowCount();
    }
    return $inserted;
}

function maniAnalyticsServerEvent(string $name, array $params = []): void {
    try {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
        $uuid = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
        maniAnalyticsInsertEvents(maniAnalyticsPdo(), [[
            'name' => $name,
            'event_id' => $uuid,
            'session_id' => $uuid,
            'occurred_at' => gmdate('c'),
            'page_path' => $params['page_path'] ?? '/',
            'consent_state' => 'unknown',
            'status_code' => $params['status_code'] ?? null,
            'error_type' => $params['error_type'] ?? null,
            'screen_class' => 'unknown',
        ]]);
    } catch (Throwable) {
        // Operational telemetry must never break the public request.
    }
}
