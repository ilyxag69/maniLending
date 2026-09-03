const baseUrl = process.env.SITE_URL || "https://moimani.ai";

const checks = [];

async function fetchText(path) {
  const response = await fetch(new URL(path, baseUrl));
  const body = await response.text();
  return { response, body };
}

async function fetchHead(path) {
  return fetch(new URL(path, baseUrl), { method: "HEAD" });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function check(name, fn) {
  checks.push({ name, fn });
}

check("home page loads", async () => {
  const { response, body } = await fetchText("/");
  assert(response.ok, `Home returned ${response.status}`);
  assert(body.includes("mani"), "Home does not contain mani");
  assert(body.includes("script.js?v=20260903-layout-9"), "Expected script cache-bust is missing");
  assert(body.includes("conversion-experience.css?v=20260903-quote-fit-1"), "Expected conversion CSS is missing");
  assert(body.includes("product-config.js?v=20260902-closed-beta-1"), "Expected product config is missing");
  assert(body.includes("mani-home.min.css?v=20260902-closed-beta-2"), "Expected CSS cache-bust is missing");
  assert(body.includes('href="/faq"'), "FAQ header link is missing");
  assert(body.includes("data-waitlist-form"), "Waitlist form is missing from home page");
  assert(body.includes("data-contact-form"), "Contact form is missing from home page");
  assert(body.toLowerCase().includes("уже работает в закрытой бете"), "Closed beta status is missing");
  assert(body.includes("Получить приглашение"), "Invitation CTA is missing");
  assert(body.includes("data-open-contact"), "Mobile contact trigger is missing from home page");
  assert(body.includes('id="contact-dialog"'), "Mobile contact dialog is missing from home page");
  assert(body.includes('href="https://t.me/eto_mani"'), "Direct Telegram contact is missing");
  assert(body.includes('href="#contacts"'), "Footer contact navigation is missing");
  assert((body.match(/href="#contacts"/g) || []).length >= 3, "Header contact navigation is missing");
  assert(!body.includes("Осталось мест"), "Public remaining-place counter is still visible");
  [
    "https://www.instagram.com/moimani.ai",
    "https://t.me/eto_mani",
    "https://www.youtube.com/@Mani.ai_app",
    "https://vkvideo.ru/@club240056458",
    "https://dzen.ru/user/k88jy5w3kcoxjabefs8g_u6d1ve",
  ].forEach((url) => assert(body.includes(url), `Social link missing: ${url}`));
  assert(body.includes("data-phone-field"), "Phone formatter field is missing from home page");
  assert(body.includes('name="pdnConsent"'), "Personal data consent checkbox is missing");
  assert(body.includes('href="/soglasie"'), "Personal data consent link is missing");
  assert(body.includes('id="faq"'), "Inline FAQ section is missing from home page");
  assert(!body.includes('"@type": "FAQPage"'), "FAQPage schema should not be on home page");
});

check("contact API accepts a valid local message", async () => {
  const response = await fetch(new URL("/api/contact", baseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic: "Предложение",
      name: "Local QA",
      replyTo: "@local_test",
      message: "Проверка локальной формы обратной связи.",
      website: "",
      pdnConsent: true,
    }),
  });
  assert(response.status === 200, `Contact API returned ${response.status}`);
  const data = await response.json();
  assert(data.ok === true, "Contact API did not confirm the message");
});

check("preview conversion pages are reachable", async () => {
  const pages = [
    ["/bezopasnost", '<link rel="canonical" href="https://moimani.ai/bezopasnost"'],
    ["/faq", '<link rel="canonical" href="https://moimani.ai/faq"'],
    ["/soglasie", '<link rel="canonical" href="https://moimani.ai/soglasie"'],
  ];

  for (const [page, canonical] of pages) {
    const { response, body } = await fetchText(page);
    assert(response.ok, `${page} returned ${response.status}`);
    assert(body.includes(canonical), `${page} canonical mismatch`);
    assert(!body.toLowerCase().includes("noindex"), `${page} contains noindex`);
  }
});

check("retired early access page redirects home", async () => {
  const response = await fetch(new URL("/pervye-1000", baseUrl), { redirect: "manual" });
  assert(response.status === 301, `/pervye-1000 returned ${response.status}`);
  const location = response.headers.get("location") || "";
  assert(location === "/#early-access" || location.endsWith("/#early-access"), "Retired page redirect mismatch");
});

check("seo metadata exists", async () => {
  const { body } = await fetchText("/");
  [
    '<link rel="canonical" href="https://moimani.ai/"',
    'property="og:image"',
    'name="twitter:card"',
    '"@type": "SoftwareApplication"',
  ].forEach((needle) => assert(body.includes(needle), `Missing ${needle}`));
  assert(body.includes("https://moimani.ai/og-image-v4.jpg"), "Current OG image is missing");
});

check("FAQ page schema exists", async () => {
  const { body } = await fetchText("/faq");
  assert(body.includes('"@type": "FAQPage"'), "FAQPage schema missing on FAQ page");
});

check("waitlist API works locally", async () => {
  if (!baseUrl.startsWith("http://127.0.0.1")) return;
  const response = await fetch(new URL("/api/waitlist-stats", baseUrl));
  assert(response.ok, `Waitlist stats returned ${response.status}`);
  const stats = await response.json();
  assert(stats.total === 1000, "Waitlist total mismatch");
  assert(typeof stats.registered === "number", "Waitlist registered count missing");
});

check("analytics tags exist", async () => {
  const { body } = await fetchText("/");
  const analyticsClient = await fetchText("/analytics-client.js?v=20260902-topmail-1");
  assert(body.includes("G-P6TDY2N5FK"), "GA4 id missing");
  assert(body.includes("103776176"), "Yandex Metrica id missing");
  assert(body.includes("https://top-fwz1.mail.ru/counter?id=3681438;js=na"), "Top.Mail.Ru noscript pixel missing");
  assert(analyticsClient.response.ok, `Analytics client returned ${analyticsClient.response.status}`);
  assert(analyticsClient.body.includes('topMailCounterId = "3681438"'), "Top.Mail.Ru counter id missing");
  assert(analyticsClient.body.includes('script.src = "https://top-fwz1.mail.ru/js/code.js"'), "Top.Mail.Ru loader missing");
  assert(body.includes("data-cookie-banner"), "Cookie consent banner missing");
  assert(body.includes('class="nm-page"') && !body.includes("cookie-consent-pending"), "Cookie notice must not lock the initial page");
  assert(body.includes('role="status"') && !body.includes('aria-modal="true"'), "Cookie notice must be informational, not modal");
});

check("robots and sitemap are reachable", async () => {
  const robots = await fetchText("/robots.txt");
  assert(robots.response.ok, `robots.txt returned ${robots.response.status}`);
  assert(robots.body.includes("Host: moimani.ai"), "robots.txt Host line mismatch");
  assert(robots.body.includes("Sitemap: https://moimani.ai/sitemap.xml"), "robots.txt sitemap line missing");

  const sitemap = await fetchText("/sitemap.xml");
  assert(sitemap.response.ok, `sitemap.xml returned ${sitemap.response.status}`);
  [
    "https://moimani.ai/",
    "https://moimani.ai/privacy",
    "https://moimani.ai/cookie",
    "https://moimani.ai/bezopasnost",
    "https://moimani.ai/faq",
    "https://moimani.ai/soglasie",
  ].forEach((url) => assert(sitemap.body.includes(`<loc>${url}</loc>`), `sitemap missing ${url}`));
  assert(!sitemap.body.includes("privacy.html"), "sitemap still contains privacy.html");
  assert(!sitemap.body.includes("cookie.html"), "sitemap still contains cookie.html");
});

check("legal pages are current", async () => {
  const pages = [
    ["/privacy", '<link rel="canonical" href="https://moimani.ai/privacy"'],
    ["/cookie", '<link rel="canonical" href="https://moimani.ai/cookie"'],
    ["/soglasie", '<link rel="canonical" href="https://moimani.ai/soglasie"'],
  ];

  for (const [page, canonical] of pages) {
    const { response, body } = await fetchText(page);
    assert(response.ok, `${page} returned ${response.status}`);
    assert(body.includes("mani"), `${page} does not contain mani`);
    assert(!body.includes("MoiMani"), `${page} still contains old MoiMani brand`);
    assert(!body.toLowerCase().includes("noindex"), `${page} contains noindex`);
    assert(body.includes(canonical), `${page} canonical mismatch`);
  }
});

check("verification files are reachable", async () => {
  const google = await fetchText("/googleb66ff853fb7a394f.html");
  assert(google.response.ok, `Google verification returned ${google.response.status}`);
  assert(google.body.includes("google-site-verification: googleb66ff853fb7a394f.html"), "Google verification body mismatch");

  const yandex = await fetchText("/yandex_bbe81356e7930cf6.html");
  assert(yandex.response.ok, `Yandex verification returned ${yandex.response.status}`);
  assert(yandex.body.includes("Verification: bbe81356e7930cf6"), "Yandex verification body mismatch");
});

check("IndexNow key file is reachable", async () => {
  const { response, body } = await fetchText("/a880a00f0b3c289c15baa51d8c1a23a2.txt");
  assert(response.ok, `IndexNow key returned ${response.status}`);
  assert(body.trim() === "a880a00f0b3c289c15baa51d8c1a23a2", "IndexNow key body mismatch");
});

check("AI discovery file is reachable", async () => {
  const { response, body } = await fetchText("/llms.txt");
  assert(response.ok, `llms.txt returned ${response.status}`);
  assert(body.includes("mani is an AI assistant for personal finance control"), "llms.txt summary missing");
});

check("key assets are reachable", async () => {
  const assets = [
    "/assets/iphone-hero.webp",
    "/assets/desktop-reasons-card.webp",
    "/assets/mobile-widgets.webp",
    "/assets/og-image.jpg",
    "/og-image-v4.jpg",
    "/assets/brand/mani-black.png",
    "/assets/newmani/hero-v1/composition/phones-mascots-alpha.png",
    "/assets/newmani/social-v1/motivator-peek-alpha.png",
    "/assets/newmani/social-v1/veselchak-peek-tight.png",
    "/assets/newmani/social-v1/duo-banner-clean.png",
    "/assets/newmani/social-v1/section-background-exact.png",
    "/assets/newmani/social-v1/section-background.png",
    "/security-page.css?v=20260705-4",
    "/assets/newmani/security-v1/security-orbit-alpha.png",
    "/assets/newmani/security-page/hero-mani-alpha.png",
    "/assets/newmani/security-page/shield-mani-alpha.png",
    "/assets/newmani/security-page/icons/read-only.png",
    "/assets/newmani/security-page/icons/encryption.png",
    "/assets/newmani/security-page/icons/api.png",
    "/assets/newmani/security-page/icons/anonymization.png",
    "/assets/newmani/security-page/icons/deletion.png",
    "/assets/newmani/security-page/icons/bank.png",
    "/assets/newmani/security-page/icons/token.png",
    "/assets/newmani/security-page/icons/ai.png",
    "/faq-page.css?v=20260705-4",
    "/assets/newmani/faq-page/motivator.png",
    "/assets/newmani/faq-page/veselchak.png",
    "/assets/newmani/faq-page/orbit.png",
    "/assets/newmani/faq-page/category-basic.png",
    "/assets/newmani/faq-page/category-ai.png",
    "/assets/newmani/faq-page/category-security.png",
    "/assets/newmani/faq-page/category-future.png",
  ];

  for (const asset of assets) {
    const response = await fetchHead(asset);
    assert(response.ok, `${asset} returned ${response.status}`);
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength < 1) {
      const fallback = await fetch(new URL(asset, baseUrl));
      assert(fallback.ok, `${asset} GET returned ${fallback.status}`);
      const body = await fallback.arrayBuffer();
      assert(body.byteLength > 0, `${asset} has empty body`);
    }
  }
});

let failed = 0;

for (const { name, fn } of checks) {
  try {
    await fn();
    console.log(`OK ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(`  ${error.message}`);
  }
}

if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log(`All ${checks.length} live checks passed for ${baseUrl}`);
}
