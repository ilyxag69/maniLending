const toast = document.querySelector("[data-toast]");
const menuButton = document.querySelector(".menu");
const mobileMenu = document.querySelector(".mobile-menu-panel");
const toneSection = document.querySelector("[data-mani-character-switcher]");
const toneButtons = document.querySelectorAll("[data-tone]");
const toneImage = document.querySelector("[data-tone-image]");
const toneQuote = document.querySelector("[data-tone-quote]");
const roadmapGrid = document.querySelector(".roadmap-grid");
const waitlistBlocks = document.querySelectorAll("[data-waitlist]");
const waitlistForms = document.querySelectorAll("[data-waitlist-form]");
const cookieBanner = document.querySelector("[data-cookie-banner]");
const cookieAcceptButton = document.querySelector("[data-cookie-accept]");
const demoTabs = document.querySelectorAll("[data-demo-tab]");
const demoPhone = document.querySelector(".demo-phone");
const stickyCta = document.querySelector(".mobile-sticky-cta");
const siteHeader = document.querySelector(".nm-header");
const calcSubscriptions = document.querySelector("[data-calc-subscriptions]");
const calcPrice = document.querySelector("[data-calc-price]");
const calcLeaks = document.querySelector("[data-calc-leaks]");
const calcLeakPrice = document.querySelector("[data-calc-leak-price]");
const cookieConsentKey = "maniCookieConsent";
const heroExperimentKey = "maniHeroCopyVariantV1";
const pdnConsentVersion = "waitlist-pdn-2026-06-08";
const googleAnalyticsId = "G-P6TDY2N5FK";
const yandexMetricaId = 103776176;
const productConfig = window.MANI_PRODUCT_CONFIG || {
  status: "waitlist",
  stores: {},
  waitlist: { limit: 1000, cta: "Получить ранний доступ" },
};
const productStatus = ["waitlist", "preorder", "launched"].includes(productConfig.status)
  ? productConfig.status
  : "waitlist";
const attributionFirstKey = "maniAttributionFirstV1";
const attributionLastKey = "maniAttributionLastV1";
const referralSourceKey = "maniReferralSource";
const waitlistIdentityKey = "maniWaitlistIdentityV1";
const characterPreferenceKey = "maniCharacterPreferenceV1";

function storageGet(type, key) {
  try {
    return window[type]?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function storageSet(type, key, value) {
  try {
    window[type]?.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

const analyticsSessionId = (() => {
  const existing = storageGet("sessionStorage", "maniAnalyticsSessionV1");
  if (existing) return existing;
  const created = crypto.randomUUID?.() || `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  storageSet("sessionStorage", "maniAnalyticsSessionV1", created);
  return created;
})();
const phoneCountries = [
  { iso: "RU", code: "+7", length: 10 },
  { iso: "BY", code: "+375", length: 9 },
  { iso: "KZ", code: "+7", length: 10 },
  { iso: "AM", code: "+374", length: 8 },
  { iso: "GE", code: "+995", length: 9 },
  { iso: "TR", code: "+90", length: 10 },
  { iso: "AE", code: "+971", length: 9 },
  { iso: "US", code: "+1", length: 10 },
  { iso: "OTHER", code: "+", length: [8, 15] },
];
let toastTimer;
let currentTone = "motivator";
let referralSourceMemory = "";
const viewedSections = new Set();
let waitlistStats = {
  total: 1000,
  registered: 0,
  left: 1000,
  percent: 0,
};
let waitlistStatsUnlocked = false;

function updateGlassHeader() {
  siteHeader?.classList.toggle("is-compact", window.scrollY > 28);
}

updateGlassHeader();
window.addEventListener("scroll", updateGlassHeader, { passive: true });

if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

function resetInitialScrollPosition() {
  if (window.location.hash) return;
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

resetInitialScrollPosition();
requestAnimationFrame(resetInitialScrollPosition);
setTimeout(resetInitialScrollPosition, 0);
setTimeout(resetInitialScrollPosition, 120);
window.addEventListener("pageshow", resetInitialScrollPosition);
window.addEventListener("DOMContentLoaded", resetInitialScrollPosition);
window.addEventListener("load", resetInitialScrollPosition);

const links = {
  apple: productConfig.stores?.appStore || "",
  google: productConfig.stores?.googlePlay || "",
  rustore: productConfig.stores?.ruStore || "",
  youtube: "https://www.youtube.com/@mani_app",
  instagram: "https://www.instagram.com/moimani.ai?igsh=MW9tM2plM2UwZnZoNw%3D%3D&utm_source=qr",
  telegram: "https://t.me/moi_mani_ai",
  vkvideo: "https://vkvideo.ru/@club240056458",
  dzen: "https://dzen.ru/user/k88jy5w3kcoxjabefs8g_u6d1ve?share_to=link",
  x: "",
};

const tones = {
  motivator: {
    image: "/assets/mani/character-switcher/mascots/motivator-pointing-fixed-v3.png",
    alt: "Белый Мани, Мотиватор",
    quote: "Спокойно разберёмся и найдём лучший следующий шаг.",
  },
  fun: {
    image: "/assets/mani/character-switcher/mascots/veselchak-pointing-clean-v4.png",
    alt: "Чёрный Мани, Весельчак",
    quote: "Деньги опять дали дёру. Сейчас поймаем беглецов и устроим им финансовый допрос.",
  },
};

const roadmapItems = [
  {
    kicker: "Скоро в mani",
    title: "Беспроцентный период по кредиткам",
    text: "Мани покажет даты и суммы беспроцентного периода. Не даст банкам нажиться на тебе.",
  },
  {
    kicker: "Скоро в mani",
    title: "Цели и челленджи",
    text: "Достигайте цели с игровой механикой. Мани поможет копить и поощрит за успехи.",
  },
  {
    kicker: "Скоро в mani",
    title: "Сколько стоит моя жизнь",
    text: "Квартиры, машины, инвестиции, крипта. Мани покажет реальную картину твоих активов и пассивов.",
  },
  {
    kicker: "Скоро в mani",
    title: "Детальные расходы по чекам",
    text: "Навели камеру на чек - Мани сам добавит сумму, категорию и магазин. Без ручного ввода.",
  },
];

const demoScenarios = {
  subscriptions: {
    status: "видит повтор 649 ₽",
    signals: ["649 ₽ каждый месяц", "13-е число", "Категория: сервис"],
    title: "Мани показывает повторяющиеся списания",
    copy: "Он не знает, пользуешься ты сервисом или нет. Зато видит регулярный платеж, сумму, дату и помогает быстро решить: оставить или отключить.",
    main: "Вижу регулярное списание 649 ₽. Это похоже на подписку или сервисный платеж.",
    action: "Проверить, нужен ли этот платеж. Отключение ненужной подписки сэкономит до 7 788 ₽ в год.",
    label: "Потенциально лишний расход",
    value: "7 788 ₽/год",
  },
  leaks: {
    status: "увидел лишний темп",
    signals: ["+42% к обычному темпу", "7 мелких покупок", "2 дня до лимита"],
    title: "Мани замечает темп, а не следит за человеком",
    copy: "Он сравнивает финансовый ритм: сколько списаний, в каких категориях и как быстро тает бюджет.",
    main: "За неделю мелкие траты выросли на 42% относительно обычного темпа.",
    action: "Поставить лимит на неделю и получить предупреждение до следующего перебора.",
    label: "Риск перерасхода",
    value: "до 11 400 ₽/мес",
  },
  budget: {
    status: "собрал план",
    signals: ["9 дней до зарплаты", "1 850 ₽ в день", "3 категории в риске"],
    title: "Бюджет становится понятным без таблиц",
    copy: "Мани переводит хаос по картам в простые действия: сколько можно тратить и где стоит притормозить.",
    main: "До зарплаты 9 дней. В безопасном темпе можно тратить 1 850 ₽ в день.",
    action: "Разложить лимиты по категориям и предупредить, если день пошёл не по плану.",
    label: "Безопасный лимит",
    value: "1 850 ₽/день",
  },
};

const contactForm = document.querySelector("[data-contact-form]");
if (contactForm) {
  const messageField = contactForm.elements.message;
  const counter = contactForm.querySelector("[data-contact-counter]");
  const result = contactForm.querySelector("[data-contact-result]");
  const submitButton = contactForm.querySelector("button[type='submit']");

  const updateContactCounter = () => {
    if (counter) counter.textContent = String(messageField.value.length);
  };
  messageField.addEventListener("input", updateContactCounter);

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    result.classList.remove("is-error", "is-success");
    if (!contactForm.checkValidity()) {
      contactForm.reportValidity();
      result.textContent = "Заполните обязательные поля.";
      result.classList.add("is-error");
      return;
    }

    const data = new FormData(contactForm);
    const payload = {
      topic: String(data.get("topic") || ""),
      name: String(data.get("name") || "").trim(),
      replyTo: String(data.get("replyTo") || "").trim(),
      message: String(data.get("message") || "").trim(),
      website: String(data.get("website") || ""),
      pdnConsent: data.get("pdnConsent") === "yes",
    };
    submitButton.disabled = true;
    submitButton.querySelector("span").textContent = "Отправляем…";
    result.textContent = "Отправляем сообщение…";

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(responseData.message || "Не удалось отправить сообщение");
      contactForm.reset();
      updateContactCounter();
      result.textContent = "Сообщение отправлено. Ответим по указанному контакту.";
      result.classList.add("is-success");
    } catch (error) {
      result.textContent = `${error.message}. Можно написать напрямую в Telegram @eto_mani.`;
      result.classList.add("is-error");
    } finally {
      submitButton.disabled = false;
      submitButton.querySelector("span").textContent = "Отправить сообщение";
    }
  });
}

function loadYandexMetrica() {
  if (window.maniYandexMetricaLoaded) return;
  window.maniYandexMetricaLoaded = true;
  (function initYandex(m, e, t, r, i, k, a) {
    m[i] = m[i] || function ym() {
      (m[i].a = m[i].a || []).push(arguments);
    };
    m[i].l = 1 * new Date();
    for (let j = 0; j < document.scripts.length; j += 1) {
      if (document.scripts[j].src === r) return;
    }
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

function loadAnalytics() {
  if (window.maniAnalyticsLoaded) return;
  window.maniAnalyticsLoaded = true;
  captureAttribution();

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
}

function setCookieConsent(value) {
  storageSet("localStorage", cookieConsentKey, value);
  window.ManiAnalytics?.consentChanged();
  closeCookieConsent();
  if (stickyCta) stickyCta.hidden = false;
  trackEvent("cookie_consent", { value });
}

function openCookieConsent() {
  if (!cookieBanner) return;
  cookieBanner.hidden = false;
}

function closeCookieConsent() {
  if (cookieBanner) cookieBanner.hidden = true;
}

function initCookieConsent() {
  const previewResetRequested = ["127.0.0.1", "localhost"].includes(window.location.hostname)
    && new URLSearchParams(window.location.search).get("cookie-preview") === "reset";
  if (previewResetRequested) {
    try { localStorage.removeItem(cookieConsentKey); } catch { /* Storage can be disabled. */ }
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("cookie-preview");
    window.history.replaceState({}, "", `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
  }
  const consent = storageGet("localStorage", cookieConsentKey);
  if (consent === "acknowledged") {
    closeCookieConsent();
    return;
  }
  openCookieConsent();
}

const analyticsAllowedFields = new Set([
  "event_id", "page_path", "session_id", "product_status", "hero_copy_variant", "hero_headline_variant",
  "source", "medium", "campaign", "content", "term", "cta_variant", "cta_location",
  "first_source", "first_medium", "first_campaign", "first_content", "first_term",
  "store", "ref_present", "experiment", "variant", "mode", "control", "action",
  "share_target", "network", "section", "target", "tone", "scenario", "field",
  "value", "duplicate", "error_type", "status_code", "metric_name", "metric_value",
]);

function cleanAnalyticsValue(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return String(value ?? "").replace(/[\r\n\t]/g, " ").slice(0, 100);
}

function readStoredJson(key) {
  try {
    return JSON.parse(storageGet("localStorage", key) || "null");
  } catch {
    return null;
  }
}

function getAttributionSnapshot() {
  const params = new URLSearchParams(window.location.search);
  const referrerSource = (() => {
    try {
      return document.referrer ? new URL(document.referrer).hostname : "";
    } catch {
      return "";
    }
  })();
  return {
    source: params.get("utm_source") || referrerSource || "direct",
    medium: params.get("utm_medium") || "",
    campaign: params.get("utm_campaign") || "",
    content: params.get("utm_content") || "",
    term: params.get("utm_term") || "",
  };
}

function captureAttribution() {
  const snapshot = getAttributionSnapshot();
  if (!storageGet("localStorage", attributionFirstKey)) {
    storageSet("localStorage", attributionFirstKey, JSON.stringify(snapshot));
  }
  storageSet("localStorage", attributionLastKey, JSON.stringify(snapshot));
}

function trackEvent(name, params = {}) {
  const firstTouch = readStoredJson(attributionFirstKey) || getAttributionSnapshot();
  const lastTouch = readStoredJson(attributionLastKey) || getAttributionSnapshot();
  const candidate = {
    event_id: crypto.randomUUID?.() || `e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    page_path: window.location.pathname,
    session_id: analyticsSessionId,
    product_status: productStatus,
    hero_copy_variant: document.documentElement.dataset.heroCopyVariant || "unassigned",
    hero_headline_variant: document.documentElement.dataset.heroHeadlineVariant || "unassigned",
    source: lastTouch.source,
    medium: lastTouch.medium,
    campaign: lastTouch.campaign,
    content: lastTouch.content,
    term: lastTouch.term,
    first_source: firstTouch.source,
    first_medium: firstTouch.medium,
    first_campaign: firstTouch.campaign,
    first_content: firstTouch.content,
    first_term: firstTouch.term,
    ...params,
  };
  const payload = Object.fromEntries(
    Object.entries(candidate)
      .filter(([key, value]) => analyticsAllowedFields.has(key) && value !== "" && value != null)
      .map(([key, value]) => [key, cleanAnalyticsValue(value)])
  );

  window.ManiAnalytics?.track(name, payload);

  if (typeof window.gtag === "function") {
    window.gtag("event", name, payload);
  }

  if (typeof window.ym === "function") {
    window.ym(yandexMetricaId, "reachGoal", name, payload);
  }
}

function getWaitlistConversionGoal(ctaLocation) {
  if (["hero", "header", "mobile-menu", "mobile-sticky"].includes(ctaLocation)) return "form1";
  if (ctaLocation === "test-drive") return "form2";
  if (ctaLocation === "final") return "form3";
  return "";
}

function trackWaitlistConversion(ctaLocation) {
  const goal = getWaitlistConversionGoal(ctaLocation);
  if (!goal) return;
  loadYandexMetrica();
  window.ym?.(yandexMetricaId, "reachGoal", goal, { cta_location: ctaLocation });
}

function initProductStatus() {
  window.ManiProductStatus?.apply();
}

function initHeroCopyExperiment() {
  const heroCopy = document.querySelector("[data-hero-copy]");
  if (!heroCopy) return;
  let variant = storageGet("localStorage", heroExperimentKey);
  if (variant !== "control" && variant !== "short") {
    variant = Math.random() < 0.5 ? "control" : "short";
    storageSet("localStorage", heroExperimentKey, variant);
  }
  if (variant === "short") {
    heroCopy.textContent = "Все счета, расходы и подписки в одном месте. Мани показывает, куда уходят деньги, предупреждает о рисках и помогает разобраться в чате.";
  }
  document.documentElement.dataset.heroCopyVariant = variant;
  trackEvent("experiment_view", { experiment: "hero_copy_v1", variant });
}

function initHeroHeadlineExperiment() {
  const headline = document.querySelector("[data-hero-headline]");
  if (!headline) return;
  const variant = Math.random() < 0.5 ? "chaos" : "order";

  if (variant === "order") {
    headline.replaceChildren(
      document.createTextNode("Порядок в деньгах. "),
      Object.assign(document.createElement("span"), { textContent: "здесь и сейчас!" }),
    );
  }

  document.documentElement.dataset.heroHeadlineVariant = variant;
  trackEvent("experiment_view", { experiment: "hero_headline_v1", variant });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function getPhoneCountry(select) {
  const option = select?.selectedOptions?.[0];
  const iso = option?.value || "RU";
  return phoneCountries.find((country) => country.iso === iso) || phoneCountries[0];
}

function findCountryByInternationalNumber(value) {
  const digits = value.replace(/\D/g, "");
  const candidates = phoneCountries
    .filter((country) => country.iso !== "OTHER")
    .sort((a, b) => b.code.length - a.code.length);
  return candidates.find((country) => digits.startsWith(country.code.replace(/\D/g, "")));
}

function getNationalDigits(rawValue, country) {
  let digits = rawValue.replace(/\D/g, "");
  if (!digits) return "";

  if (rawValue.trim().startsWith("+")) {
    const detected = findCountryByInternationalNumber(rawValue);
    if (detected) {
      return digits.slice(detected.code.replace(/\D/g, "").length);
    }
    return digits;
  }

  if ((country.iso === "RU" || country.iso === "KZ") && digits.length === 11 && (digits.startsWith("8") || digits.startsWith("7"))) {
    return digits.slice(1);
  }

  const codeDigits = country.code.replace(/\D/g, "");
  if (country.iso !== "OTHER" && digits.startsWith(codeDigits) && digits.length > country.length) {
    return digits.slice(codeDigits.length);
  }

  return digits;
}

function formatPhoneNational(digits, country) {
  if (!digits) return "";
  if ((country.iso === "RU" || country.iso === "KZ") && digits.length <= 10) {
    return [
      digits.slice(0, 3),
      digits.slice(3, 6),
      digits.slice(6, 8),
      digits.slice(8, 10),
    ].filter(Boolean).join(digits.length > 6 ? "-" : " ");
  }
  if (country.iso === "BY" && digits.length <= 9) {
    return [
      digits.slice(0, 2),
      digits.slice(2, 5),
      digits.slice(5, 7),
      digits.slice(7, 9),
    ].filter(Boolean).join(digits.length > 5 ? "-" : " ");
  }
  if (country.iso === "US" && digits.length <= 10) {
    return [
      digits.slice(0, 3),
      digits.slice(3, 6),
      digits.slice(6, 10),
    ].filter(Boolean).join("-");
  }
  return digits.replace(/(.{3})/g, "$1 ").trim();
}

function validatePhoneDigits(digits, country) {
  if (Array.isArray(country.length)) {
    return digits.length >= country.length[0] && digits.length <= country.length[1];
  }
  return digits.length === country.length;
}

function getPhonePayload(form) {
  const field = form.querySelector("[data-phone-field]");
  const select = field?.querySelector("select[name='phoneCountry']");
  const display = field?.querySelector("input[name='phoneDisplay']");
  const hidden = field?.querySelector("input[name='phone']");
  const hint = form.querySelector("[data-phone-hint]");
  const country = getPhoneCountry(select);
  const rawValue = display?.value || "";
  const hasInput = Boolean(rawValue.trim());
  const detected = rawValue.trim().startsWith("+") ? findCountryByInternationalNumber(rawValue) : null;
  const selectedCountry = detected || country;
  const nationalDigits = getNationalDigits(rawValue, selectedCountry);
  const valid = validatePhoneDigits(nationalDigits, selectedCountry);
  const normalized = `${selectedCountry.code}${nationalDigits}`;

  if (detected && select) {
    select.value = detected.iso;
  }
  if (hidden) hidden.value = valid ? normalized : "";
  if (hint) {
    hint.classList.toggle("is-error", hasInput && !valid);
    hint.textContent = !hasInput
      ? "Например, 999 123 45 67."
      : valid
      ? "Номер заполнен."
      : `Нужно ${Array.isArray(selectedCountry.length) ? "от 8 до 15 цифр" : `${selectedCountry.length} цифр`} без кода страны.`;
  }

  return { valid: hasInput && valid, normalized, nationalDigits, country: selectedCountry };
}

function formatPhoneField(field) {
  const select = field.querySelector("select[name='phoneCountry']");
  const display = field.querySelector("input[name='phoneDisplay']");
  if (!display) return;
  const rawValue = display.value;
  const detected = rawValue.trim().startsWith("+") ? findCountryByInternationalNumber(rawValue) : null;
  const country = detected || getPhoneCountry(select);
  const nationalDigits = getNationalDigits(rawValue, country);
  if (detected && select) {
    select.value = detected.iso;
  }
  display.value = rawValue.trim().startsWith("+") && !detected
    ? `+${nationalDigits}`
    : formatPhoneNational(nationalDigits, country);
  getPhonePayload(field.closest("form"));
}

function updateWaitlistStats(stats = waitlistStats) {
  waitlistStats = {
    ...waitlistStats,
    ...stats,
  };
  waitlistStats.left = Math.max(waitlistStats.total - waitlistStats.registered, 0);
  waitlistStats.percent = Math.min(Math.round((waitlistStats.registered / waitlistStats.total) * 100), 100);

  waitlistBlocks.forEach((block) => {
    const isZeroState = waitlistStats.registered < 1;
    const isEarlyState = waitlistStats.registered < 20;
    const showProgress = waitlistStatsUnlocked && waitlistStats.registered >= 20;
    const showNumbers = waitlistStatsUnlocked;
    block.querySelectorAll("[data-waitlist-registered]").forEach((node) => {
      node.textContent = showNumbers
        ? (isZeroState ? "Очередь только открылась" : waitlistStats.registered.toLocaleString("ru-RU"))
        : "Место узнаешь после заявки";
    });
    block.querySelectorAll("[data-waitlist-registered-label]").forEach((node) => {
      node.textContent = showNumbers
        ? (isZeroState ? "1000 мест для ранних пользователей" : "уже в очереди")
        : "очередь открыта для первых 1000 пользователей";
    });
    block.querySelectorAll("[data-waitlist-left]").forEach((node) => {
      node.textContent = showNumbers ? waitlistStats.left.toLocaleString("ru-RU") : "1000 мест";
    });
    block.querySelectorAll("[data-waitlist-left-label]").forEach((node) => {
      node.textContent = showNumbers
        ? (isZeroState ? "мест для ранних пользователей" : "мест осталось")
        : "ранний доступ бесплатно навсегда";
    });
    block.querySelectorAll("[data-waitlist-percent]").forEach((node) => {
      node.textContent = showNumbers
        ? (isEarlyState ? "Ранний старт" : `${waitlistStats.percent}%`)
        : "Сначала контакт";
    });
    block.querySelectorAll("[data-waitlist-percent-label]").forEach((node) => {
      node.textContent = showNumbers
        ? (isEarlyState ? "успей занять место до публичного запуска" : "заполнено")
        : "потом покажем номер и статус";
    });
    block.querySelectorAll("[data-waitlist-progress]").forEach((node) => {
      node.style.width = `${waitlistStats.percent}%`;
    });
    block.querySelectorAll("[data-waitlist-progress-wrap]").forEach((node) => {
      node.hidden = !showProgress;
    });
    block.querySelectorAll("[data-waitlist-cta-copy]").forEach((node) => {
      node.textContent = showNumbers
        ? (isZeroState
          ? "Очередь только открылась. Успей занять место до публичного запуска."
          : `${waitlistStats.registered.toLocaleString("ru-RU")} человек уже ждут запуск mani.`)
        : "Сколько осталось и на каком ты месте, покажем после заявки.";
    });
    block.querySelectorAll("[data-waitlist-cta-title]").forEach((node) => {
      node.textContent = showNumbers
        ? `${waitlistStats.left.toLocaleString("ru-RU")} мест осталось`
        : "Займи место и узнай номер";
    });
  });
}

async function loadWaitlistStats() {
  if (!waitlistBlocks.length) return;

  try {
    const response = await fetch("/api/waitlist-stats");
    if (!response.ok) throw new Error("stats unavailable");
    const stats = await response.json();
    updateWaitlistStats(stats);
  } catch {
    const localCount = Number(storageGet("localStorage", "maniWaitlistCount") || 0);
    updateWaitlistStats({ registered: waitlistStats.registered + localCount });
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setFieldError(form, field, message = "") {
  const error = form.querySelector(`[data-field-error="${field}"]`);
  if (error) error.textContent = message;
  const inputName = field === "phone" ? "phoneDisplay" : field === "consent" ? "pdnConsent" : field;
  const input = form.elements[inputName];
  if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
}

function invitePhrase(value) {
  const mod100 = value % 100;
  const mod10 = value % 10;
  if (mod100 >= 11 && mod100 <= 14) return `${value} приглашённых друзей`;
  if (mod10 === 1) return `${value} приглашённый друг`;
  if (mod10 >= 2 && mod10 <= 4) return `${value} приглашённых друга`;
  return `${value} приглашённых друзей`;
}

function getQueueStatusPresentation(status, priorityPosition) {
  const statuses = {
    "mani inner circle": {
      label: "Ядро mani",
      description: "Самая ранняя сотня. Ты уже максимально близко к продукту.",
    },
    "Closed beta wave": {
      label: "Закрытая волна",
      description: "Ты поднялся выше стартовой очереди и вошёл в закрытую волну.",
    },
    "Early crew": {
      label: "Ранний экипаж",
      description: "Ты среди первых 500 и можешь быстро подняться приглашениями.",
    },
    "Ahead of hype": {
      label: "В деле до хайпа",
      description: "Ты пришёл раньше большинства и сохранил бесплатный доступ.",
    },
    "On time": {
      label: "Успел вовремя",
      description: "Место твоё. Несколько приглашений заметно укрепят позицию.",
    },
    "Final boarding": {
      label: "Финальная посадка",
      description: "Ты внутри первой 1000, но до закрытия набора уже близко.",
    },
    "Waiting list": {
      label: "Лист ожидания",
      description: "Основная тысяча заполнена, но приглашения всё ещё улучшают приоритет.",
    },
    "Founding users": {
      label: "Ядро mani",
      description: "Самая ранняя сотня. Ты уже максимально близко к продукту.",
    },
    "Last free access": {
      label: "Финальная посадка",
      description: "Ты внутри первой 1000, но до закрытия набора уже близко.",
    },
  };
  const milestones = [
    { above: 900, target: 900, label: "Успел вовремя" },
    { above: 750, target: 750, label: "В деле до хайпа" },
    { above: 500, target: 500, label: "Ранний экипаж" },
    { above: 305, target: 305, label: "Закрытая волна" },
    { above: 100, target: 100, label: "Ядро mani" },
  ];
  const presentation = statuses[status] || {
    label: "Ранний доступ",
    description: "Место закреплено. Приглашения помогают подняться выше.",
  };
  const next = milestones.find((milestone) => priorityPosition > milestone.above);
  if (!next) {
    return {
      ...presentation,
      motivation: "Ты уже в ядре mani. Выше только знакомство с командой.",
    };
  }
  const needed = priorityPosition - next.target;
  return {
    ...presentation,
    motivation: `Осталось ${invitePhrase(needed)}, чтобы получить статус «${next.label}».`,
  };
}

function renderWaitlistSuccess(success, data) {
  if (!success) return;
  const dialog = success.closest(".nm-dialog");
  const position = Math.max(1, Number(data.position) || 1);
  const priorityPosition = Math.max(1, Number(data.priorityPosition) || position);
  const invitedCount = Math.max(0, Number(data.invitedCount) || 0);
  const placesLeft = Math.max(0, Number(data.stats?.left) || 0);
  const referralCode = /^[A-Z0-9-]{6,64}$/.test(String(data.referralCode || ""))
    ? String(data.referralCode)
    : `MANI-${String(position).padStart(4, "0")}`;
  const referralUrl = `${window.location.origin}/start?ref=${encodeURIComponent(referralCode)}`;
  const queueStatus = getQueueStatusPresentation(data.status, priorityPosition);
  const identity = { position, priorityPosition, invitedCount, referralCode, status: data.status || "" };
  storageSet("localStorage", waitlistIdentityKey, JSON.stringify(identity));
  storageSet("localStorage", "maniReferralCode", referralCode);

  success.hidden = false;
  success.innerHTML = `
    <div class="waitlist-success-head"><span>${data.duplicate ? "Место уже закреплено" : "Заявка принята"}</span><strong id="waitlist-success-title">Ты в очереди под номером №${position}</strong></div>
    <p class="waitlist-success-lead">${escapeHtml(queueStatus.motivation)}</p>
    <div class="waitlist-success-grid">
      <div><small>Номер в очереди</small><b>№${position}</b></div>
      <div><small>Приглашено</small><b>${invitedCount}</b></div>
      <div><small>Приоритет</small><b>№${priorityPosition}</b></div>
      <div><small>Осталось мест</small><b>${placesLeft.toLocaleString("ru-RU")}</b></div>
      <div class="waitlist-status-card"><small>Твой статус</small><b>${escapeHtml(queueStatus.label)}</b><em>${escapeHtml(queueStatus.description)}</em></div>
    </div>
    <div class="waitlist-referral"><span>Твоя ссылка</span><code>${escapeHtml(referralUrl)}</code></div>
    <div class="waitlist-share-actions">
      <button type="button" data-referral-copy data-referral-url="${escapeHtml(referralUrl)}">Скопировать ссылку</button>
      <a href="https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent("Занимай место в раннем доступе mani вместе со мной")}" target="_blank" rel="noopener noreferrer" data-referral-telegram>Telegram</a>
      <button type="button" data-referral-share data-referral-url="${escapeHtml(referralUrl)}">Поделиться</button>
      <button type="button" data-referral-card data-referral-url="${escapeHtml(referralUrl)}" data-referral-position="${position}">Скачать карточку</button>
    </div>
    <p class="waitlist-success-note">Каждая уникальная заявка по твоей ссылке поднимает тебя на одно место. Повторные и собственные заявки не засчитываются.</p>
  `;
  if (dialog) {
    dialog.classList.add("is-success");
    dialog.setAttribute("aria-labelledby", "waitlist-success-title");
    dialog.scrollTop = 0;
  }
  trackEvent("referral_link_created", { ref_present: true });
}

async function submitWaitlist(form) {
  if (form.dataset.submitting === "true") return;
  const result = form.querySelector("[data-waitlist-result]");
  const dialog = form.closest(".nm-dialog");
  const success = dialog?.querySelector("[data-waitlist-success]");
  const button = form.querySelector("button[type='submit']");
  const formData = new FormData(form);
  const phonePayload = getPhonePayload(form);
  const email = String(formData.get("email") || "").trim();
  const firstTouch = readStoredJson(attributionFirstKey) || {};
  const lastTouch = readStoredJson(attributionLastKey) || {};
  const idempotencyKey = crypto.randomUUID?.() || `w-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  const payload = {
    phone: phonePayload.valid ? phonePayload.normalized : "",
    email,
    contact: "manual",
    contactDetails: String(formData.get("contactDetails") || "").trim(),
    website: String(formData.get("website") || "").trim(),
    pdnConsent: formData.get("pdnConsent") === "yes",
    pdnConsentVersion,
    pdnConsentAt: new Date().toISOString(),
    ref: storageGet("localStorage", referralSourceKey) || referralSourceMemory,
    page: window.location.pathname,
    idempotencyKey,
    heroHeadlineVariant: document.documentElement.dataset.heroHeadlineVariant || "",
    ctaLocation: document.querySelector("#waitlist-dialog")?.dataset.ctaLocation || "unknown",
    firstTouch,
    lastTouch,
  };
  setFieldError(form, "phone");
  setFieldError(form, "email");
  setFieldError(form, "consent");
  let valid = true;
  if (!payload.phone) {
    setFieldError(form, "phone", "Укажи корректный номер, чтобы закрепить место.");
    valid = false;
    trackEvent("form_error", { field: "phone", error_type: "invalid_phone" });
  }
  if (email && !form.elements.email.checkValidity()) {
    setFieldError(form, "email", "Проверь формат email.");
    valid = false;
    trackEvent("form_error", { field: "email", error_type: "invalid_email" });
  }
  if (!payload.pdnConsent) {
    setFieldError(form, "consent", "Нужно согласие на обработку данных.");
    valid = false;
    trackEvent("form_error", { field: "consent", error_type: "missing_pdn_consent" });
  }
  if (!valid) {
    result.textContent = "Проверь отмеченные поля.";
    return;
  }

  form.dataset.submitting = "true";
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  result.textContent = "Закрепляем место...";
  if (success) {
    success.hidden = true;
    success.innerHTML = "";
  }
  trackEvent("waitlist_submit", { cta_location: "waitlist_dialog", ref_present: Boolean(payload.ref) });

  let responseStatus = 0;
  try {
    const response = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(payload),
    });
    responseStatus = response.status;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const requestError = new Error(data.message || `HTTP ${response.status}`);
      requestError.status = response.status;
      requestError.code = String(data.code || "");
      throw requestError;
    }
    waitlistStatsUnlocked = false;
    updateWaitlistStats(data.stats);
    result.textContent = data.duplicate
      ? `Ты уже в очереди под номером №${data.position}.`
      : `Готово. Ты в очереди под номером №${data.position}.`;
    renderWaitlistSuccess(success, data);
    form.reset();
    getPhonePayload(form);
    requestAnimationFrame(() => success?.focus({ preventScroll: true }));
    trackEvent("waitlist_success", { duplicate: Boolean(data.duplicate), ref_present: Boolean(data.referredByAccepted) });
    trackWaitlistConversion(payload.ctaLocation);
    if (!data.duplicate && data.referredByAccepted) trackEvent("referral_signup", { ref_present: true });
  } catch (error) {
    const safeCode = /^[a-z0-9_]{1,64}$/.test(String(error?.code || "")) ? String(error.code) : "";
    trackEvent("api_error", {
      error_type: safeCode || (responseStatus ? "waitlist_http_error" : "waitlist_network_error"),
      status_code: responseStatus,
    });
    const errorMessages = {
      invalid_phone_or_email: "Проверь номер телефона и email. Одно из полей заполнено некорректно.",
      missing_pdn_consent: "Подтверди согласие на обработку персональных данных.",
      rate_limited: "Слишком много попыток подряд. Подожди минуту и попробуй снова.",
      bot_field_filled: "Браузер заполнил служебное поле. Обнови страницу и повтори отправку.",
      invalid_client_state: "Страница устарела. Обнови её и повтори отправку.",
      waitlist_unavailable: "Форма временно недоступна. Попробуй ещё раз через несколько минут.",
    };
    result.textContent = errorMessages[safeCode]
      || (responseStatus >= 400 ? "Не удалось проверить данные формы. Обнови страницу и попробуй ещё раз." : "Не удалось отправить заявку. Проверь соединение и попробуй ещё раз.");
    result.focus?.();
  } finally {
    form.dataset.submitting = "false";
    button.disabled = false;
    button.removeAttribute("aria-busy");
  }
}

function loadCanvasImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function drawRoundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  if (typeof context.roundRect === "function") {
    context.roundRect(x, y, width, height, radius);
  } else {
    const r = Math.min(radius, width / 2, height / 2);
    context.moveTo(x + r, y);
    context.lineTo(x + width - r, y);
    context.quadraticCurveTo(x + width, y, x + width, y + r);
    context.lineTo(x + width, y + height - r);
    context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    context.lineTo(x + r, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
    context.closePath();
  }
  context.fill();
}

function drawContainedImage(context, image, x, y, width, height) {
  const scale = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawWrappedText(context, text, x, y, maxWidth, lineHeight, maxLines = 4) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (context.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  lines.slice(0, maxLines).forEach((value, index) => context.fillText(value, x, y + index * lineHeight));
}

async function createManiCard({ type, mode = "jester", annualLoss = 0, position = 0, referralUrl = "" }) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 1080, 1350);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.55, "#f5f9ff");
  gradient.addColorStop(1, mode === "jester" ? "#fff0e7" : "#eaf8ff");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "rgba(255,255,255,.86)";
  context.shadowColor = "rgba(32,72,128,.12)";
  context.shadowBlur = 42;
  drawRoundedRect(context, 58, 58, 964, 1234, 58);
  context.shadowBlur = 0;

  const [logo, mascot] = await Promise.all([
    loadCanvasImage("assets/brand/mani-black.png"),
    loadCanvasImage(mode === "jester" ? "assets/newmani/interactive/jester.webp" : "assets/newmani/interactive/motivator.webp"),
  ]);
  drawContainedImage(context, logo, 105, 105, 300, 86);
  drawContainedImage(context, mascot, 575, 165, 390, 480);

  context.fillStyle = "#071632";
  context.font = "700 62px Manrope, Arial, sans-serif";
  if (type === "calculator") {
    drawWrappedText(context, "Столько денег может незаметно убегать за год", 110, 330, 500, 72, 4);
    context.fillStyle = "#ff5a00";
    context.font = "750 92px Manrope, Arial, sans-serif";
    context.fillText(`${new Intl.NumberFormat("ru-RU").format(annualLoss)} ₽`, 110, 735);
    context.fillStyle = "#5d6b86";
    context.font = "500 33px Manrope, Arial, sans-serif";
    context.fillText("Расчёт тест-драйва mani", 112, 795);
    context.fillStyle = "#071632";
    context.font = "700 46px Manrope, Arial, sans-serif";
    drawWrappedText(context, "А сколько убегает у тебя?", 110, 950, 760, 58, 2);
  } else {
    drawWrappedText(context, `Я в очереди mani под номером №${position}`, 110, 350, 520, 74, 4);
    context.fillStyle = "#ff5a00";
    context.font = "750 68px Manrope, Arial, sans-serif";
    context.fillText("Присоединяйся", 110, 790);
    context.fillStyle = "#5d6b86";
    context.font = "500 31px Manrope, Arial, sans-serif";
    drawWrappedText(context, "Первые пользователи помогают сделать финансового ИИ-помощника лучше.", 110, 855, 820, 47, 3);
  }

  context.fillStyle = "#ff5a00";
  drawRoundedRect(context, 105, 1080, 870, 112, 30);
  context.fillStyle = "#ffffff";
  context.font = "700 38px Manrope, Arial, sans-serif";
  context.textAlign = "center";
  context.fillText(type === "calculator" ? "Пройди тест-драйв на Moimani" : "Займи место на Moimani", 540, 1152);
  context.textAlign = "left";
  context.fillStyle = "#64728b";
  context.font = "500 24px Manrope, Arial, sans-serif";
  context.fillText(type === "calculator" ? "moimani.ai/#test-drive" : referralUrl.replace(/^https?:\/\//, ""), 110, 1250);
  return canvas;
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

async function downloadCanvasCard(canvas, filename) {
  const blob = await canvasToBlob(canvas);
  if (!blob) throw new Error("PNG creation failed");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function shareCanvasCard(canvas, filename, text, url) {
  const blob = await canvasToBlob(canvas);
  if (!blob) throw new Error("PNG creation failed");
  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "mani", text, url });
      return true;
    } catch (error) {
      if (error?.name === "AbortError") return null;
    }
  }
  await downloadCanvasCard(canvas, filename);
  return false;
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fall through to the selection-based copy path.
    }
  }
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  return copied;
}

function showCopyButtonFeedback(button, copied) {
  if (!button) return;
  const defaultLabel = button.dataset.defaultLabel || button.textContent.trim();
  button.dataset.defaultLabel = defaultLabel;
  button.textContent = copied ? "Ссылка скопирована" : "Не удалось скопировать";
  button.classList.toggle("is-copied", copied);
  button.classList.toggle("is-copy-error", !copied);
  button.setAttribute("aria-live", "polite");
  clearTimeout(button.copyFeedbackTimer);
  button.copyFeedbackTimer = setTimeout(() => {
    button.textContent = defaultLabel;
    button.classList.remove("is-copied", "is-copy-error");
    button.removeAttribute("aria-live");
  }, 2600);
}

async function restoreWaitlistIdentity() {
  const identity = readStoredJson(waitlistIdentityKey);
  if (!identity?.referralCode) return;
  try {
    const response = await fetch(`/api/waitlist?referralCode=${encodeURIComponent(identity.referralCode)}`);
    if (!response.ok) return;
    const data = await response.json();
    document.querySelectorAll("[data-waitlist-success]").forEach((success) => renderWaitlistSuccess(success, { ...data, duplicate: true }));
    document.querySelectorAll("[data-waitlist-result]").forEach((result) => {
      result.textContent = `Твоё место уже закреплено: №${data.position}.`;
    });
  } catch {
    // The form remains available if the status endpoint is temporarily unreachable.
  }
}

document.addEventListener("click", async (event) => {
  const copyButton = event.target.closest("[data-referral-copy]");
  if (copyButton) {
    const copied = await copyText(copyButton.dataset.referralUrl);
    showCopyButtonFeedback(copyButton, copied);
    if (copied) {
      showToast("Персональная ссылка скопирована");
      trackEvent("referral_share", { share_target: "clipboard" });
    } else {
      showToast("Не удалось скопировать. Выдели ссылку вручную.");
    }
    return;
  }
  const telegramLink = event.target.closest("[data-referral-telegram]");
  if (telegramLink) {
    trackEvent("referral_share", { share_target: "telegram" });
    return;
  }
  const shareButton = event.target.closest("[data-referral-share]");
  if (shareButton) {
    const url = shareButton.dataset.referralUrl;
    if (navigator.share) {
      try {
        await navigator.share({ title: "mani", text: "Занимай место в раннем доступе mani вместе со мной", url });
        trackEvent("referral_share", { share_target: "web_share" });
      } catch (error) {
        if (error?.name !== "AbortError" && await copyText(url)) {
          showToast("Системное меню недоступно. Ссылка скопирована.");
          trackEvent("referral_share", { share_target: "clipboard" });
        }
      }
    } else {
      if (await copyText(url)) {
        showToast("Ссылка скопирована");
        trackEvent("referral_share", { share_target: "clipboard" });
      } else {
        showToast("Не удалось скопировать. Выдели ссылку вручную.");
      }
    }
    return;
  }
  const cardButton = event.target.closest("[data-referral-card]");
  if (cardButton) {
    cardButton.disabled = true;
    try {
      const identity = readStoredJson(waitlistIdentityKey) || {};
      const canvas = await createManiCard({
        type: "referral",
        mode: "motivator",
        position: Number(cardButton.dataset.referralPosition),
        referralUrl: cardButton.dataset.referralUrl,
      });
      await downloadCanvasCard(canvas, `mani-queue-${identity.referralCode || "card"}.png`);
      trackEvent("referral_share", { share_target: "card_download" });
    } finally {
      cardButton.disabled = false;
    }
    return;
  }
  const storeLink = event.target.closest("[data-store]");
  if (storeLink) {
    const eventStore = storeLink.dataset.store === "apple" ? "appstore" : storeLink.dataset.store === "google" ? "googleplay" : "rustore";
    trackEvent(`store_click_${eventStore}`, { store: eventStore, cta_location: "product_status" });
  }
});

function openConfiguredLink(key, fallback) {
  if (links[key]) {
    window.open(links[key], "_blank", "noopener,noreferrer");
  } else {
    showToast(fallback);
  }
}

function setTone(requestedName, { track = true, persist = true } = {}) {
  const name = requestedName === "roaster" ? "fun" : requestedName;
  const tone = tones[name];
  if (!tone || !toneSection || !toneImage || !toneQuote) return;
  const isSameTone = currentTone === name;
  currentTone = name;
  toneSection.classList.toggle("mcs-motivator", name === "motivator");
  toneSection.classList.toggle("mcs-fun", name === "fun");
  toneSection.dataset.character = name;
  toneButtons.forEach((button) => {
    const isActive = button.dataset.tone === name;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  if (!toneImage.src.endsWith(tone.image)) {
    toneImage.src = tone.image;
  }
  toneImage.alt = tone.alt;
  if (!isSameTone) {
    toneImage.classList.remove("mcs-animate");
    void toneImage.offsetWidth;
    toneImage.classList.add("mcs-animate");
    if (track) trackEvent("tone_switch", { tone: name });
  }
  toneQuote.textContent = tone.quote;
  if (persist) storageSet("localStorage", characterPreferenceKey, name);
}

function setDemoScenario(name) {
  const scenario = demoScenarios[name];
  if (!scenario) return;

  document.querySelector("[data-demo-status]").textContent = scenario.status;
  document.querySelector("[data-demo-title]").textContent = scenario.title;
  document.querySelector("[data-demo-copy]").textContent = scenario.copy;
  document.querySelector("[data-demo-message-main]").textContent = scenario.main;
  document.querySelector("[data-demo-message-action]").textContent = scenario.action;
  document.querySelector("[data-demo-result-label]").textContent = scenario.label;
  document.querySelector("[data-demo-result-value]").textContent = scenario.value;
  document.querySelector("[data-demo-signals]").innerHTML = scenario.signals.map((signal) => `<span>${signal}</span>`).join("");

  demoTabs.forEach((button) => {
    const isActive = button.dataset.demoTab === name;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  if (demoPhone) {
    demoPhone.classList.remove("is-changing");
    void demoPhone.offsetWidth;
    demoPhone.classList.add("is-changing");
    setTimeout(() => demoPhone.classList.remove("is-changing"), 240);
  }

  trackEvent("demo_scenario_click", { scenario: name });
}

function updateLeakCalculator() {
  if (!calcSubscriptions || !calcPrice || !calcLeaks || !calcLeakPrice) return;

  const subscriptions = Number(calcSubscriptions.value) || 0;
  const price = Number(calcPrice.value) || 0;
  const leaks = Number(calcLeaks.value) || 0;
  const leakPrice = Number(calcLeakPrice.value) || 0;
  const subscriptionYearly = subscriptions * price * 12;
  const smallLeaksYearly = leaks * leakPrice * 52;
  const yearly = subscriptionYearly + smallLeaksYearly;

  document.querySelector("[data-calc-subscriptions-value]").textContent = subscriptions.toLocaleString("ru-RU");
  document.querySelector("[data-calc-price-value]").textContent = price.toLocaleString("ru-RU");
  document.querySelector("[data-calc-leaks-value]").textContent = leaks.toLocaleString("ru-RU");
  document.querySelector("[data-calc-leak-price-value]").textContent = leakPrice.toLocaleString("ru-RU");
  document.querySelector("[data-calc-total]").textContent = `${yearly.toLocaleString("ru-RU")} ₽ в год`;

  const note = document.querySelector("[data-calc-note]");
  if (note) {
    if (subscriptions === 0 && leaks === 0) {
      note.textContent = "Если нет ни подписок, ни лишних мелких трат, расчет честно показывает 0. mani всё равно полезен для контроля темпа и предупреждений.";
    } else if (subscriptions === 0) {
      note.textContent = `Подписок нет, считаем только мелкие утечки: ${smallLeaksYearly.toLocaleString("ru-RU")} ₽ в год.`;
    } else if (leaks === 0) {
      note.textContent = `Мелких утечек нет, считаем только регулярные платежи: ${subscriptionYearly.toLocaleString("ru-RU")} ₽ в год.`;
    } else {
      note.textContent = `Регулярные платежи: ${subscriptionYearly.toLocaleString("ru-RU")} ₽/год. Мелкие утечки: ${smallLeaksYearly.toLocaleString("ru-RU")} ₽/год.`;
    }
  }
}

toneButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setTone(button.dataset.tone);
  });
});

demoTabs.forEach((button) => {
  button.addEventListener("click", () => setDemoScenario(button.dataset.demoTab));
});

[calcSubscriptions, calcPrice, calcLeaks, calcLeakPrice].forEach((input) => {
  if (!input) return;
  input.addEventListener("input", () => {
    updateLeakCalculator();
    const field = input.dataset.calcSubscriptions !== undefined
      ? "subscriptions"
      : input.dataset.calcPrice !== undefined
        ? "subscription_price"
        : input.dataset.calcLeakPrice !== undefined
          ? "small_leak_price"
          : "small_leaks";
    trackEvent("leak_calculator_change", { field });
  });
});

updateLeakCalculator();

if (roadmapGrid && window.matchMedia("(min-width: 701px)").matches) {
  [...roadmapGrid.querySelectorAll(":scope > img")].forEach((image, index) => {
    const item = roadmapItems[index];
    if (!item) return;
    const card = document.createElement("article");
    card.className = "roadmap-card";
    const content = document.createElement("div");
    content.innerHTML = `<small>${item.kicker}</small><h3>${item.title}</h3><p>${item.text}</p>`;
    image.alt = item.title;
    roadmapGrid.insertBefore(card, image);
    card.append(image, content);
  });
}

document.querySelectorAll("[data-download]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const target = link.dataset.download;
    const label = target === "apple" ? "App Store" : "Google Play";
    trackEvent(`store_click_${target === "apple" ? "appstore" : "googleplay"}`, {
      store: target,
      cta_location: link.closest(".hero") ? "hero" : link.closest(".cta") ? "cta" : link.closest(".reasons") ? "reasons" : "header_or_menu",
    });
    openConfiguredLink(target, `Ссылка на ${label} пока не задана. Подставим реальный URL скачивания.`);
  });
});

document.querySelectorAll("[data-early-access]").forEach((link) => {
  link.addEventListener("click", () => {
    trackEvent("cta_click", {
      cta_location: link.dataset.earlyAccess,
      cta_variant: productStatus,
    });
  });
});

waitlistForms.forEach((form) => {
  let formStarted = false;
  form.addEventListener("invalid", (event) => {
    const name = event.target?.name || "";
    const field = name === "phoneDisplay" ? "phone" : name === "pdnConsent" ? "consent" : name;
    const errorType = field === "phone"
      ? "invalid_phone"
      : field === "email"
        ? "invalid_email"
        : field === "consent"
          ? "missing_pdn_consent"
          : "invalid_field";
    trackEvent("form_error", { field, error_type: errorType });
  }, true);
  form.addEventListener("input", () => {
    if (formStarted) return;
    formStarted = true;
    trackEvent("waitlist_form_start", { cta_location: "waitlist_dialog" });
  });
  form.querySelectorAll("[data-phone-field]").forEach((field) => {
    const select = field.querySelector("select[name='phoneCountry']");
    const display = field.querySelector("input[name='phoneDisplay']");
    if (display) {
      display.addEventListener("input", () => formatPhoneField(field));
      display.addEventListener("blur", () => getPhonePayload(form));
      display.addEventListener("focus", () => trackEvent("waitlist_phone_focus", { cta_location: "waitlist_dialog" }));
    }
    if (select) {
      select.addEventListener("change", () => {
        if (display) display.value = formatPhoneNational(getNationalDigits(display.value, getPhoneCountry(select)), getPhoneCountry(select));
        getPhonePayload(form);
      });
    }
    getPhonePayload(form);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitWaitlist(form);
  });
});

initProductStatus();
initHeroHeadlineExperiment();
initHeroCopyExperiment();

document.querySelectorAll("[data-social]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    trackEvent("social_click", { network: link.dataset.social });
    openConfiguredLink(link.dataset.social, "Ссылка на соцсеть пока не задана.");
  });
});

document.querySelectorAll("a[href^='#']").forEach((link) => {
  link.addEventListener("click", () => {
    const href = link.getAttribute("href");
    if (!href || href === "#") return;
    trackEvent("navigation_click", { target: href });
  });
});

document.querySelectorAll(".security-accordion details").forEach((item) => {
  item.addEventListener("toggle", () => {
    if (!item.open) return;
    trackEvent("security_detail_open", { title: item.querySelector("summary")?.textContent?.trim() || "" });
  });
});

if ("IntersectionObserver" in window) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id || entry.target.dataset.analyticsSection;
        if (!id || viewedSections.has(id)) return;
        viewedSections.add(id);
        trackEvent("section_view", { section: id });
      });
    },
    { threshold: 0.45 }
  );

  [
    document.querySelector(".hero"),
    document.querySelector("#about"),
    document.querySelector("#features"),
    document.querySelector("#tone"),
    document.querySelector(".reasons"),
    document.querySelector(".widgets"),
    document.querySelector("#future"),
    document.querySelector("#security"),
    document.querySelector(".cta"),
    document.querySelector("#demo"),
    document.querySelector("#leak-calc"),
  ].forEach((section) => {
    if (!section) return;
    if (!section.id && !section.dataset.analyticsSection) {
      section.dataset.analyticsSection = section.classList.contains("cta")
        ? "cta"
        : section.classList.contains("reasons")
          ? "reasons"
          : section.classList.contains("widgets")
            ? "widgets"
            : "hero";
    }
    sectionObserver.observe(section);
  });

  if (stickyCta) {
    const stickyBlockers = new Set();
    const stickyObserver = new IntersectionObserver(
      (entries) => {
        const cookieIsVisible = cookieBanner && !cookieBanner.hidden;
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            stickyBlockers.add(entry.target);
          } else {
            stickyBlockers.delete(entry.target);
          }
        });
        const shouldHide = cookieIsVisible || stickyBlockers.size > 0;
        stickyCta.hidden = shouldHide;
      },
      { threshold: 0.01 }
    );

    waitlistForms.forEach((form) => stickyObserver.observe(form));
    [document.querySelector(".nm-hero"), document.querySelector("#features"), document.querySelector("#early-access"), document.querySelector("#demo"), document.querySelector("#leak-calc"), document.querySelector("#security")].forEach((section) => {
      if (section) stickyObserver.observe(section);
    });
  }
}

const initialTone = new URLSearchParams(window.location.search).get("tone");
const savedTone = storageGet("localStorage", characterPreferenceKey);
setTone(initialTone || savedTone || "motivator", { track: false, persist: false });

const referralSource = new URLSearchParams(window.location.search).get("ref");
if (referralSource) {
  referralSourceMemory = referralSource.slice(0, 64);
  const ownIdentity = readStoredJson(waitlistIdentityKey);
  if (!ownIdentity?.referralCode || ownIdentity.referralCode !== referralSource) {
    storageSet("localStorage", referralSourceKey, referralSourceMemory);
    trackEvent("referral_visit", { ref_present: true });
  }
}

if (cookieAcceptButton) {
  cookieAcceptButton.addEventListener("click", () => setCookieConsent("acknowledged"));
}

loadYandexMetrica();
loadAnalytics();
initCookieConsent();
loadWaitlistStats();
restoreWaitlistIdentity();

if (menuButton && mobileMenu) {
  menuButton.addEventListener("click", () => {
    const isOpen = document.body.classList.toggle("menu-open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
    mobileMenu.setAttribute("aria-hidden", String(!isOpen));
  });

  mobileMenu.querySelectorAll("a[href^='#']").forEach((link) => {
    link.addEventListener("click", () => {
      document.body.classList.remove("menu-open");
      menuButton.setAttribute("aria-expanded", "false");
      mobileMenu.setAttribute("aria-hidden", "true");
    });
  });
}

const waitlistDialog = document.querySelector("#waitlist-dialog");

if (waitlistDialog) {
  document.querySelectorAll("[data-open-waitlist]").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      document.body.classList.remove("menu-open");
      menuButton?.setAttribute("aria-expanded", "false");
      mobileMenu?.setAttribute("aria-hidden", "true");
      if (!waitlistDialog.open) waitlistDialog.showModal();
      waitlistDialog.dataset.ctaLocation = trigger.dataset.earlyAccess || "unknown";
      requestAnimationFrame(() => {
        if (waitlistDialog.classList.contains("is-success")) {
          waitlistDialog.querySelector("[data-waitlist-success]")?.focus({ preventScroll: true });
        } else {
          waitlistDialog.querySelector("input[name='phoneDisplay']")?.focus();
        }
      });
      trackEvent("waitlist_form_open", { cta_location: trigger.dataset.earlyAccess || "unknown" });
    });
  });

  waitlistDialog.querySelectorAll("[data-close-waitlist]").forEach((button) => {
    button.addEventListener("click", () => waitlistDialog.close());
  });

  waitlistDialog.addEventListener("click", (event) => {
    if (event.target !== waitlistDialog) return;
    const rect = waitlistDialog.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right
      && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) waitlistDialog.close();
  });
}

const contactDialog = document.querySelector("#contact-dialog");
const contactDialogSlot = document.querySelector("[data-contact-dialog-slot]");

if (contactDialog && contactDialogSlot && contactForm) {
  const contactFormHome = contactForm.parentElement;
  const contactFormNextSibling = contactForm.nextElementSibling;
  const contactMobileQuery = window.matchMedia("(max-width: 700px)");

  const closeContactDialog = () => {
    if (contactDialog.open) contactDialog.close();
  };

  const syncContactFormPlacement = () => {
    if (contactMobileQuery.matches) {
      if (contactForm.parentElement !== contactDialogSlot) contactDialogSlot.append(contactForm);
      return;
    }

    closeContactDialog();
    if (contactForm.parentElement === contactFormHome) return;
    contactFormHome.insertBefore(contactForm, contactFormNextSibling);
  };

  document.querySelectorAll("[data-open-contact]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      syncContactFormPlacement();
      if (!contactDialog.open) contactDialog.showModal();
      requestAnimationFrame(() => contactForm.elements.name?.focus());
      trackEvent("contact_form_open", { cta_location: "mobile_contact" });
    });
  });

  contactDialog.querySelectorAll("[data-close-contact]").forEach((button) => {
    button.addEventListener("click", closeContactDialog);
  });

  contactDialog.addEventListener("click", (event) => {
    if (event.target !== contactDialog) return;
    const rect = contactDialog.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right
      && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) closeContactDialog();
  });

  syncContactFormPlacement();
  if (contactMobileQuery.addEventListener) {
    contactMobileQuery.addEventListener("change", syncContactFormPlacement);
  } else {
    contactMobileQuery.addListener(syncContactFormPlacement);
  }
}

const revealItems = document.querySelectorAll("[data-reveal]");

if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8%", threshold: 0.08 }
  );
  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}
