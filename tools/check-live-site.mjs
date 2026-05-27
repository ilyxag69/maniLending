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
  assert(body.includes("script.js?v=20260526-events-17"), "Expected script cache-bust is missing");
  assert(body.includes("styles.css?v=20260526-seo-24"), "Expected CSS cache-bust is missing");
  assert(body.includes("Подключение и отключение банков и счетов в один клик."), "Correct bank connection copy is missing");
  assert(!body.includes("Отключение банков и счетов в один клик."), "Old bank disconnection-only copy is still present");
});

check("seo metadata exists", async () => {
  const { body } = await fetchText("/");
  [
    '<link rel="canonical" href="https://moimani.ai/"',
    'property="og:image"',
    'name="twitter:card"',
    '"@type": "SoftwareApplication"',
    '"@type": "FAQPage"',
    "seo-intro",
  ].forEach((needle) => assert(body.includes(needle), `Missing ${needle}`));
});

check("analytics tags exist", async () => {
  const { body } = await fetchText("/");
  assert(body.includes("G-P6TDY2N5FK"), "GA4 id missing");
  assert(body.includes("ym(103776176"), "Yandex Metrica init missing");
  assert(body.includes("mc.yandex.ru/watch/103776176"), "Yandex noscript missing");
});

check("robots and sitemap are reachable", async () => {
  const robots = await fetchText("/robots.txt");
  assert(robots.response.ok, `robots.txt returned ${robots.response.status}`);
  assert(robots.body.includes("Host: moimani.ai"), "robots.txt Host line mismatch");
  assert(robots.body.includes("Sitemap: https://moimani.ai/sitemap.xml"), "robots.txt sitemap line missing");

  const sitemap = await fetchText("/sitemap.xml");
  assert(sitemap.response.ok, `sitemap.xml returned ${sitemap.response.status}`);
  assert(sitemap.body.includes("<loc>https://moimani.ai/</loc>"), "sitemap home URL missing");
  assert(sitemap.body.includes("<loc>https://moimani.ai/privacy.html</loc>"), "sitemap privacy URL missing");
  assert(sitemap.body.includes("<loc>https://moimani.ai/cookie.html</loc>"), "sitemap cookie URL missing");
});

check("legal pages are current", async () => {
  const pages = ["/privacy.html", "/cookie.html"];

  for (const page of pages) {
    const { response, body } = await fetchText(page);
    assert(response.ok, `${page} returned ${response.status}`);
    assert(body.includes("Mani.ai"), `${page} does not contain Mani.ai`);
    assert(!body.includes("MoiMani"), `${page} still contains old MoiMani brand`);
    assert(!body.includes("MoiMani уже скоро тут"), `${page} still contains old placeholder copy`);
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
