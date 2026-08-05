const { test, expect } = require("@playwright/test");

test.use({
  channel: "chrome",
  baseURL: "http://127.0.0.1:4179",
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
  await page.locator("[data-open-waitlist]").first().click();
  await page.locator("[name=phoneDisplay]").fill("9013696977");
  await page.locator("[name=pdnConsent]").check();
  await page.locator("[data-waitlist-form] button[type=submit]").click();
  await expect(page.locator("#waitlist-dialog")).toHaveClass(/is-success/);
  await expect(page.locator("[data-waitlist-form]")).toBeHidden();
  await expect(page.locator("[data-waitlist-success]")).toBeVisible();
  await expect(page.locator("[data-waitlist-success]")).toContainText("№410");
}

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

test("analytics stays off after necessary-only consent", async ({ page }) => {
  const analyticsRequests = [];
  page.on("request", (request) => {
    if (/googletagmanager|google-analytics|mc\.yandex/.test(request.url())) {
      analyticsRequests.push(request.url());
    }
  });
  await mockWaitlist(page);
  await page.goto("/");
  await page.locator("[data-cookie-reject]").click();
  await page.waitForTimeout(300);
  expect(analyticsRequests).toEqual([]);
});
