import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const source = readFileSync(new URL('../analytics-client.js', import.meta.url), 'utf8');
const storage = () => {
  const values = new Map([['maniCookieConsent', 'necessary']]);
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};
function page(url, referrer = '', local = storage(), session = storage(), responses = [true]) {
  const requests = [];
  const context = {
    location: new URL(url), localStorage: local, sessionStorage: session,
    URL, URLSearchParams, crypto: { randomUUID },
    innerWidth: 390, screen: { width: 390 }, navigator: {},
    setTimeout: () => 1, clearTimeout: () => {}, addEventListener: () => {},
    document: { referrer, documentElement: { dataset: {} },
      createElement: () => ({}), head: { appendChild() {} }, addEventListener() {} },
    fetch: async (url, options) => {
      requests.push({ url, ...JSON.parse(options.body) });
      return { ok: responses.length > 1 ? responses.shift() : responses[0] };
    },
  };
  context.window = context;
  vm.runInNewContext(source, context);
  return { api: context.ManiAnalytics, requests, local, session };
}

test('UTM survives guide to home navigation and direct return', async () => {
  const entry = page('https://moimani.ai/poisk-podpisok?utm_source=instagram&utm_medium=organic_social&utm_campaign=test');
  const home = page('https://moimani.ai/', 'https://moimani.ai/poisk-podpisok', entry.local, entry.session);
  home.api.track('cta_click', { cta_location: 'guide' });
  await home.api.flush();
  assert.equal(home.requests[0].events[1].source, 'instagram');
  assert.equal(home.requests[0].events[1].campaign, 'test');
  assert.equal(home.api.sessionId, entry.api.sessionId);
  assert.equal(page('https://moimani.ai/', '', entry.local).api.attribution().source, 'instagram');
});

test('new campaign updates last touch without rewriting first touch', () => {
  const entry = page('https://moimani.ai/?utm_source=youtube');
  const later = page('https://moimani.ai/?utm_source=telegram&utm_campaign=launch', '', entry.local);
  assert.equal(later.api.attribution().source, 'telegram');
  assert.equal(JSON.parse(entry.local.getItem('maniAttributionFirstV1')).source, 'youtube');
});

test('search referrer survives internal navigation including www hostname', () => {
  const entry = page('https://moimani.ai/poisk-podpisok', 'https://yandex.ru/search/');
  const home = page('https://moimani.ai/', 'https://www.moimani.ai/poisk-podpisok', entry.local);
  assert.equal(home.api.attribution().source, 'yandex.ru');
});

test('delivery retry preserves event IDs and successful flush clears queue', async () => {
  const run = page('https://moimani.ai/', '', storage(), storage(), [false, true]);
  await run.api.flush();
  await run.api.flush();
  assert.equal(run.requests.length, 2);
  assert.equal(run.requests[0].events[0].event_id, run.requests[1].events[0].event_id);
  await run.api.flush();
  assert.equal(run.requests.length, 2);
});

test('financial input and unknown fields never enter analytics payload', async () => {
  const run = page('https://moimani.ai/poisk-podpisok');
  run.api.track('calculator_complete', { section: 'subscriptions_calculator', amount: 499, subscriptionName: 'private', email: 'private@example.test' });
  await run.api.flush();
  const event = run.requests[0].events[1];
  assert.equal(event.section, 'subscriptions_calculator');
  for (const key of ['amount', 'subscriptionName', 'email']) assert.equal(key in event, false);
});
