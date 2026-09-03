import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
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
  const [html, script, config, productStatus, pageAnalytics, analyticsClient, siteChrome, htaccess, robots, sitemap] = await Promise.all([
    readFile(join(root, "index.html"), "utf8"),
    readFile(join(root, "script.js"), "utf8"),
    readFile(join(root, "product-config.js"), "utf8"),
    readFile(join(root, "product-status.js"), "utf8"),
    readFile(join(root, "page-analytics.js"), "utf8"),
    readFile(join(root, "analytics-client.js"), "utf8"),
    readFile(join(root, "site-chrome.css"), "utf8"),
    readFile(join(root, ".htaccess"), "utf8"),
    readFile(join(root, "robots.txt"), "utf8"),
    readFile(join(root, "sitemap.xml"), "utf8"),
  ]);
  const publicPages = await Promise.all(
    ["index.html", "faq.html", "bezopasnost.html", "bank-connection.html", "privacy.html", "cookie.html", "soglasie.html", "delete-account.html", "404.php"]
      .map((file) => readFile(join(root, file), "utf8"))
  );
  const publicCopy = publicPages.join("\n").replaceAll("@Mani.ai_app", "");

  check(config.includes('status: "closed_beta"'), "closed beta product status has one explicit source");
  check(productStatus.includes("window.MANI_PRODUCT_CONFIG") && !productStatus.includes("innerHTML"), "product status renderer uses the shared config and safe DOM construction");
  check(html.includes("mani. ИИ-помощник для контроля личных финансов"), "SEO positioning is explicit");
  check(!/Mani\.ai|\bMani\b/.test(publicCopy), "legacy brand spelling is absent from public pages");
  check(publicCopy.includes("Мани") && publicCopy.includes("mani"), "brand and character names are separated");
  check(publicPages.every((page) => page.includes('src="/assets/brand/mani-black.png"') && page.includes("data-brand-logo") && !page.includes("brand-logo.js")), "all public pages use only the black brand logo");
  check(
    publicPages.every((page, index) => index === 0 ? page.includes("mani-home.min.css") : page.includes("site-chrome.css")),
    "all public pages use the shared header and footer styles"
  );
  check(
    publicPages.slice(1).every((page) => page.includes("secondary-pages-modern.css?v=20260903-unified-1")),
    "all secondary public pages use the unified liquid glass system"
  );
  check(
    publicPages.every((page, index) => index === 0 ? page.includes("mani-home.min.css?v=20260902-closed-beta-2") : page.includes("site-chrome.css?v=20260902-mobile-polish-1"))
      && siteChrome.includes('grid-template-areas:')
      && siteChrome.includes('.nm-final-benefits')
      && siteChrome.includes('.nm-contact .nm-contact-form'),
    "all public pages load the mobile layout fixes"
  );
  check(publicPages.every((page) => page.includes("Получить приглашение") && !page.includes("Получить ранний доступ")), "all public headers use the same invitation message");
  check(publicPages.every((page) => page.includes('class="nm-footer"') && page.includes("Удаление аккаунта")), "all public pages use the same footer structure");
  check(siteChrome.includes(".nm-dialog-copy .nm-eyebrow") && siteChrome.includes(".nm-contact-form .nm-contact-consent input"), "shared form polish protects the modal badge and contact checkbox");
  check(html.includes("https://moimani.ai/og-image-v4.jpg"), "current OG image is explicit");
  check(htaccess.includes("AddDefaultCharset UTF-8"), "HTML responses declare UTF-8");
  check(html.includes("Manrope-Variable.woff2") && html.includes("Inter-500.woff2") && !html.includes(".ttf\" as=\"font"), "critical fonts use compressed WOFF2 files");
  check(htaccess.includes("Strict-Transport-Security") && htaccess.includes("X-Frame-Options") && htaccess.includes("Permissions-Policy") && htaccess.includes("Content-Security-Policy-Report-Only"), "modern security headers are configured");
  check(!script.includes("hero_headline_v1") && script.includes('dataset.heroHeadlineVariant = "chaos"'), "hero headline uses one stable canonical version");
  check(script.includes("heroHeadlineVariant: document.documentElement.dataset.heroHeadlineVariant"), "headline variant is attached to waitlist submissions");
  check(html.includes("product-config.js"), "product configuration loads before application logic");
  check(script.includes("analyticsAllowedFields"), "analytics fields are allowlisted");
  check(script.includes("loadYandexMetrica();\nloadAnalytics();\ninitCookieConsent();"), "external analytics starts independently of the cookie notice");
  check(
    analyticsClient.includes('topMailCounterId = "3681438"')
      && analyticsClient.includes('type: "pageView"')
      && analyticsClient.includes('script.src = "https://top-fwz1.mail.ru/js/code.js"')
      && publicPages.every((page) => page.includes("analytics-client.js?v=20260902-topmail-1"))
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
      && !script.includes('if (!data.duplicate) trackWaitlistConversion(payload.ctaLocation);')
      && script.includes('"reachGoal", goal'),
    "campaign goals fire after every server-confirmed waitlist submission"
  );
  check(html.includes('name="website"') && !html.includes('name="company"') && script.includes('formData.get("website")'), "waitlist honeypot avoids browser company autofill");
  check(script.includes("invalid_phone_or_email") && script.includes("rate_limited") && script.includes("errorMessages"), "waitlist failures show safe actionable messages");
  check(!/(phone|email|contactDetails|annualLoss|monthlySaving|position|message)/.test(pageAnalytics), "shared page analytics contains no PII or financial fields");
  check(!/trackEvent\([^;\n]*(phone|email|contactDetails|annualLoss|monthlySaving|position|message)\s*:/i.test(script), "analytics calls contain no PII or financial amounts");
  check(htaccess.includes("index\\.html") && htaccess.includes("consent"), "duplicate routes use redirects");
  check(robots.includes("Sitemap: https://moimani.ai/sitemap.xml"), "robots points to sitemap");
  check(sitemap.includes("https://moimani.ai/bezopasnost") && sitemap.includes("https://moimani.ai/faq") && sitemap.includes("https://moimani.ai/delete-account"), "sitemap contains public content routes");
  check((sitemap.match(/<lastmod>2026-09-03<\/lastmod>/g) || []).length === 8, "sitemap modification dates match the current release");
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

  const first = await submit({ heroHeadlineVariant: "order" });
  check(first.response.ok && first.data.position === 307 && first.data.referralCode, "new submission continues after remapped legacy positions");
  const storedAfterFirst = (await readFile(join(temporaryData, "waitlist-submissions.jsonl"), "utf8"))
    .trim()
    .split(/\r?\n/)
    .map((line) => JSON.parse(line));
  check(storedAfterFirst.at(-1)?.heroHeadlineVariant === "order", "headline variant is stored with the submission");

  const invalidVariant = await submit({ phone: "+79990000009", heroHeadlineVariant: "tampered" });
  check(invalidVariant.response.status === 400 && invalidVariant.data.code === "invalid_client_state", "invalid headline variant is rejected with a safe code");
  const autofilledHoneypot = await submit({ phone: "+79990000010", website: "Example LLC" });
  check(autofilledHoneypot.response.status === 400 && autofilledHoneypot.data.code === "bot_field_filled", "autofilled honeypot returns a diagnosable safe code");

  const retry = await submit({ phone: "+79990000002", idempotencyKey: first.data.referralCode.padEnd(16, "X") });
  check(retry.response.ok, "independent submission contract remains available");

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
} finally {
  if (server) server.kill();
  await rm(temporaryData, { recursive: true, force: true });
}

console.log(`Prelaunch checks passed: ${passed}`);
