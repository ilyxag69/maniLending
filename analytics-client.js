(function initManiAnalytics() {
  // One loading policy on every page; an explicit opt-out remains an opt-out
  const externalAllowed = () => {
    if (["localhost", "127.0.0.1", "::1", "[::1]"].includes(location.hostname)) return false;
    try { return localStorage.getItem("maniCookieConsent") !== "necessary"; }
    catch { return false; }
  };
  function loadExternal() {
    if (!externalAllowed()) return;
    if (!window.maniAnalyticsLoaded) {
      window.maniAnalyticsLoaded = true;
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", "G-P6TDY2N5FK");
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://www.googletagmanager.com/gtag/js?id=G-P6TDY2N5FK";
      document.head.appendChild(script);
    }
    if (!window.maniYandexMetricaLoaded) {
      window.maniYandexMetricaLoaded = true;
      window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
      window.ym.l = Date.now();
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://mc.yandex.ru/metrika/tag.js";
      document.head.appendChild(script);
      window.ym(103776176, "init", { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false });
    }
  }
  loadExternal();
  const topMailCounterId = "3681438";

  if (externalAllowed() && !window.__maniTopMailInitialized) {
    window.__maniTopMailInitialized = true;
    window._tmr = window._tmr || [];
    window._tmr.push({ id: topMailCounterId, type: "pageView", start: Date.now() });

    if (!document.getElementById("tmr-code")) {
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.async = true;
      script.id = "tmr-code";
      script.src = "https://top-fwz1.mail.ru/js/code.js";
      const firstScript = document.getElementsByTagName("script")[0];
      firstScript?.parentNode?.insertBefore(script, firstScript);
    }
  }

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
  let inFlight = false;
  let failures = 0;

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
      const host = document.referrer ? new URL(document.referrer).hostname : "";
      const ownHost = location.hostname.replace(/^www\./, "");
      referrer = host.replace(/^www\./, "") === ownHost ? "" : host;
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

  async function flush(useBeacon = false) {
    clearTimeout(flushTimer);
    flushTimer = 0;
    if (!queue.length || inFlight) return;
    const batch = queue.slice(0, 20);
    const body = JSON.stringify({ events: batch });
    if (useBeacon && navigator.sendBeacon) {
      if (navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }))) {
        queue.splice(0, batch.length);
        if (queue.length) flushTimer = window.setTimeout(() => flush(), 250);
        return;
      }
    }
    inFlight = true;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        credentials: "same-origin",
        keepalive: true,
      });
      if (!response.ok) throw new Error("Analytics delivery failed");
      queue.splice(0, batch.length);
      failures = 0;
    } catch {
      failures += 1;
      // Keep stable event IDs for server deduplication; never store events on disk
      if (failures >= 3) { queue.splice(0, batch.length); failures = 0; }
    } finally {
      inFlight = false;
    }
    if (queue.length) flushTimer = window.setTimeout(() => flush(), failures ? 2000 * failures : 250);
  }

  function track(name, params = {}) {
    if (queue.length >= 100) return;
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
    const last = readJson(lastAttributionKey);
    // Direct and internal navigation must not overwrite a known acquisition touch
    if (!last || snapshot.source !== "direct" || new URLSearchParams(location.search).has("utm_campaign")) {
      storageSet("localStorage", lastAttributionKey, JSON.stringify(snapshot));
    }
    visitorId();
  }

  // Self-hosted official implementation handles CLS windows, INP and bfcache
  const vitalsScript = document.createElement("script");
  vitalsScript.src = "/vendor/web-vitals-5.1.0.js";
  vitalsScript.async = true;
  vitalsScript.onload = () => {
    const report = ({ name, value }) => {
      track("web_vital", { metric_name: name, metric_value: Number(value.toFixed(4)) });
      flush(document.visibilityState === "hidden");
    };
    window.webVitals?.onLCP(report);
    window.webVitals?.onCLS(report);
    window.webVitals?.onINP(report);
  };
  document.head.appendChild(vitalsScript);

  window.addEventListener("error", () => track("js_error", { error_type: "script_error" }), true);
  window.addEventListener("unhandledrejection", () => track("js_error", { error_type: "promise_rejection" }));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush(true);
  });
  window.addEventListener("pagehide", () => flush(true));

  window.ManiAnalytics = {
    track,
    flush,
    consentChanged: captureConsentAttribution,
    sessionId,
    loadExternal,
    currentAttribution,
    attribution,
  };
  captureConsentAttribution();
  track("page_view", {
    ref_present: new URLSearchParams(location.search).has("ref"),
  });
})();
