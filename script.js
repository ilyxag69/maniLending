const toast = document.querySelector("[data-toast]");
const menuButton = document.querySelector(".menu");
const mobileMenu = document.querySelector(".mobile-menu-panel");
const toneSection = document.querySelector(".tone");
const toneSwitch = document.querySelector(".tone-switch");
const toneButtons = document.querySelectorAll("[data-tone]");
const toneImage = document.querySelector("[data-tone-image]");
const toneNote = document.querySelector("[data-tone-note]");
const toneMessages = document.querySelector("[data-tone-messages]");
const roadmapGrid = document.querySelector(".roadmap-grid");
const waitlistBlocks = document.querySelectorAll("[data-waitlist]");
const waitlistForms = document.querySelectorAll("[data-waitlist-form]");
const cookieBanner = document.querySelector("[data-cookie-banner]");
const cookieAcceptButton = document.querySelector("[data-cookie-accept]");
const cookieRejectButton = document.querySelector("[data-cookie-reject]");
const demoTabs = document.querySelectorAll("[data-demo-tab]");
const demoPhone = document.querySelector(".demo-phone");
const stickyCta = document.querySelector(".mobile-sticky-cta");
const calcSubscriptions = document.querySelector("[data-calc-subscriptions]");
const calcPrice = document.querySelector("[data-calc-price]");
const calcLeaks = document.querySelector("[data-calc-leaks]");
const calcLeakPrice = document.querySelector("[data-calc-leak-price]");
const cookieConsentKey = "maniCookieConsent";
const pdnConsentVersion = "waitlist-pdn-2026-06-08";
const googleAnalyticsId = "G-P6TDY2N5FK";
const yandexMetricaId = 103776176;
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
let toneAnimationTimer;
let currentTone = "motivator";
const viewedSections = new Set();
let waitlistStats = {
  total: 1000,
  registered: 0,
  left: 1000,
  percent: 0,
};
let waitlistStatsUnlocked = false;

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
  apple: "",
  google: "",
  youtube: "https://www.youtube.com/@Mani.ai_app",
  instagram: "https://www.instagram.com/moimani.ai?igsh=MW9tM2plM2UwZnZoNw%3D%3D&utm_source=qr",
  telegram: "https://t.me/moi_mani_ai",
  vkvideo: "https://vkvideo.ru/@club240056458",
  dzen: "https://dzen.ru/user/k88jy5w3kcoxjabefs8g_u6d1ve?share_to=link",
  x: "",
};

const tones = {
  motivator: {
    image: "assets/mani-motivator.png",
    note: "Поддержит, разложит всё по шагам и поможет не паниковать, даже когда бюджет трещит.",
    messages: ["Я рядом.<br />Мы разберёмся.", "Ты справишься.<br />Давай по шагам.", "Сначала найдем утечку.<br />Потом вернем контроль."],
  },
  roaster: {
    image: "assets/mani-prozharschik.png",
    note: "Скажет прямо, с юмором и без паники: где бюджет течет, где подписка притворяется нужной, а где пора прикрутить траты.",
    messages: [
      "Бюджет не резиновый.<br />Он уже сидит в углу и шепчет: «Спроси у него, он чё, ах.ел?»",
      "Третья доставка за неделю?<br />Ты что, ресторанную франшизу спонсируешь? Как я тебе с такой тратой бюджет выровняю, волшебной палкой?",
      "Подписка опять списалась.<br />Пойдём смотреть, что это за паразит: полезный сервис или очередная месячная крыса на автоплатеже.",
    ],
  },
};

const roadmapItems = [
  {
    kicker: "Скоро в Mani.ai",
    title: "Беспроцентный период по кредиткам",
    text: "Mani покажет даты и суммы беспроцентного периода. Не даст банкам нажиться на тебе.",
  },
  {
    kicker: "Скоро в Mani.ai",
    title: "Цели и челленджи",
    text: "Достигайте цели с игровой механикой. Mani поможет копить и поощрит за успехи.",
  },
  {
    kicker: "Скоро в Mani.ai",
    title: "Сколько стоит моя жизнь",
    text: "Квартиры, машины, инвестиции, крипта. Mani покажет реальную картину ваших активов и пассивов.",
  },
  {
    kicker: "Скоро в Mani.ai",
    title: "Детальные расходы по чекам",
    text: "Навели камеру на чек - Mani сам добавит сумму, категорию и магазин. Без ручного ввода.",
  },
];

const demoScenarios = {
  subscriptions: {
    status: "видит повтор 649 ₽",
    signals: ["649 ₽ каждый месяц", "13-е число", "Категория: сервис"],
    title: "Mani показывает повторяющиеся списания",
    copy: "Он не знает, пользуешься ты сервисом или нет. Зато видит регулярный платеж, сумму, дату и помогает быстро решить: оставить или отключить.",
    main: "Вижу регулярное списание 649 ₽. Это похоже на подписку или сервисный платеж.",
    action: "Проверить, нужен ли этот платеж. Если нет — отключение сэкономит до 7 788 ₽ в год.",
    label: "Потенциально лишний расход",
    value: "7 788 ₽/год",
  },
  leaks: {
    status: "увидел лишний темп",
    signals: ["+42% к обычному темпу", "7 мелких покупок", "2 дня до лимита"],
    title: "Mani замечает темп, а не следит за человеком",
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
    copy: "Mani переводит хаос по картам в простые действия: сколько можно тратить и где стоит притормозить.",
    main: "До зарплаты 9 дней. В безопасном темпе можно тратить 1 850 ₽ в день.",
    action: "Разложить лимиты по категориям и предупредить, если день пошёл не по плану.",
    label: "Безопасный лимит",
    value: "1 850 ₽/день",
  },
};

Object.values(tones).forEach((tone) => {
  const image = new Image();
  image.src = tone.image;
});

function loadAnalytics() {
  if (window.maniAnalyticsLoaded) return;
  window.maniAnalyticsLoaded = true;

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

function setCookieConsent(value) {
  localStorage.setItem(cookieConsentKey, value);
  if (cookieBanner) cookieBanner.hidden = true;
  if (stickyCta) stickyCta.hidden = false;
  if (value === "accepted") loadAnalytics();
  trackEvent("cookie_consent", { value });
}

function initCookieConsent() {
  const consent = localStorage.getItem(cookieConsentKey);
  if (consent === "accepted") {
    loadAnalytics();
    return;
  }
  if (consent === "necessary") return;
  if (cookieBanner) cookieBanner.hidden = false;
  if (stickyCta) stickyCta.hidden = true;
}

function trackEvent(name, params = {}) {
  const payload = {
    page_path: window.location.pathname,
    ...params,
  };

  if (typeof window.gtag === "function") {
    window.gtag("event", name, payload);
  }

  if (typeof window.ym === "function") {
    window.ym(yandexMetricaId, "reachGoal", name, payload);
  }
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
      ? "Можно ввести 9013696977 — подставим +7 сами. Telegram укажи в комментарии, если так удобнее."
      : valid
      ? `Сохраним как ${normalized}.`
      : `Введи номер для ${selectedCountry.code}: ${Array.isArray(selectedCountry.length) ? "8-15 цифр" : `${selectedCountry.length} цифр`} без кода страны.`;
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
          : `${waitlistStats.registered.toLocaleString("ru-RU")} человек уже ждут запуск Mani.ai.`)
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
    const localCount = Number(localStorage.getItem("maniWaitlistCount") || 0);
    updateWaitlistStats({ registered: waitlistStats.registered + localCount });
  }
}

async function submitWaitlist(form) {
  const result = form.querySelector("[data-waitlist-result]");
  const success = form.querySelector("[data-waitlist-success]");
  const button = form.querySelector("button");
  const formData = new FormData(form);
  const urlParams = new URLSearchParams(window.location.search);
  const phonePayload = getPhonePayload(form);
  const payload = {
    phone: phonePayload.valid ? phonePayload.normalized : "",
    email: String(formData.get("email") || "").trim(),
    contact: "manual",
    contactDetails: String(formData.get("contactDetails") || "").trim(),
    company: String(formData.get("company") || "").trim(),
    pdnConsent: formData.get("pdnConsent") === "yes",
    pdnConsentVersion,
    pdnConsentAt: new Date().toISOString(),
    ref: urlParams.get("ref") || localStorage.getItem("maniReferralSource") || "",
    page: window.location.pathname,
  };
  if (!payload.phone) {
    result.textContent = "Укажи корректный телефон, чтобы закрепить место.";
    trackEvent("waitlist_phone_error", { source: payload.page });
    return;
  }
  if (!payload.pdnConsent) {
    result.textContent = "Поставь галочку согласия на обработку данных. Без нее мы не можем принять заявку.";
    return;
  }

  button.disabled = true;
  result.textContent = "Бронируем место...";
  if (success) {
    success.hidden = true;
    success.innerHTML = "";
  }

  try {
    const response = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "request failed");
    waitlistStatsUnlocked = false;
    updateWaitlistStats(data.stats);
    const referralCode = data.referralCode || `MANI-${String(data.position).padStart(4, "0")}`;
    const referralUrl = `${window.location.origin}${window.location.pathname}?ref=${encodeURIComponent(referralCode)}`;
    const statusLabels = {
      "Founding users": "Основатели Mani",
      "Early crew": "Ранняя команда",
      "Last free access": "Последний бесплатный доступ",
    };
    const queueStatus = statusLabels[data.status] || "Ранний доступ";
    const placesLeft = Number(data.stats?.left);
    result.textContent = data.duplicate
      ? `Ты уже в очереди. Твое место: #${data.position}.`
      : `Готово. Твое место в очереди: #${data.position}.`;
    if (success) {
      success.hidden = false;
      success.innerHTML = `
        <div class="waitlist-success-head"><span>Заявка принята</span><strong>Ты в очереди Mani</strong></div>
        <div class="waitlist-success-grid">
          <div><small>Твоё место</small><b>#${data.position}</b></div>
          <div><small>Статус</small><b>${queueStatus}</b></div>
          ${Number.isFinite(placesLeft) ? `<div><small>Свободно после тебя</small><b>${placesLeft.toLocaleString("ru-RU")}</b></div>` : ""}
        </div>
        <div class="waitlist-referral"><span>Код приглашения</span><code>${referralCode}</code></div>
        <p class="waitlist-success-note">Сохрани код. По нему мы узнаем тебя и позже подключим бонусы за приглашения.</p>
        <a class="waitlist-share" href="${referralUrl}">Твоя персональная ссылка</a>
      `;
    }
    localStorage.setItem("maniReferralCode", referralCode);
    form.reset();
    trackEvent("waitlist_submit", { position: data.position, source: payload.page, duplicate: Boolean(data.duplicate) });
  } catch {
    const localCount = Number(localStorage.getItem("maniWaitlistCount") || 0) + 1;
    localStorage.setItem("maniWaitlistCount", String(localCount));
    waitlistStatsUnlocked = false;
    updateWaitlistStats({ registered: localCount });
    const referralCode = `MANI-${String(localCount).padStart(4, "0")}`;
    result.textContent = `Локально сохранено в браузере. Место в демо-очереди: #${localCount}.`;
    if (success) {
      success.hidden = false;
      success.innerHTML = `
        <div class="waitlist-success-head"><span>Локальная проверка</span><strong>Демо-заявка принята</strong></div>
        <div class="waitlist-success-grid"><div><small>Демо-место</small><b>#${localCount}</b></div><div><small>Код</small><b>${referralCode}</b></div></div>
        <p class="waitlist-success-note">На продакшене место выдаёт существующая база заявок на сервере.</p>
      `;
    }
    form.reset();
    trackEvent("waitlist_submit_local", { source: payload.page });
  } finally {
    button.disabled = false;
  }
}

function openConfiguredLink(key, fallback) {
  if (links[key]) {
    window.open(links[key], "_blank", "noopener,noreferrer");
  } else {
    showToast(fallback);
  }
}

function setTone(name) {
  const tone = tones[name];
  if (!tone || !toneSection || !toneImage || !toneNote || !toneMessages) return;
  const isSameTone = currentTone === name;
  currentTone = name;
  toneSection.classList.toggle("roaster", name === "roaster");
  toneButtons.forEach((button) => button.classList.toggle("active", button.dataset.tone === name));
  clearTimeout(toneAnimationTimer);
  if (!toneImage.src.endsWith(tone.image)) {
    toneImage.src = tone.image;
  }
  if (!isSameTone) {
    toneImage.classList.remove("is-changing");
    void toneImage.offsetWidth;
    toneImage.classList.add("is-changing");
    toneAnimationTimer = setTimeout(() => toneImage.classList.remove("is-changing"), 180);
    trackEvent("tone_switch", { tone: name });
  }
  toneNote.textContent = tone.note;
  toneMessages.querySelectorAll(".message-card b").forEach((node, index) => {
    node.innerHTML = tone.messages[index] || "";
  });
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
      note.textContent = "Если нет ни подписок, ни лишних мелких трат, расчет честно показывает 0. Mani всё равно полезен для контроля темпа и предупреждений.";
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
  button.addEventListener("click", (event) => {
    const isDesktopSwitchLabel = button.closest(".tone-switch") && window.matchMedia("(min-width: 701px)").matches;
    if (isDesktopSwitchLabel) {
      event.preventDefault();
      event.stopPropagation();
      setTone(button.dataset.tone);
      return;
    }
    setTone(button.dataset.tone);
  });
});

if (toneSwitch) {
  toneSwitch.addEventListener("click", (event) => {
    const rect = toneSwitch.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const isDesktopSwitch = window.matchMedia("(min-width: 701px)").matches;

    if (!isDesktopSwitch) return;

    const switchStart = parseFloat(getComputedStyle(toneSwitch).getPropertyValue("--switch-left")) || 132;
    const switchWidth = parseFloat(getComputedStyle(toneSwitch).getPropertyValue("--switch-width")) || 92;
    if (x < switchStart || x > switchStart + switchWidth) return;

    setTone(currentTone === "motivator" ? "roaster" : "motivator");
  });
}

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
    trackEvent("download_click", {
      store: target,
      label,
      placement: link.closest(".hero") ? "hero" : link.closest(".cta") ? "cta" : link.closest(".reasons") ? "reasons" : "header_or_menu",
    });
    openConfiguredLink(target, `Ссылка на ${label} пока не задана. Подставим реальный URL скачивания.`);
  });
});

document.querySelectorAll("[data-early-access]").forEach((link) => {
  link.addEventListener("click", () => {
    trackEvent("early_access_click", {
      placement: link.dataset.earlyAccess,
    });
  });
});

waitlistForms.forEach((form) => {
  form.querySelectorAll("[data-phone-field]").forEach((field) => {
    const select = field.querySelector("select[name='phoneCountry']");
    const display = field.querySelector("input[name='phoneDisplay']");
    if (display) {
      display.addEventListener("input", () => formatPhoneField(field));
      display.addEventListener("blur", () => getPhonePayload(form));
      display.addEventListener("focus", () => trackEvent("waitlist_phone_focus", { source: window.location.pathname }));
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
if (initialTone) {
  setTone(initialTone);
}

const referralSource = new URLSearchParams(window.location.search).get("ref");
if (referralSource) {
  localStorage.setItem("maniReferralSource", referralSource);
}

if (cookieAcceptButton) {
  cookieAcceptButton.addEventListener("click", () => setCookieConsent("accepted"));
}

if (cookieRejectButton) {
  cookieRejectButton.addEventListener("click", () => setCookieConsent("necessary"));
}

initCookieConsent();
loadWaitlistStats();

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
      requestAnimationFrame(() => waitlistDialog.querySelector("input[name='phoneDisplay']")?.focus());
      trackEvent("waitlist_open", { source: trigger.dataset.earlyAccess || "unknown" });
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

document.querySelectorAll("[data-mani-test-drive]").forEach((root) => {
  const subscriptionsInput = root.querySelector("[data-mtd-subscriptions]");
  const impulseInput = root.querySelector("[data-mtd-impulse]");
  const modeButtons = [...root.querySelectorAll("[data-mtd-mode]")];
  const rubles = new Intl.NumberFormat("ru-RU");
  let mascotMode = "jester";

  const setRangeFill = (input) => {
    const percent = ((Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min))) * 100;
    input.style.setProperty("--range-fill", `linear-gradient(90deg,#ff650e 0 ${percent}%,#e7edf7 ${percent}% 100%)`);
  };

  const render = () => {
    const subscriptions = Number(subscriptionsInput.value);
    const impulseBuys = Number(impulseInput.value);
    const annualLoss = subscriptions * 500 * 12 + impulseBuys * 350 * 52;
    const monthlySaving = Math.round(annualLoss / 12);
    const annualFormatted = `${rubles.format(annualLoss)} ₽`;
    const monthlyFormatted = `${rubles.format(monthlySaving)} ₽`;
    let message;

    if (mascotMode === "jester") {
      if (annualLoss === 0) message = "Ноль утечек? Либо ты финансовый ниндзя, либо сейчас очень уверенно врёшь ползункам. Ладно, засчитываю победу — бюджет сегодня может выдохнуть.";
      else if (annualLoss <= 12000) message = `Всего ${annualFormatted} в год. Не пожар, но деньги понемногу уносят тапочки из прихожей. Поймаем мелких беглецов, пока они не позвали друзей.`;
      else if (annualLoss <= 30000) message = `${annualFormatted} в год испаряются без аплодисментов. Это уже не мелочь из кармана, а несколько хороших ужинов, которые съел автоплатёж. Прикроем эту лавочку.`;
      else if (annualLoss <= 70000) message = `Ого... Твои деньги устроили профессиональный побег! На эти ${annualFormatted} в год можно было слетать в отпуск, но ты предпочёл спонсировать сервисы, которые даже не открываешь. Красиво жить не запретишь, да?`;
      else message = `${annualFormatted} в год?! Бюджет уже сидит в углу и шепчет: «Спроси у него, он вообще видел эти цифры?» Это не утечка, это финансовый аквапарк. Срочно перекрываем краны.`;
    } else {
      if (annualLoss === 0) message = "Отлично: сейчас расчёт не показывает скрытых потерь. Это сильная база. Я помогу сохранить такой порядок и вовремя замечать изменения, если они появятся.";
      else if (annualLoss <= 12000) message = `У тебя совсем небольшие утечки — около ${annualFormatted} в год. Ты уже хорошо держишь финансы в руках. Давай спокойно найдём пару точек роста и направим эти деньги на то, что действительно важно.`;
      else if (annualLoss <= 30000) message = `Сейчас незаметно уходит около ${annualFormatted} в год. Ничего страшного: такие траты легко пропустить. Разберём их вместе без резких ограничений и вернём деньгам понятную цель.`;
      else if (annualLoss <= 70000) message = `Я вижу, что сейчас уходит около ${annualFormatted} в год. Не переживай и не кори себя — это скрытые маркеры, которые трудно отследить вручную. Мы разберёмся вместе и шаг за шагом вернём полный контроль.`;
      else message = `${annualFormatted} в год выглядит серьёзно, но это не повод паниковать. Большая сумма складывается из понятных привычек. Начнём с самых простых изменений, сохраним комфорт и постепенно высвободим заметную часть бюджета.`;
    }

    root.querySelector("[data-mtd-subscriptions-output]").textContent = subscriptions;
    root.querySelector("[data-mtd-impulse-output]").textContent = impulseBuys;
    root.querySelector("[data-mtd-subscriptions-metric]").textContent = subscriptions;
    root.querySelector("[data-mtd-impulse-metric]").textContent = impulseBuys;
    root.querySelector("[data-mtd-annual]").textContent = annualFormatted;
    root.querySelector("[data-mtd-monthly]").textContent = monthlyFormatted;
    root.querySelector("[data-mtd-message]").textContent = message;

    const mascot = root.querySelector("[data-mtd-mascot]");
    mascot.src = mascotMode === "jester"
      ? "assets/newmani/interactive/jester.png"
      : "assets/newmani/interactive/motivator.png";
    mascot.alt = mascotMode === "jester" ? "Весельчак Mani" : "Мотиватор Mani";
    root.classList.toggle("is-motivator", mascotMode === "motivator");
    modeButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.mtdMode === mascotMode));
    setRangeFill(subscriptionsInput);
    setRangeFill(impulseInput);
  };

  subscriptionsInput.addEventListener("input", render);
  impulseInput.addEventListener("input", render);
  modeButtons.forEach((button) => button.addEventListener("click", () => {
    mascotMode = button.dataset.mtdMode;
    render();
  }));
  render();
});
