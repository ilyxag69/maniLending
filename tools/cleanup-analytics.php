<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once dirname(__DIR__) . '/api/analytics-lib.php';

$retentionDays = (int) (getenv('MANI_ANALYTICS_RETENTION_DAYS') ?: 180);
$retentionDays = max(30, min(730, $retentionDays));

$pdo = maniAnalyticsPdo();
$events = $pdo->prepare(
    "DELETE FROM mani_analytics_events WHERE received_at < (UTC_TIMESTAMP() - INTERVAL {$retentionDays} DAY)"
);
$events->execute();

$rateLimits = $pdo->exec(
    'DELETE FROM mani_analytics_rate_limits WHERE updated_at < (UTC_TIMESTAMP() - INTERVAL 2 DAY)'
);

printf(
    "Deleted %d analytics events older than %d days and %d expired rate-limit buckets.\n",
    $events->rowCount(),
    $retentionDays,
    (int) $rateLimits
);
