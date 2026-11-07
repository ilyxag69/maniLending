import test from "node:test";
import assert from "node:assert/strict";

const base = new URL(process.env.SITE_URL || "http://127.0.0.1:4189");
if (!["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)) throw new Error("Review checks must run locally");

test("review assets are absent from the normal page", async () => {
  const response = await fetch(base);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.doesNotMatch(html, /src="\/tools\/web-beta-review\.js"/);
  assert.doesNotMatch(html, /href="\/tools\/web-beta-review\.css"/);
  assert.match(html, /href="https:\/\/webapp\.moimani\.ai\/"[^>]*data-product-cta/);
});

test("review injection is opt-in and keeps the correct byte length", async () => {
  const url = new URL("/?review=web-beta", base);
  const response = await fetch(url);
  const html = await response.text();
  assert.match(html, /src="\/tools\/web-beta-review\.js"/);
  assert.match(html, /href="\/tools\/web-beta-review\.css"/);
  assert.equal(Number(response.headers.get("content-length")), Buffer.byteLength(html));
  const head = await fetch(url, { method: "HEAD" });
  assert.equal(head.headers.get("content-length"), response.headers.get("content-length"));
  assert.equal(await head.text(), "");
});

test("all content routes offer a review without changing notification actions", async () => {
  const sitemap = await (await fetch(new URL("/sitemap.xml", base))).text();
  const routes = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
  assert.equal(routes.length, 22);
  for (const path of routes) {
    const response = await fetch(new URL(`${path}?review=web-beta`, base));
    const html = await response.text();
    assert.equal(response.status, 200, path);
    assert.match(html, /src="\/tools\/web-beta-review\.js"/, path);
    assert.match(html, /data-release-change=/, path);
    assert.match(html, /href="https:\/\/webapp\.moimani\.ai\/"[^>]*data-product-cta/, path);
  }
});

test("review UI is local-only and never annotates external links", async () => {
  const code = await (await fetch(new URL("/tools/web-beta-review.js", base))).text();
  assert.match(code, /location\.hostname/);
  assert.match(code, /destination\.origin !== location\.origin/);
  assert.match(code, /link === normalLink/);
  assert.match(code, /get\("review"\) !== "web-beta"/);
});
