const baseUrl = process.env.SITE_URL || "https://moimani.ai";
const failures = [];
const passed = [];

function assert(condition, message) {
  if (condition) passed.push(message);
  else failures.push(message);
}

function one(html, pattern) {
  return html.match(pattern)?.[1]?.trim() || "";
}

function count(html, pattern) {
  return [...html.matchAll(pattern)].length;
}

async function fetchText(path, options = {}) {
  const response = await fetch(new URL(path, baseUrl), options);
  return { response, body: options.method === "HEAD" ? "" : await response.text() };
}

const { response: robotsResponse, body: robots } = await fetchText("/robots.txt");
assert(robotsResponse.ok, "robots.txt доступен");
assert(robots.includes("Sitemap: https://moimani.ai/sitemap.xml"), "robots.txt указывает на sitemap");

const { response: sitemapResponse, body: sitemap } = await fetchText("/sitemap.xml");
assert(sitemapResponse.ok, "sitemap.xml доступен");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
assert(urls.length === 12, "sitemap содержит 12 публичных страниц");

const titles = new Map();
const descriptions = new Map();
const canonicals = new Map();

for (const url of urls) {
  const path = new URL(url).pathname;
  const { response, body } = await fetchText(path);
  assert(response.ok, `${path} отвечает HTTP 200`);

  const title = one(body, /<title>([^<]+)<\/title>/i);
  const description = one(body, /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  const canonical = one(body, /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);

  assert(Boolean(title), `${path} содержит title`);
  assert(title.length <= 65, `${path} title не длиннее 65 символов`);
  assert(Boolean(description), `${path} содержит meta description`);
  assert(description.length <= 180, `${path} description не длиннее 180 символов`);
  assert(canonical === url, `${path} содержит правильный canonical`);
  assert(count(body, /<h1\b/gi) === 1, `${path} содержит один H1`);
  assert(!/<meta\s+name=["']robots["'][^>]+noindex/i.test(body), `${path} открыт для индексирования`);

  for (const block of body.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      JSON.parse(block[1]);
      passed.push(`${path} содержит валидный JSON-LD`);
    } catch {
      failures.push(`${path} содержит невалидный JSON-LD`);
    }
  }

  if (titles.has(title)) failures.push(`${path} повторяет title страницы ${titles.get(title)}`);
  else titles.set(title, path);
  if (descriptions.has(description)) failures.push(`${path} повторяет description страницы ${descriptions.get(description)}`);
  else descriptions.set(description, path);
  if (canonicals.has(canonical)) failures.push(`${path} повторяет canonical страницы ${canonicals.get(canonical)}`);
  else canonicals.set(canonical, path);
}

for (const file of [
  "/googleb66ff853fb7a394f.html",
  "/yandex_bbe81356e7930cf6.html",
  "/a880a00f0b3c289c15baa51d8c1a23a2.txt",
]) {
  const { response } = await fetchText(file);
  assert(response.ok, `${file} доступен поисковой системе`);
}

const notFound = await fetchText("/seo-audit-missing-page");
assert(notFound.response.status === 404, "несуществующая страница отвечает HTTP 404");
assert(/noindex/i.test(notFound.body), "страница 404 закрыта от индексации");

const avif = await fetchText("/assets/newmani/hero-iphone-air-640.avif", { method: "HEAD" });
assert((avif.response.headers.get("content-type") || "").startsWith("image/avif"), "AVIF отдаётся с типом image/avif");
assert((avif.response.headers.get("cache-control") || "").includes("max-age=2592000"), "AVIF кэшируется 30 дней");

for (const item of passed) console.log(`PASS ${item}`);
for (const item of failures) console.error(`FAIL ${item}`);

console.log(`SEO audit: ${passed.length} passed, ${failures.length} failed`);
if (failures.length) process.exitCode = 1;
