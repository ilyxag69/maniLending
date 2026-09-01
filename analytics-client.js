(function initManiAnalytics() {
  if (window.ManiAnalytics) return;

  const endpoint = "/api/analytics";
  const consentKey = "maniCookieConsent";
  const sessionKey = "maniAnalyticsSessionV2";
  const visitorKey = "maniAnalyticsVisitorV1";
  const firstAttributionKey = "maniAttributionFirstV1";
  const lastAttributionKey = "maniAttributionLastV1";
  const allowedFields = new Set([
    "hero_copy_variant", "hero_headline_variant", "source", "medium", "campaign",
    "content", "term", "cta_location", "section", "network", "tone", "control",
    "field", "action", "share_target", "target", "error_type", "status_code",
    "metric_name", "metric_value", "ref_present", "duplicate", "experiment", "variant",
    "issue_code", "category", "bank_slug", "platform", "app_version",
  ]);
  const queue = [];
  let flushTimer = 0;
  let vitalsSent = false;
  const vitals = { LCP: null, CLS: 0, INP: null };

  const storageGet = (type, key) => {
    try {
      return window[type]?.getItem(key) ?? null;
    } catch {
      return null;
    }
  };
  const storageSet = (type, key, value) => {
    try {
      window[type]?.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  };
  const uuid = () => crypto.randomUUID?.() || "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (digit) => (
    Number(digit) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(digit) / 4)))
  ).toString(16));
  const consentState = () => {
    const value = storageGet("localStorage", consentKey);
    return value === "accepted" ? "accepted" : value === "necessary" ? "necessary" : "unknown";
  };
  const sessionId = (() => {
    const existing = storageGet("sessionStorage", sessionKey);
    if (existing) return existing;
    const created = uuid();
    storageSet("sessionStorage", sessionKey, created);
    return created;
  })();
  const visitorId = () => {
    const existing = storageGet("localStorage", visitorKey);
    if (existing) return existing;
    const created = uuid();
    storageSet("localStorage", visitorKey, created);
    return created;
  };
  const clean = (value, limit = 100) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    return String(value ?? "").replace(/[\r\n\t]/g, " ").slice(0, limit);
  };
  const readJson = (key) => {
    try {
      return JSON.parse(storageGet("localStorage", key) || "null");
    } catch {
      return null;
    }
  };
  const currentAttribution = () => {
    const params = new URLSearchParams(location.search);
    let referrer = "";
    try {
      referrer = document.referrer ? new URL(document.referrer).hostname : "";
    } catch {
      referrer = "";
    }
    return {
      source: clean(params.get("utm_source") || referrer || "direct"),
      medium: clean(params.get("utm_medium") || ""),
      campaign: clean(params.get("utm_campaign") || ""),
      content: clean(params.get("utm_content") || ""),
      term: clean(params.get("utm_term") || ""),
    };
  };
  const attribution = () => {
    return readJson(lastAttributionKey) || currentAttribution();
  };
  const screenClass = () => {
    const width = Math.min(window.innerWidth || 0, window.screen?.width || Infinity);
    if (width < 768) return "mobile";
    if (width < 1100) return "tablet";
    return "desktop";
  };

  function flush(useBeacon = false) {
    clearTimeout(flushTimer);
    flushTimer = 0;
    if (!queue.length) return;
    const body = JSON.stringify({ events: queue.splice(0, 20) });
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
    } else {
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        credentials: "same-origin",
        keepalive: true,
      }).catch(() => {});
    }
    if (queue.length) flushTimer = window.setTimeout(() => flush(), 250);
  }

  function track(name, params = {}) {
    const touch = attribution();
    const event = {
      name: clean(name, 64),
      event_id: uuid(),
      occurred_at: new Date().toISOString(),
      page_path: location.pathname,
      session_id: sessionId,
      visitor_id: visitorId(),
      consent_state: consentState(),
      screen_class: screenClass(),
      source: touch.source,
      medium: touch.medium,
      campaign: touch.campaign,
      content: touch.content,
      term: touch.term,
      hero_copy_variant: document.documentElement.dataset.heroCopyVariant || "",
      hero_headline_variant: document.documentElement.dataset.heroHeadlineVariant || "",
    };
    Object.entries(params).forEach(([key, value]) => {
      if (allowedFields.has(key) && value !== "" && value != null) event[key] = clean(value);
    });
    queue.push(event);
    if (queue.length >= 8) flush();
    else if (!flushTimer) flushTimer = window.setTimeout(() => flush(), 1200);
  }

  function captureConsentAttribution() {
    const snapshot = currentAttribution();
    if (!storageGet("localStorage", firstAttributionKey)) {
      storageSet("localStorage", firstAttributionKey, JSON.stringify(snapshot));
    }
    storageSet("localStorage", lastAttributionKey, JSON.stringify(snapshot));
    visitorId();
  }

  function sendVitals() {
    if (vitalsSent) return;
    vitalsSent = true;
    if (vitals.LCP != null) track("web_vital", { metric_name: "LCP", metric_value: Math.round(vitals.LCP) });
    track("web_vital", { metric_name: "CLS", metric_value: Number(vitals.CLS.toFixed(4)) });
    if (vitals.INP != null) track("web_vital", { metric_name: "INP", metric_value: Math.round(vitals.INP) });
    flush(true);
  }

  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) vitals.LCP = last.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (!entry.hadRecentInput) vitals.CLS += entry.value;
      });
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.interactionId && (vitals.INP == null || entry.duration > vitals.INP)) {
          vitals.INP = entry.duration;
        }
      });
    }).observe({ type: "event", buffered: true, durationThreshold: 40 });
  } catch {
    // Older browsers still report page and interaction events.
  }

  window.addEventListener("error", () => track("js_error", { error_type: "script_error" }), true);
  window.addEventListener("unhandledrejection", () => track("js_error", { error_type: "promise_rejection" }));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") sendVitals();
  });
  window.addEventListener("pagehide", sendVitals);

  window.ManiAnalytics = {
    track,
    flush,
    consentChanged: captureConsentAttribution,
    sessionId,
  };
  captureConsentAttribution();
  track("page_view", {
    ref_present: new URLSearchParams(location.search).has("ref"),
  });
})();
