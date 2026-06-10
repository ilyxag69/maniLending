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
  assert(body.includes("Mani.ai"), "Home does not contain Mani.ai");
  assert(body.includes("script.js?v=20260610-scrollfix-2"), "Expected script cache-bust is missing");
  assert(body.includes("styles.css?v=20260610-scrollfix-2"), "Expected CSS cache-bust is missing");
  assert(body.includes('href="/faq"'), "FAQ header link is missing");
  assert(body.includes("data-waitlist-form"), "Waitlist form is missing from home page");
  assert(body.includes("data-phone-field"), "Phone formatter field is missing from home page");
  assert(body.includes('name="pdnConsent"'), "Personal data consent checkbox is missing");
  assert(body.includes('href="/soglasie"'), "Personal data consent link is missing");
  assert(!body.includes('class="section seo-faq"'), "FAQ section should not be on home page");
  assert(!body.includes('"@type": "FAQPage"'), "FAQPage schema should not be on home page");
});

check("preview conversion pages are reachable", async () => {
  const pages = [
    ["/bezopasnost", '<link rel="canonical" href="https://moimani.ai/bezopasnost"'],
    ["/pervye-1000", '<link rel="canonical" href="https://moimani.ai/pervye-1000"'],
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

check("seo metadata exists", async () => {
  const { body } = await fetchText("/");
  [
    '<link rel="canonical" href="https://moimani.ai/"',
    'property="og:image"',
    'name="twitter:card"',
    '"@type": "SoftwareApplication"',
  ].forEach((needle) => assert(body.includes(needle), `Missing ${needle}`));
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
  assert(body.includes("G-P6TDY2N5FK"), "GA4 id missing");
  assert(body.includes("103776176"), "Yandex Metrica id missing");
  assert(body.includes("data-cookie-banner"), "Cookie consent banner missing");
  assert(!body.includes("googletagmanager.com/gtag/js"), "GA4 loads before cookie consent");
  assert(!body.includes("mc.yandex.ru/watch/103776176"), "Yandex noscript loads before cookie consent");
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
    "https://moimani.ai/pervye-1000",
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
    assert(body.includes("Mani.ai"), `${page} does not contain Mani.ai`);
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
  assert(body.includes("Mani.ai is an AI assistant for personal finance control"), "llms.txt summary missing");
});

check("key assets are reachable", async () => {
  const assets = [
    "/assets/iphone-hero.webp",
    "/assets/desktop-reasons-card.webp",
    "/assets/mobile-widgets.webp",
    "/assets/og-image.jpg",
  ];

  for (const asset of assets) {
    const response = await fetchHead(asset);
    assert(response.ok, `${asset} returned ${response.status}`);
    const contentLength = Number(response.headers.get("content-length") || 0);
    assert(contentLength > 0, `${asset} has empty content-length`);
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
