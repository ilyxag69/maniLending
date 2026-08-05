(function initManiProductStatus() {
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
    const status = ["waitlist", "preorder", "launched"].includes(config.status) ? config.status : "waitlist";
    const stores = {
      apple: config.stores?.appStore || "",
      google: config.stores?.googlePlay || "",
      rustore: config.stores?.ruStore || "",
    };
    const waitlistLabel = config.waitlist?.cta || "Занять место среди первых 1000";
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

    document.querySelectorAll("[data-product-cta]").forEach((cta) => {
      if (status === "waitlist") {
        setLabel(cta, waitlistLabel);
        if (!cta.hasAttribute("data-open-waitlist")) cta.href = "/#early-access";
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

    document.querySelectorAll("[data-product-store-actions]").forEach((container) => {
      if (status === "waitlist") return;
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
})();
