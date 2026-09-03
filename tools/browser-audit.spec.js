const { test, expect } = require(process.env.MANI_PLAYWRIGHT_TEST || "@playwright/test");

test.use({
  channel: "chrome",
  baseURL: process.env.SITE_URL || "http://127.0.0.1:4179",
});

const successPayload = {
  position: 410,
  priorityPosition: 409,
  referralCode: "MANI-AUDIT1234567890",
  invitedCount: 1,
  status: "Early crew",
  stats: { total: 1000, registered: 410, left: 590, percent: 41 },
  referredByAccepted: true,
};

async function mockWaitlist(page, onPost = () => {}) {
  await page.route("**/api/waitlist**", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      onPost(request.postDataJSON());
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(successPayload) });
      return;
    }
    if (new URL(request.url()).searchParams.has("referralCode")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(successPayload) });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(successPayload.stats),
    });
  });
}

async function submitWaitlist(page) {
  const cookieChoice = page.locator("[data-cookie-accept]");
  if (await cookieChoice.isVisible()) await cookieChoice.click();
  await page.locator("[data-open-waitlist]").first().click();
  await page.locator("[name=phoneDisplay]").fill("9013696977");
  await page.locator("[data-waitlist-form] [name=pdnConsent]").check();
  await page.locator("[data-waitlist-form] button[type=submit]").click();
  await expect(page.locator("#waitlist-dialog")).toHaveClass(/is-success/);
  await expect(page.locator("[data-waitlist-form]")).toBeHidden();
  await expect(page.locator("[data-waitlist-success]")).toBeVisible();
  await expect(page.locator("[data-waitlist-success]")).toContainText("№410");
}

test("cookie notice stays non-blocking and fits desktop and mobile", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const banner = page.locator("[data-cookie-banner]");
  await expect(banner).toBeVisible();
  await expect(page.locator("body")).not.toHaveClass(/cookie-consent-pending/);
  expect(await page.locator("main").evaluate((element) => element.inert)).toBe(false);
  const desktopState = await page.evaluate(() => ({
    overflow: getComputedStyle(document.body).overflow,
  }));
  expect(desktopState.overflow).not.toBe("hidden");
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await page.locator("[data-cookie-accept]").click();
  await expect(banner).toBeHidden();
  await expect(page.locator("body")).not.toHaveClass(/cookie-consent-pending/);
  expect(await page.locator("main").evaluate((element) => element.inert)).toBe(false);

  await page.evaluate(() => localStorage.removeItem("maniCookieConsent"));
  await page.setViewportSize({ width: 360, height: 640 });
  await page.reload();
  await expect(banner).toBeVisible();
  const box = await banner.boundingBox();
  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(360);
  expect(box.y + box.height).toBeLessThanOrEqual(640);
  await page.locator("[data-cookie-accept]").click();
  await expect(banner).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem("maniCookieConsent"))).toBe("acknowledged");
});

test("local preview reset clears saved cookie consent", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("maniCookieConsent", "accepted"));
  await page.goto("/?cookie-preview=reset");
  await expect(page.locator("[data-cookie-banner]")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("maniCookieConsent"))).toBeNull();
  expect(new URL(page.url()).searchParams.has("cookie-preview")).toBe(false);
});

test("mobile pages have no horizontal overflow or page errors", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await mockWaitlist(page);
  for (const path of ["/", "/bezopasnost", "/faq", "/privacy", "/cookie", "/soglasie"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${path} overflows horizontally`).toBeLessThanOrEqual(1);
  }
  expect(errors).toEqual([]);
});

test("tone quotes stay inside the speech bubble on desktop and mobile", async ({ page }) => {
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 768, height: 900 },
    { width: 390, height: 844 },
    { width: 320, height: 720 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/?v=quote-fit-test#tone", { waitUntil: "domcontentloaded" });

    for (const tone of ["motivator", "fun"]) {
      await page.locator(`[data-tone="${tone}"]`).click();
      const fit = await page.evaluate(() => {
        const quote = document.querySelector(".mcs-quote");
        const text = quote?.querySelector("p");
        if (!quote || !text) return null;
        const quoteBox = quote.getBoundingClientRect();
        const textBox = text.getBoundingClientRect();
        return {
          top: textBox.top - quoteBox.top,
          right: quoteBox.right - textBox.right,
          bottom: quoteBox.bottom - textBox.bottom,
          left: textBox.left - quoteBox.left,
        };
      });

      expect(fit, `${tone} quote is present at ${viewport.width}px`).not.toBeNull();
      expect(fit.top, `${tone} text top fits at ${viewport.width}px`).toBeGreaterThanOrEqual(-1);
      expect(fit.right, `${tone} text right fits at ${viewport.width}px`).toBeGreaterThanOrEqual(-1);
      expect(fit.bottom, `${tone} text bottom fits at ${viewport.width}px`).toBeGreaterThanOrEqual(-1);
      expect(fit.left, `${tone} text left fits at ${viewport.width}px`).toBeGreaterThanOrEqual(-1);
    }
  }
});

test("referral survives blocked storage and success replaces the form", async ({ browser }) => {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() { throw new DOMException("Storage disabled", "SecurityError"); },
    });
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      get() { throw new DOMException("Storage disabled", "SecurityError"); },
    });
  });
  const page = await context.newPage();
  let posted;
  await mockWaitlist(page, (payload) => { posted = payload; });
  await page.goto("/?ref=MANI-LEGACY1");
  await submitWaitlist(page);
  expect(posted.ref).toBe("MANI-LEGACY1");
  await context.close();
});

test("success identity reopens and PNG is generated from same-origin assets", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => undefined },
    });
  });
  await mockWaitlist(page);
  await page.goto("/");
  await submitWaitlist(page);
  const copyButton = page.locator("[data-referral-copy]");
  await copyButton.click();
  await expect(copyButton).toHaveText("Ссылка скопирована");
  await expect(copyButton).toHaveClass(/is-copied/);
  const downloadPromise = page.waitForEvent("download");
  await page.locator("[data-referral-card]").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^mani-queue-.*\.png$/);

  await page.reload();
  await page.locator("[data-open-waitlist]").first().click();
  await expect(page.locator("#waitlist-dialog")).toHaveClass(/is-success/);
  await expect(page.locator("[data-waitlist-success]")).toContainText("№410");
});

test("external analytics starts before the notice is closed", async ({ page }) => {
  const analyticsRequests = [];
  page.on("request", (request) => {
    if (/googletagmanager|google-analytics|mc\.yandex/.test(request.url())) {
      analyticsRequests.push(request.url());
    }
  });
  await mockWaitlist(page);
  await page.goto("/");
  await page.waitForTimeout(1000);
  expect(analyticsRequests.length).toBeGreaterThan(0);
});
