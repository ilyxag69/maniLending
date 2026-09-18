import { readFile } from "node:fs/promises";
import vm from "node:vm";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";

// Entirely synthetic: no requests to production or third-party analytics
const code = await readFile("analytics-client.js", "utf8");
const store = (initial = {}) => {
  const data = new Map(Object.entries(initial));
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};
function client({ storage = store(), search = "", referrer = "", fetchOk = true, beacon = false } = {}) {
  const scripts = [], bodies = [], timers = new Map();
  let sequence = 0;
  const ctx = {
    localStorage: storage, sessionStorage: store(), crypto: webcrypto,
    URL, URLSearchParams, Blob, console,
    location: { hostname: "moimani.ai", pathname: "/faq", search },
    document: {
      referrer, visibilityState: "visible", documentElement: { dataset: {} },
      createElement: () => ({}), getElementById: () => null,
      getElementsByTagName: () => [{ parentNode: { insertBefore: s => scripts.push(s) } }],
      head: { appendChild: s => scripts.push(s) }, addEventListener() {},
    },
    navigator: { sendBeacon: () => beacon },
    setTimeout: fn => { const id = ++sequence; timers.set(id, fn); return id; },
    clearTimeout: id => timers.delete(id),
    fetch: async (url, options) => { bodies.push(JSON.parse(options.body)); return { ok: fetchOk }; },
    addEventListener() {}, innerWidth: 390, screen: { width: 390 },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return { ctx, scripts, bodies, timers, api: ctx.ManiAnalytics };
}
let passed = 0;
function check(condition, label) { assert.ok(condition, label); console.log("PASS", label); passed++; }
const storage = store();
let c = client({ storage, search: "?utm_source=instagram&utm_medium=social&utm_campaign=launch" });
check(c.api.attribution().source === "instagram", "UTM entry captured");
c = client({ storage, referrer: "https://www.moimani.ai/" });
check(c.api.attribution().source === "instagram", "internal navigation preserves acquisition");
c = client({ storage });
check(c.api.attribution().campaign === "launch", "direct return preserves known campaign");
c = client({ storage, search: "?utm_source=youtube&utm_campaign=video" });
check(c.api.attribution().source === "youtube", "new campaign replaces last touch");
check(JSON.parse(storage.getItem("maniAttributionFirstV1")).source === "instagram", "first touch preserved");
c = client({ referrer: "https://example.org/article" });
check(c.api.attribution().source === "example.org", "external referrer captured without full URL");
check(c.scripts.length === 4, "one loader each for GA, Metrica, Mail and local vitals");
c.api.loadExternal(); vm.runInContext(code, c.ctx);
check(c.scripts.length === 4, "repeat initialization does not duplicate scripts");
c = client({ storage: store({ maniCookieConsent: "necessary" }) });
check(c.scripts.length === 1 && c.scripts[0].src.startsWith("/vendor/"), "legacy explicit opt-out respected");
c = client({ fetchOk: false });
await c.api.flush(true);
check(c.bodies.length === 1, "rejected beacon falls back to fetch");
const eventId = c.bodies[0].events[0].event_id;
await c.api.flush(); await c.api.flush(); await c.api.flush();
check(c.bodies.length === 3 && c.bodies.every(b => b.events[0].event_id === eventId), "bounded retries retain stable event IDs");
c = client();
c.api.track("waitlist_success", { phone: "synthetic", email: "synthetic", message: "synthetic", duplicate: false });
await c.api.flush();
check(!JSON.stringify(c.bodies).includes("synthetic"), "PII fields never reach analytics payload");
check(c.bodies[0].events.at(-1).duplicate === false, "conversion dimensions retained");
c = client({ beacon: true });
await c.api.flush(true); await c.api.flush();
check(c.bodies.length === 0, "accepted beacon removes delivered batch");
const handlers = {};
c = client();
c.ctx.webVitals = Object.fromEntries(["LCP", "CLS", "INP"].map(name => ["on"+name, handler => { handlers[name] = handler; }]));
c.scripts.find(s => s.src.startsWith("/vendor/")).onload();
check(Object.keys(handlers).length === 3, "official Web Vitals callbacks registered");
handlers.INP({ name: "INP", value: 120 });
await c.api.flush();
check(c.bodies.flatMap(b => b.events).some(e => e.name === "web_vital" && e.metric_value === 120), "Web Vitals values transmitted without DOM attribution");
const script = await readFile("script.js", "utf8");
const goalFn = script.match(/function getWaitlistConversionGoal\(ctaLocation\) \{[\s\S]*?\n\}/)[0];
const goals = vm.runInNewContext(goalFn + '; ["hero","header","external-page","test-drive","final"].map(getWaitlistConversionGoal)');
check(JSON.stringify(goals) === JSON.stringify(["form1","form1","form1","form2","form3"]), "legacy campaign goal mapping preserved");
const backend = await readFile("api/analytics-lib.php", "utf8");
check(["waitlist_duplicate","signal_example_open","demo_share"].every(e => backend.includes("'"+e+"'")), "backend accepts added events");
check(script.includes('if (!data.duplicate) trackWaitlistConversion(payload.ctaLocation);'), "duplicate cannot fire advertising conversion");
check(script.includes('location.hash !== "#waitlist-dialog"'), "direct CTA route opens launch form");
console.log("Release regression checks passed:", passed);
