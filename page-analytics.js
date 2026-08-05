(function initPageAnalytics() {
  const consent = (() => {
    try {
      return localStorage.getItem("maniCookieConsent");
    } catch {
      return null;
    }
  })();
  const track = (name, params = {}) => window.ManiAnalytics?.track(name, params);

  if (consent === "accepted") {
    const googleAnalyticsId = "G-P6TDY2N5FK";
    const yandexMetricaId = 103776176;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", googleAnalyticsId);

    const gaScript = document.createElement("script");
    gaScript.async = true;
    gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`;
    document.head.appendChild(gaScript);

    (function initYandex(m, e, t, r, i, k, a) {
      m[i] = m[i] || function ym() {
        (m[i].a = m[i].a || []).push(arguments);
      };
      m[i].l = Date.now();
      k = e.createElement(t);
      a = e.getElementsByTagName(t)[0];
      k.async = 1;
      k.src = r;
      a.parentNode.insertBefore(k, a);
    })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
    window.ym(yandexMetricaId, "init", {
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      webvisor: false,
    });
  }

  document.querySelectorAll("[data-product-cta]").forEach((cta) => {
    cta.addEventListener("click", () => {
      const location = window.location.pathname === "/faq" ? "faq" : "security";
      track("cta_click", { cta_location: location });
      window.gtag?.("event", "cta_click", { cta_location: location });
      window.ym?.(103776176, "reachGoal", "cta_click", { cta_location: location });
    });
  });

  document.querySelectorAll("main section[id], main > section, main article").forEach((section, index) => {
    section.dataset.analyticsSection ||= section.id || `${location.pathname.slice(1) || "home"}-${index + 1}`;
  });
  if ("IntersectionObserver" in window) {
    const viewed = new Set();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const name = entry.target.dataset.analyticsSection;
        if (!name || viewed.has(name)) return;
        viewed.add(name);
        track("section_view", { section: name });
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.45 });
    document.querySelectorAll("[data-analytics-section]").forEach((section) => observer.observe(section));
  }
})();
