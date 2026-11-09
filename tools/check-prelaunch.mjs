import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const webAppUrl = "https://webapp.moimani.ai/";
const port = 4187;
const baseUrl = `http://127.0.0.1:${port}`;
const temporaryData = await mkdtemp(join(tmpdir(), "mani-prelaunch-"));
let server;
let passed = 0;

function check(condition, label) {
  if (!condition) throw new Error(label);
  passed += 1;
  console.log(`PASS ${label}`);
}

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Local server did not start");
}

async function submit(overrides = {}) {
  const idempotencyKey = overrides.idempotencyKey || crypto.randomUUID();
  const body = {
    phone: "+79990000001",
    email: "",
    contact: "manual",
    contactDetails: "",
    website: "",
    pdnConsent: true,
    pdnConsentVersion: "test",
    pdnConsentAt: new Date().toISOString(),
    ref: "",
    page: "/",
    idempotencyKey,
    firstTouch: { source: "test", campaign: "prelaunch" },
    lastTouch: { source: "test", campaign: "prelaunch" },
    ...overrides,
  };
  const response = await fetch(`${baseUrl}/api/waitlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(body),
  });
  return { response, data: await response.json() };
}

try {
  const [html, script, config, productStatus, pageAnalytics, analyticsClient, siteChrome, conversionExperience, htaccess, robots, sitemap] = await Promise.all([
    readFile(join(root, "index.html"), "utf8"),
    readFile(join(root, "script.js"), "utf8"),
    readFile(join(root, "product-config.js"), "utf8"),
    readFile(join(root, "product-status.js"), "utf8"),
    readFile(join(root, "page-analytics.js"), "utf8"),
    readFile(join(root, "analytics-client.js"), "utf8"),
    readFile(join(root, "site-chrome.css"), "utf8"),
    readFile(join(root, "conversion-experience.css"), "utf8"),
    readFile(join(root, ".htaccess"), "utf8"),
    readFile(join(root, "robots.txt"), "utf8"),
    readFile(join(root, "sitemap.xml"), "utf8"),
  ]);
  const publicPageFiles = ["index.html", "faq.html", "bezopasnost.html", "bank-connection.html", "privacy.html", "cookie.html", "soglasie.html", "delete-account.html", "guides.html", "kontrol-rashodov.html", "poisk-podpisok.html", "finansovyi-pomoshchnik.html", "obiedinit-scheta.html", "neznakomoe-spisanie.html", "byudzhet-do-zarplaty.html", "prilozhenie-dlya-ucheta-rashodov.html", "otmenit-yandex-plus.html", "otmenit-ivi.html", "web-version.html", "404.php"];
  const publicPages = await Promise.all(publicPageFiles.map((file) => readFile(join(root, file), "utf8")));
  const publicCopy = publicPages.join("\n").replaceAll("@Mani.ai_app", "");
  const productCtas = (page) => [...page.matchAll(/<a\b[^>]*\bdata-product-cta\b[^>]*>[\s\S]*?<\/a>/g)].map(([anchor]) => anchor);
  const plainText = (markup) => markup.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  check(config.includes('status: "web_beta"') && config.includes('launch: null') && config.includes('url: "'+webAppUrl+'"'), "available release uses one app URL and no countdown");
  check(productStatus.includes("window.MANI_PRODUCT_CONFIG") && !productStatus.includes("innerHTML"), "product status renderer uses the shared config and safe DOM construction");
  check(html.includes("mani. Контроль расходов и счета в одном месте"), "SEO positioning reflects the available first version");
  check(script.includes('Веб версия Мани уже доступна') && !script.includes('27 октября'), "share copy describes the available smartphone web version");
  check(!/Mani\.ai|\bMani\b/.test(publicCopy), "legacy brand spelling is absent from public pages");
  check(publicCopy.includes("Мани") && publicCopy.includes("mani"), "brand and character names are separated");
  check(publicPages.every((page) => page.includes('src="/assets/brand/mani-black.png"') && page.includes("data-brand-logo") && !page.includes("brand-logo.js")), "all public pages use only the black brand logo");
  check(publicPages.every(page=>page.includes('clarity-shell.css')), "all public pages use the shared header and footer styles");
  check(
    publicPages.slice(1).every((page) => page.includes("secondary-pages-modern.css?v=20260903-unified-1")),
    "all secondary public pages use the unified liquid glass system"
  );
  check(html.includes('clarity-home.css') && (await readFile(join(root,'clarity-home.css'),'utf8')).includes('@media(max-width:700px)') && publicPages.every(page=>page.includes('clarity-shell.css')), "all public pages load the mobile layout fixes");
  check(publicPages.every(page=>productCtas(page).every(anchor=>plainText(anchor).includes('Открыть Мани'))), "all public product CTAs use the same app label");
  check(publicPages.every(page=>productCtas(page).every(anchor=>anchor.includes('href="https://webapp.moimani.ai/"'))), "primary CTAs open the configured web app without JavaScript");
  check(html.includes('Для первых 1000 пользователей') && html.includes('в месяц навсегда') && html.includes('от 549 ₽/мес') && html.includes('подключённых банков'), "value and bounded first-1000 offer are explained");
  check(html.includes('Открой веб приложение на iPhone или Android') && !html.includes('27 октября'), "home description describes the available app");
  check(publicPages.every((page) => {
    const copy = plainText(page);
    return [...copy.matchAll(/навсегда/gi)].every((match) => /перв(?:ых|ые)\s+1000\s+пользовател/i.test(copy.slice(Math.max(0, match.index - 180), match.index + 90)));
  }) && !/(?:всем\s+(?:участникам|пользователям)|участникам\s+тестирования).{0,100}(?:бесплатн|0\s*₽).{0,50}навсегда/i.test(plainText(publicCopy)), "every lifetime free offer is limited to the first 1000 users");
  const guideFiles = new Set(["guides.html", "kontrol-rashodov.html", "poisk-podpisok.html", "finansovyi-pomoshchnik.html", "obiedinit-scheta.html", "neznakomoe-spisanie.html", "byudzhet-do-zarplaty.html", "prilozhenie-dlya-ucheta-rashodov.html", "otmenit-yandex-plus.html", "otmenit-ivi.html"]);
  check(publicPageFiles.filter((file) => guideFiles.has(file)).length === guideFiles.size && publicPages.every((page, index) => {
    if (!guideFiles.has(publicPageFiles[index])) return true;
    const invite = [...page.matchAll(/<section\b[^>]*class="gp-(?:cta|section) gp-glass"[^>]*>[\s\S]*?<\/section>/g)].map(([section]) => section).find((section) => section.includes("Для первых 1000 пользователей 0 ₽/мес навсегда")) || "";
    return /Открыть Мани/i.test(invite) && invite.includes('href="/#contacts"') && /предложени|идеи/i.test(invite) && /ошибк/i.test(invite) && /отзыв|впечатлени/i.test(invite) && productCtas(invite).length === 1;
  }), "all guides invite public web testing and link suggestions, bugs and feedback to the team");
  const storeNotifications = [...html.matchAll(/<a\b[^>]*\bdata-store-notify\b[^>]*>[\s\S]*?<\/a>/g)].map(([anchor]) => anchor);
  check(html.includes('data-open-waitlist') && html.includes('Узнать о выходе в магазинах приложений'), "store notification is separate from the open app");
  check(html.includes('id="waitlist-dialog"') && html.includes("data-waitlist-form") && html.includes('name="platform" value="android"') && html.includes('name="platform" value="ios"') && html.includes('name="pdnConsent"'), "secondary waitlist retains Android, iOS and consent fields");
  check(publicPages.every((page) => page.includes('href="/guides"')), "all public pages expose the guides section in shared navigation");
  check(publicPages.every((page) => page.includes('class="nm-footer"') && page.includes("Удаление аккаунта")), "all public pages use the same footer structure");
  check(html.includes('clarity-home.css') && html.includes('clarity-social-row') && !html.includes('data-hero-flow'), "home loads its lighter responsive layout and compact social navigation");
  check(siteChrome.includes(".nm-dialog-copy .nm-eyebrow") && siteChrome.includes(".nm-contact-form .nm-contact-consent input"), "shared form polish protects the modal badge and contact checkbox");
  check(html.includes('property="og:image" content="https://moimani.ai/og-image-v6.jpg"'), "current OG image is explicit and site-owned");
  check(htaccess.includes("AddDefaultCharset UTF-8"), "HTML responses declare UTF-8");
  check(html.includes('Manrope-Variable.woff2') && !html.includes('.ttf" as="font'), "critical fonts use compressed WOFF2 files");
  check(htaccess.includes("Strict-Transport-Security") && htaccess.includes("X-Frame-Options") && htaccess.includes("Permissions-Policy") && htaccess.includes("Content-Security-Policy-Report-Only"), "modern security headers are configured");
  check(!script.includes('hero_headline_v1') && script.includes('? "clarity" : "chaos"'), "hero headline uses one stable canonical version");
  check(script.includes("heroHeadlineVariant: document.documentElement.dataset.heroHeadlineVariant"), "headline variant is attached to waitlist submissions");
  check(publicPages.every((page) => page.includes("product-config.js") && page.indexOf("product-status.js") > page.indexOf("product-config.js")), "product configuration loads before the status renderer on every public page");
  check(script.includes("analyticsAllowedFields"), "analytics fields are allowlisted");
  check(script.includes("loadYandexMetrica();\nloadAnalytics();\ninitCookieConsent();"), "external analytics starts independently of the cookie notice");
  check(
    analyticsClient.includes('topMailCounterId = "3681438"')
      && analyticsClient.includes('type: "pageView"')
      && analyticsClient.includes('script.src = "https://top-fwz1.mail.ru/js/code.js"')
      && publicPages.every((page) => page.includes("analytics-client.js?v=20260918-release-1"))
      && publicPages.every((page) => page.includes("https://top-fwz1.mail.ru/counter?id=3681438;js=na")),
    "Top.Mail.Ru counter loads once on every public page with a noscript fallback"
  );
  check(
    script.includes('window._tmr.push({ id: "3681438", type: "reachGoal", goal });')
      && script.includes('return "form1"')
      && script.includes('return "form2"')
      && script.includes('return "form3"'),
    "Top.Mail.Ru receives all three confirmed waitlist goals"
  );
  check(
    htaccess.includes("https://top-fwz1.mail.ru")
      && htaccess.includes("https://top.mail.ru")
      && publicCopy.includes("Top.Mail.Ru"),
    "Top.Mail.Ru is covered by CSP and public analytics disclosure"
  );
  check(
    !html.includes("cookie-consent-pending")
      && !script.includes("cookieBlockedElements")
      && !script.includes("element.inert = true")
      && html.includes('role="status"'),
    "cookie notice never blocks page access or scrolling"
  );
  check(
    !analyticsClient.includes("consentState() !== \"accepted\"")
      && analyticsClient.includes("visitor_id: visitorId()"),
    "first-party visitor analytics is always enabled"
  );
  check(
    script.includes('["hero", "header", "mobile-menu", "mobile-sticky"].includes(ctaLocation)')
      && script.includes('ctaLocation === "test-drive"')
      && script.includes('ctaLocation === "final"'),
    "waitlist entry points map to the three campaign goals"
  );
  check(
    script.includes('trackWaitlistConversion(payload.ctaLocation);')
      && script.includes('if (!data.duplicate) trackWaitlistConversion(payload.ctaLocation);')
      && script.includes('"reachGoal", goal'),
    "campaign goals fire only for a newly accepted submission"
  );
  check(html.includes('name="website"') && !html.includes('name="company"') && script.includes('formData.get("website")'), "waitlist honeypot avoids browser company autofill");
  check(script.includes("invalid_phone_or_email") && script.includes("rate_limited") && script.includes("errorMessages"), "waitlist failures show safe actionable messages");
  check(!/(phone|email|contactDetails|annualLoss|monthlySaving|position|message)/.test(pageAnalytics), "shared page analytics contains no PII or financial fields");
  check(!/trackEvent\([^;\n]*(phone|email|contactDetails|annualLoss|monthlySaving|position|message)\s*:/i.test(script), "analytics calls contain no PII or financial amounts");
  check(htaccess.includes("index\\.html") && htaccess.includes("consent"), "duplicate routes use redirects");
  check(robots.includes("Sitemap: https://moimani.ai/sitemap.xml"), "robots points to sitemap");
  check(sitemap.includes("https://moimani.ai/bezopasnost") && sitemap.includes("https://moimani.ai/faq") && sitemap.includes("https://moimani.ai/delete-account") && sitemap.includes("https://moimani.ai/guides") && sitemap.includes("https://moimani.ai/kontrol-rashodov") && sitemap.includes("https://moimani.ai/poisk-podpisok") && sitemap.includes("https://moimani.ai/finansovyi-pomoshchnik") && sitemap.includes("https://moimani.ai/obiedinit-scheta") && sitemap.includes("https://moimani.ai/neznakomoe-spisanie") && sitemap.includes("https://moimani.ai/byudzhet-do-zarplaty") && sitemap.includes("https://moimani.ai/web-version"), "sitemap contains public content and web guide routes");
  const sitemapEntries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, entry]) => ({
    slug: entry.match(/<loc>https:\/\/moimani\.ai\/(.*?)<\/loc>/)?.[1],
    modified: entry.match(/<lastmod>(.*?)<\/lastmod>/)?.[1]
  }));
  const today=new Date().toISOString().slice(0,10);
  check(sitemapEntries.length===23 && sitemapEntries.every(({modified})=>/^\d{4}-\d{2}-\d{2}$/.test(modified) && Number.isFinite(Date.parse(modified)) && modified<=today) && ['start-mani','voprosy-mani','dannye-v-mani','terms'].every(slug=>sitemapEntries.some(e=>e.slug===slug)), "23 sitemap URLs have valid non-future modification dates");
  check(htaccess.includes("AddType image/avif .avif") && htaccess.includes('ExpiresByType image/avif "access plus 30 days"'), "AVIF assets use the correct MIME type and cache policy");
  check(!((await readFile(join(root, "bank-connection.html"), "utf8")).includes('"item":"https://moimani.ai/support"')), "structured breadcrumbs contain no nonexistent support route");

  await writeFile(
    join(temporaryData, "waitlist-submissions.jsonl"),
    `${JSON.stringify({
      position: 1,
      referralCode: "MANI-LEGACY1",
      phone: "+79990000999",
      status: "Founding users",
      createdAt: "2026-06-08T00:00:00.000Z",
    })}\n`,
    "utf8"
  );

  server = spawn(process.execPath, ["tools/serve-local.mjs"], {
    cwd: root,
    env: { ...process.env, PORT: String(port), MANI_DATA_DIR: temporaryData },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await waitForServer();

  const legacyResponse = await fetch(`${baseUrl}/api/waitlist?referralCode=MANI-LEGACY1`);
  const legacy = await legacyResponse.json();
  check(legacyResponse.ok && legacy.position === 306, "legacy position 1 is publicly continued as position 306");

  const first = await submit({ heroHeadlineVariant: "order", platform: "ios" });
  check(first.response.ok && first.data.position === 307 && first.data.referralCode, "new submission continues after remapped legacy positions");
  const storedAfterFirst = (await readFile(join(temporaryData, "waitlist-submissions.jsonl"), "utf8"))
    .trim()
    .split(/\r?\n/)
    .map((line) => JSON.parse(line));
  check(storedAfterFirst.at(-1)?.heroHeadlineVariant === "order", "headline variant is stored with the submission");
  check(storedAfterFirst.at(-1)?.platform === "ios", "iOS choice is stored with the submission");
  for (const platform of ["windows", ["ios"], true]) {
    const invalid = await submit({ phone: "+79990000011", platform });
    check(invalid.response.status === 400 && invalid.data.code === "invalid_client_state", "invalid platform is rejected");
  }

  const invalidVariant = await submit({ phone: "+79990000009", heroHeadlineVariant: "tampered" });
  check(invalidVariant.response.status === 400 && invalidVariant.data.code === "invalid_client_state", "invalid headline variant is rejected with a safe code");
  const autofilledHoneypot = await submit({ phone: "+79990000010", website: "Example LLC" });
  check(autofilledHoneypot.response.status === 400 && autofilledHoneypot.data.code === "bot_field_filled", "autofilled honeypot returns a diagnosable safe code");

  const retry = await submit({ phone: "+79990000002", platform: "android", idempotencyKey: first.data.referralCode.padEnd(16, "X") });
  check(retry.response.ok, "independent submission contract remains available");
  const storedPlatforms = (await readFile(join(temporaryData, "waitlist-submissions.jsonl"), "utf8")).trim().split(/\r?\n/).map(JSON.parse);
  check(storedPlatforms.at(-1)?.platform === "android", "Android choice is stored with the submission");
  const csvResponse = await fetch(`${baseUrl}/api/waitlist-export?format=csv`);
  check((await csvResponse.text()).split("\n")[0].includes(",platform,"), "platform is included in admin CSV");

  const idempotencyKey = crypto.randomUUID();
  const idempotentFirst = await submit({ phone: "+79990000003", idempotencyKey });
  const idempotentRetry = await submit({ phone: "+79990000003", idempotencyKey });
  check(idempotentFirst.data.position === idempotentRetry.data.position && idempotentRetry.data.duplicate === true, "idempotency prevents double submission");

  const referred = await submit({ phone: "+79990000004", ref: first.data.referralCode });
  check(referred.data.referredByAccepted === true, "valid referral is accepted");
  const secondReferred = await submit({ phone: "+79990000005", ref: first.data.referralCode });
  check(secondReferred.data.referredByAccepted === true, "second valid referral is accepted");

  const referralStatusResponse = await fetch(`${baseUrl}/api/waitlist?referralCode=${encodeURIComponent(first.data.referralCode)}`);
  const referralStatus = await referralStatusResponse.json();
  check(
    referralStatusResponse.ok &&
    referralStatus.invitedCount === 2 &&
    referralStatus.priorityPosition === 305 &&
    referralStatus.status === "Closed beta wave",
    "referral improves priority and unlocks the next status"
  );

  const duplicate = await submit({ phone: "+79990000004", ref: referred.data.referralCode });
  check(duplicate.data.duplicate === true && duplicate.data.referredByAccepted === false, "duplicate and self-referral do not create credit");

  const privacyRedirect = await fetch(`${baseUrl}/privacy.html`, { redirect: "manual" });
  check(privacyRedirect.status === 301 && privacyRedirect.headers.get("location") === "/privacy", "local SEO redirect works");
  const deleteAccountPage = await fetch(`${baseUrl}/delete-account`);
  check(deleteAccountPage.ok && (await deleteAccountPage.text()).includes("Удаление аккаунта и данных в mani"), "account deletion page is available at its public route");
  const deleteAccountRedirect = await fetch(`${baseUrl}/delete-account.html`, { redirect: "manual" });
  check(deleteAccountRedirect.status === 301 && deleteAccountRedirect.headers.get("location") === "/delete-account", "account deletion duplicate route redirects to canonical URL");
  const webGuide = await fetch(`${baseUrl}/web-version`);
  const webGuideHtml = await webGuide.text();
  check(webGuide.ok && webGuideHtml.includes('Открой на смартфоне') && webGuideHtml.includes('href="https://webapp.moimani.ai/"') && !webGuideHtml.includes('27 октября'), "web guide describes installation of the available app");
} finally {
  if (server) server.kill();
  await rm(temporaryData, { recursive: true, force: true });
}

console.log(`Prelaunch checks passed: ${passed}`);
