(function initManiProductStatus() {
  // This is a navigation schedule, not an authentication or entitlement gate
  function launchState(config, now = Date.now()) {
    if (config?.status !== "web_beta") return { scheduled: false, open: false, remaining: 0 };
    if (!config?.launch) return { scheduled: false, open: true, remaining: 0 };
    const start = Date.parse(config.launch.startsAt);
    const valid = Number.isFinite(start) && /(?:Z|[+-]\d{2}:\d{2})$/.test(config.launch.startsAt);
    const remaining = valid ? Math.max(0, Math.ceil((start - now) / 1000)) : 0;
    return { scheduled: true, open: valid && now >= start, valid, remaining };
  }
  window.ManiLaunchClock = Object.freeze({ state: launchState });
  function setLabel(element, label) {
    const span = element.querySelector("span");
    if (span) {
      span.textContent = label;
      return;
    }
    const textNode = [...element.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
    if (textNode) textNode.nodeValue = `${label} `;
    else element.prepend(`${label} `);
  }

  function apply() {
    const config = window.MANI_PRODUCT_CONFIG || {};
    const launch = launchState(config);
    const status = ["waitlist", "closed_beta", "store_review", "web_beta", "preorder", "launched"].includes(config.status) ? config.status : "waitlist";
    const stores = {
      apple: config.stores?.appStore || "",
      google: config.stores?.googlePlay || "",
      rustore: config.stores?.ruStore || "",
    };
    const waitlistLabel = config.waitlist?.cta || "Узнать о запуске";
    const acceptsInvites = ["waitlist", "closed_beta", "store_review"].includes(status);
    const storeLabels = status === "preorder"
      ? { apple: "Предзаказать в App Store", google: "Пройти предрегистрацию в Google Play", rustore: "Скоро в RuStore" }
      : { apple: "Скачать в App Store", google: "Скачать в Google Play", rustore: "Скачать в RuStore" };
    document.documentElement.dataset.productStatus = status;
    const safeStoreUrl = (value) => {
      try {
        const url = new URL(value);
        return url.protocol === "https:" ? url.href : "";
      } catch {
        return "";
      }
    };
    Object.keys(stores).forEach((store) => {
      stores[store] = safeStoreUrl(stores[store]);
    });

    const webUrl = safeStoreUrl(config.web?.url || "");
    const webReady = status === "web_beta" && webUrl && new URL(webUrl).hostname === "webapp.moimani.ai" && !new URL(webUrl).username && !new URL(webUrl).password;
    function attributedWebUrl() {
      const url = new URL(webUrl);
      const attribution = window.ManiAnalytics?.attribution?.() || {};
      for (const key of ["source", "medium", "campaign", "content", "term"]) {
        const value = String(attribution[key] || "").slice(0, 100);
        if (value) url.searchParams.set(`utm_${key}`, value);
      }
      return url.href;
    }

    document.querySelectorAll("[data-product-cta]").forEach((cta) => {
      if (!cta.dataset.launchGuardBound) {
        cta.dataset.launchGuardBound = "true";
        cta.addEventListener("click", event => {
          const current = window.MANI_PRODUCT_CONFIG || {};
          if (current.status === "web_beta" && !launchState(current).open) event.preventDefault();
        });
      }
      if (status === "web_beta" && !launch.open) {
        cta.hidden = false;
        cta.removeAttribute("data-open-waitlist");
        cta.removeAttribute("data-store");
        cta.href = "/#launch";
        cta.setAttribute("aria-disabled", "true");
        cta.title = launch.valid ? `Открытие ${config.launch.label}` : "Дата запуска уточняется";
        setLabel(cta, launch.valid ? `Откроется ${config.launch.label}` : "Дата запуска уточняется");
        return;
      }
      cta.removeAttribute("aria-disabled");
      cta.removeAttribute("title");
      if (webReady) {
        cta.hidden = false;
        cta.removeAttribute("data-open-waitlist");
        cta.removeAttribute("data-store");
        cta.href = attributedWebUrl();
        cta.removeAttribute("target");
        setLabel(cta, config.web?.cta || "Попробовать mani");
        if (!cta.dataset.webTrackingBound) {
          cta.dataset.webTrackingBound = "true";
          cta.addEventListener("click", (event) => {
            if ((window.MANI_PRODUCT_CONFIG || {}).status !== "web_beta") return;
            if (!launchState(window.MANI_PRODUCT_CONFIG || {}).open) { event.preventDefault(); return; }
            cta.href = attributedWebUrl();
            window.ManiAnalytics?.track("navigation_click", { action: "open_web_app", target: "web_app", cta_location: cta.dataset.earlyAccess || location.pathname });
            window.gtag?.("event", "webapp_open", { cta_location: cta.dataset.earlyAccess || location.pathname });
          });
        }
        return;
      }
      if (status === "web_beta") {
        cta.hidden = false;
        cta.removeAttribute("data-open-waitlist");
        cta.href = "/web-version";
        setLabel(cta, "Как открыть mani");
        return;
      }
      if (acceptsInvites) {
        setLabel(cta, waitlistLabel);
        cta.href = "/#waitlist-dialog";
        cta.setAttribute("data-open-waitlist", "");
        return;
      }
      const firstAvailable = ["apple", "google", "rustore"].find((store) => stores[store]);
      if (!firstAvailable) {
        cta.hidden = true;
        return;
      }
      cta.removeAttribute("data-open-waitlist");
      cta.href = stores[firstAvailable];
      cta.target = "_blank";
      cta.rel = "noopener noreferrer";
      cta.dataset.store = firstAvailable;
      setLabel(cta, storeLabels[firstAvailable]);
    });

    document.querySelectorAll("[data-store-notify]").forEach((cta) => {
      setLabel(cta, config.waitlist?.cta || "Узнать о выходе в магазинах");
    });

    document.querySelectorAll("[data-product-store-actions]").forEach((container) => {
      if (acceptsInvites) return;
      const available = ["apple", "google", "rustore"].filter((store) => stores[store]);
      if (!available.length) return;
      container.hidden = false;
      container.replaceChildren(...available.map((store) => {
        const link = document.createElement("a");
        link.className = "nm-button nm-button-secondary";
        link.href = stores[store];
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.dataset.store = store;
        link.textContent = storeLabels[store];
        return link;
      }));
    });
  }

  window.ManiProductStatus = Object.freeze({ apply });
  apply();
  let previousOpen;
  function tick() {
    const config = window.MANI_PRODUCT_CONFIG || {};
    const state = launchState(config);
    if (previousOpen !== state.open) { apply(); previousOpen = state.open; }
    const parts = [Math.floor(state.remaining / 86400), Math.floor(state.remaining / 3600) % 24, Math.floor(state.remaining / 60) % 60, state.remaining % 60];
    document.querySelectorAll("[data-launch-countdown]").forEach(root => {
      root.hidden = !state.scheduled || state.open;
      root.querySelectorAll("[data-launch-part]").forEach((node, index) => { node.textContent = String(parts[index]).padStart(2, "0"); });
    });
    document.querySelectorAll("[data-launch-state]").forEach(node => {
      const value = state.open ? "Тестирование открыто для всех" : state.scheduled ? (state.valid ? `Общий старт ${config.launch.label}` : "Дата запуска уточняется") : config.release?.label || "Готовим публичный запуск";
      if (node.textContent !== value) node.textContent = value;
    });
    document.querySelectorAll("[data-launch-copy]").forEach(node => {
      node.textContent = state.open ? node.dataset.afterLaunch : config.release?.next || node.dataset.beforeLaunch;
    });
  }
  tick();
  if (window.MANI_PRODUCT_CONFIG?.launch) {
    setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("pageshow", tick);
  }
})();
