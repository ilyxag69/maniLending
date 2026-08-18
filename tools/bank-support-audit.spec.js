const { test, expect } = require("@playwright/test");

test.describe("bank connection support", () => {
  test("known code opens personalized instruction without runtime errors", async ({ page }) => {
    const errors = []; page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:4179/support/bank-connection?error=sms_not_received&bank=sber&source=app&platform=ios&app_version=1.2.3");
    await expect(page.locator("[data-personal-result]")).toBeVisible();
    await expect(page.locator("[data-personal-copy]")).toContainText("Сбер");
    await expect(page.locator("#sms-not-received .bs-issue-body")).toBeVisible();
    await expect(page.locator("[data-app-back]")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("unknown code stays generic and never renders raw input", async ({ page }) => {
    await page.goto("http://127.0.0.1:4179/support/bank-connection?error=secret_raw_value&bank=secret_bank");
    await expect(page.locator("[data-personal-result]")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("secret_raw_value");
    await expect(page.locator("body")).not.toContainText("secret_bank");
    await expect(page.locator("#unknown-error .bs-issue-body")).toBeVisible();
  });

  test("search, filters and keyboard accordion work", async ({ page }) => {
    await page.goto("http://127.0.0.1:4179/support/bank-connection");
    await page.locator("[data-issue-search]").fill("смс");
    await expect(page.locator("#sms-not-received")).toBeVisible();
    const button = page.locator("#sms-not-received .bs-issue-toggle"); await button.focus(); await page.keyboard.press("Enter");
    await expect(button).toHaveAttribute("aria-expanded", "true");
  });

  test("original mobile navigation opens and closes accessibly", async ({ page }) => {
    await page.setViewportSize({width:320,height:800}); await page.goto("http://127.0.0.1:4179/support/bank-connection");
    const menu = page.locator(".nm-menu"); await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true"); await expect(page.locator(".nm-mobile-menu")).toBeVisible();
    await page.keyboard.press("Escape"); await expect(menu).toHaveAttribute("aria-expanded", "false");
  });

  for (const width of [320, 360, 375, 600, 768, 1024, 1440]) {
    test(`has no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({width,height:900}); await page.goto("http://127.0.0.1:4179/support/bank-connection");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      const aggressiveWraps = await page.evaluate(() => [...document.querySelectorAll("main h1,main h2,main h3,main h4,main p,main li,main a,main button,main label,main dd")].filter((element) => {
        const style = getComputedStyle(element); return style.wordBreak === "break-all" || style.overflowWrap === "anywhere";
      }).length);
      expect(aggressiveWraps).toBe(0);
      if (width <= 375) {
        const layout = await page.evaluate(() => {
          const copy = document.querySelector(".bs-hero-copy").getBoundingClientRect();
          const art = document.querySelector(".bs-hero-art").getBoundingClientRect();
          const overlap = Math.max(0, Math.min(copy.bottom, art.bottom) - Math.max(copy.top, art.top));
          const escaped = [...document.querySelectorAll("main h1,main h2,main h3,main p,main li,main label,main button")].filter((element) => !element.closest(".bs-filters")).filter((element) => {
            const rect = element.getBoundingClientRect(); return rect.width && (rect.left < -1 || rect.right > innerWidth + 1 || element.scrollWidth > element.clientWidth + 1);
          }).map((element) => `${element.tagName}.${element.className}:${element.textContent.trim().slice(0,30)}`);
          return { overlap, escaped };
        });
        expect(layout.overlap).toBe(0); expect(layout.escaped).toEqual([]);
        if (width === 320) await page.screenshot({path:"test-results/bank-support-mobile-320.png",fullPage:true});
      }
    });
  }

  for (const width of [320, 375, 600, 768, 1024, 1440]) {
    test(`FAQ bank support path fits at ${width}px`, async ({ page }) => {
      await page.setViewportSize({width,height:900}); await page.goto("http://127.0.0.1:4179/faq");
      await expect(page.locator("a[href='/support/bank-connection']").first()).toBeVisible();
      const audit = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        headerGap: Math.round(document.querySelector(".fp-page").getBoundingClientRect().top - document.querySelector(".nm-header").getBoundingClientRect().bottom),
        aggressive: [...document.querySelectorAll("main h1,main h2,main h3,main p,main summary,main a")].filter((element) => {
          const style=getComputedStyle(element); return style.wordBreak === "break-all" || style.overflowWrap === "anywhere";
        }).length,
      }));
      expect(audit.overflow).toBe(0); expect(audit.aggressive).toBe(0); expect(audit.headerGap).toBeGreaterThanOrEqual(4);
      if (width === 320) await page.screenshot({path:"test-results/faq-bank-support-mobile-320.png",fullPage:true});
    });
  }

  test("core guidance remains with JavaScript disabled", async ({ browser }) => {
    const context = await browser.newContext({javaScriptEnabled:false}); const page = await context.newPage();
    await page.goto("http://127.0.0.1:4179/support/bank-connection");
    await expect(page.locator("h1")).toContainText("банк"); await expect(page.locator(".bs-noscript")).toContainText("официальный банк"); await context.close();
  });
});
