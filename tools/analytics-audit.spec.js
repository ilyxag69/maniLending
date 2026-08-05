const { test, expect } = require("@playwright/test");

test.use({ channel: "chrome" });
const siteUrl = process.env.SITE_URL || "http://127.0.0.1:4179";

async function captureFirstParty(page) {
  const events = [];
  await page.route("**/api/analytics", async (route) => {
    const body = route.request().postDataJSON();
    events.push(...(body?.events || []));
    await route.fulfill({ status: 204, body: "" });
  });
  return events;
}

test("first-party analytics works without consent and sends no PII", async ({ page }) => {
  const events = await captureFirstParty(page);
  const external = [];
  page.on("request", (request) => {
    if (/googletagmanager|google-analytics|mc\.yandex/.test(request.url())) external.push(request.url());
  });

  await page.goto(siteUrl);
  await page.evaluate(() => {
    localStorage.removeItem("maniCookieConsent");
    localStorage.removeItem("maniAnalyticsVisitorV1");
  });
  await page.reload();
  await page.waitForTimeout(1600);

  expect(events.some((event) => event.name === "page_view")).toBeTruthy();
  expect(events.some((event) => event.name === "experiment_view" && event.hero_headline_variant)).toBeTruthy();
  expect(events.every((event) => !event.visitor_id)).toBeTruthy();
  expect(events.every((event) => event.consent_state === "unknown")).toBeTruthy();
  expect(external).toHaveLength(0);

  const serialized = JSON.stringify(events).toLowerCase();
  for (const forbidden of ["phone", "email", "contactdetails", "annualloss", "monthlysaving"]) {
    expect(serialized).not.toContain(forbidden);
  }
});

test("consent enables external analytics and persistent anonymous visitor", async ({ page }) => {
  const events = await captureFirstParty(page);
  const external = [];
  page.on("request", (request) => {
    if (/googletagmanager|google-analytics|mc\.yandex/.test(request.url())) external.push(request.url());
  });
  await page.addInitScript(() => localStorage.setItem("maniCookieConsent", "accepted"));
  await page.goto(siteUrl);
  await page.waitForTimeout(1800);

  expect(events.some((event) => event.consent_state === "accepted" && event.visitor_id)).toBeTruthy();
  expect(external.length).toBeGreaterThan(0);
});

test("CTA and validation failures are recorded by type only", async ({ page }) => {
  const events = await captureFirstParty(page);
  await page.goto(siteUrl);
  await page.locator("[data-early-access='hero']").click();
  await page.locator("[data-waitlist-form] button[type='submit']").click();
  await page.waitForTimeout(1600);

  expect(events.some((event) => event.name === "cta_click" && event.cta_location === "hero")).toBeTruthy();
  expect(events.some((event) => event.name === "waitlist_form_open" && event.cta_location === "hero")).toBeTruthy();
  expect(events.some((event) => event.name === "form_error" && event.error_type === "invalid_phone")).toBeTruthy();
  expect(events.some((event) => event.name === "form_error" && event.error_type === "missing_pdn_consent")).toBeTruthy();
});
