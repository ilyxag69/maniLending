import { appendFileSync, createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";

const root = process.cwd();
const port = Number(process.env.PORT || 4179);
const waitlistPositionStart = Math.max(1, Number(process.env.MANI_WAITLIST_POSITION_START || 306));
const waitlistLimit = 1000;
const dataDir = process.env.MANI_DATA_DIR ? resolve(process.env.MANI_DATA_DIR) : join(root, "data");
const waitlistFile = join(dataDir, "waitlist-submissions.jsonl");
const analyticsFile = join(dataDir, "analytics-events.jsonl");
const rateLimitWindowMs = 10 * 60 * 1000;
const rateLimitMax = 20;
const rateLimitHits = new Map();

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8",
  ".jpg": "image/jpeg",
  ".png": "image/png",
};

function resolvePath(urlPath) {
  if (urlPath === "/") return "index.html";
  if (urlPath === "/privacy") return "privacy.html";
  if (urlPath === "/cookie") return "cookie.html";
  if (urlPath === "/bezopasnost") return "bezopasnost.html";
  if (urlPath === "/faq") return "faq.html";
  if (urlPath === "/support/bank-connection" || urlPath === "/support/bank-connection/") return "bank-connection.html";
  if (urlPath === "/soglasie") return "soglasie.html";
  return urlPath.replace(/^\/+/, "");
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 32_000) {
        reject(new Error("Request body is too large"));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    request.on("error", reject);
  });
}

function getSubmissions() {
  if (!existsSync(waitlistFile)) return [];
  return readFileSync(waitlistFile, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => line.replace(/^\uFEFF/, ""))
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function getPublicPosition(record) {
  const position = Number(record?.position) || 0;
  if (position <= 0) return waitlistPositionStart;
  if (record?.positionScheme === "public-v2") return position;
  return position + waitlistPositionStart - 1;
}

function getNextPosition() {
  const highest = Math.max(0, ...getSubmissions().map((item) => getPublicPosition(item)));
  return Math.max(waitlistPositionStart, highest + 1);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function csvCell(value) {
  const text = String(value ?? "");
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

function normalizeStoredPhone(value) {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) return `+${digits}`;
  if (digits.length === 11 && (digits.startsWith("8") || digits.startsWith("7"))) return `+7${digits.slice(1)}`;
  if (digits.length === 10) return `+7${digits}`;
  return raw;
}

function isRateLimited(key) {
  const now = Date.now();
  const current = (rateLimitHits.get(key) || []).filter((stamp) => now - stamp < rateLimitWindowMs);
  current.push(now);
  rateLimitHits.set(key, current);
  return current.length > rateLimitMax;
}

function getQueueStatus(position) {
  if (position <= 100) return "mani inner circle";
  if (position <= 305) return "Closed beta wave";
  if (position <= 500) return "Early crew";
  if (position <= 750) return "Ahead of hype";
  if (position <= 900) return "On time";
  if (position <= 1000) return "Final boarding";
  return "Waiting list";
}

function getReferralCode(position) {
  return `MANI-${String(position).padStart(4, "0")}`;
}

function getUniqueReferralCode(items) {
  const known = new Set(items.map((item) => item.referralCode).filter(Boolean));
  let code;
  do {
    code = `MANI-${randomBytes(16).toString("hex").toUpperCase()}`;
  } while (known.has(code));
  return code;
}

function getReferralCount(items, code) {
  return code ? items.filter((item) => item.referredBy === code).length : 0;
}

function getReferralPayload(record, items) {
  const position = getPublicPosition(record);
  const referralCode = record.referralCode || getReferralCode(position);
  const invitedCount = getReferralCount(items, referralCode);
  const priorityPosition = Math.max(1, position - invitedCount);
  return {
    position,
    priorityPosition,
    referralCode,
    invitedCount,
    status: getQueueStatus(priorityPosition),
  };
}

function cleanAttribution(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(["source", "medium", "campaign", "content", "term"]
    .map((key) => [key, String(value[key] || "").trim().slice(0, 100)]));
}

function getWaitlistStats() {
  const highest = Math.max(0, ...getSubmissions().map((item) => getPublicPosition(item)));
  const registered = Math.min(Math.max(waitlistPositionStart - 1, highest), waitlistLimit);
  const left = Math.max(waitlistLimit - registered, 0);
  const percent = Math.min(Math.round((registered / waitlistLimit) * 100), 100);
  return {
    total: waitlistLimit,
    registered,
    left,
    percent,
  };
}

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  response.end(body);
}

function redirectLocation(target, url) {
  const [path, fragment = ""] = target.split("#", 2);
  return `${path}${url.search}${fragment ? `#${fragment}` : ""}`;
}

createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);

  if (url.pathname.startsWith("/data/")) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  if (url.pathname === "/api/waitlist-stats" && request.method === "GET") {
    sendJson(response, 200, getWaitlistStats());
    return;
  }

  if (url.pathname === "/api/contact" && request.method === "POST") {
    try {
      const body = await readJsonBody(request);
      const topics = new Set(["Предложение", "Техподдержка", "Другое"]);
      const valid = body.website || (
        body.pdnConsent === true &&
        String(body.name || "").trim().length > 0 && String(body.name || "").trim().length <= 80 &&
        String(body.replyTo || "").trim().length > 0 && String(body.replyTo || "").trim().length <= 120 &&
        topics.has(String(body.topic || "")) &&
        String(body.message || "").trim().length >= 10 && String(body.message || "").trim().length <= 3000
      );
      if (!valid) {
        sendJson(response, 422, { message: "Проверь обязательные поля формы" });
        return;
      }
      sendJson(response, 200, { ok: true, message: "Сигнал принят (локальный режим)" });
    } catch {
      sendJson(response, 400, { message: "Некорректный запрос" });
    }
    return;
  }

  if (url.pathname === "/api/analytics" && request.method === "POST") {
    try {
      const body = await readJsonBody(request);
      const events = Array.isArray(body.events) ? body.events.slice(0, 20) : [];
      if (!events.length) {
        sendJson(response, 400, { message: "Invalid event batch" });
        return;
      }
      const allowed = new Set([
        "page_view", "landing_view", "experiment_view", "section_view", "cta_click",
        "navigation_click", "social_click", "tone_switch", "demo_scenario_click",
        "security_detail_open", "waitlist_form_open", "waitlist_form_start",
        "waitlist_phone_focus", "waitlist_submit", "waitlist_success", "form_error",
        "referral_visit", "referral_signup", "referral_link_created", "referral_share",
        "calculator_view", "calculator_start", "calculator_complete", "calculator_share",
        "leak_calculator_change", "cookie_consent", "web_vital", "js_error", "api_error",
        "bank_support_opened", "bank_support_issue_opened", "bank_support_search_used",
        "bank_support_diagnostic_started", "bank_support_recommendation_shown",
        "bank_support_contact_clicked", "bank_support_copy_link", "bank_support_feedback",
        "unknown_support_error",
      ]);
      const clean = events.filter((event) => event && allowed.has(event.name)).map((event) => ({
        ...Object.fromEntries(Object.entries(event).filter(([key]) => [
          "name", "event_id", "occurred_at", "page_path", "session_id", "visitor_id",
          "consent_state", "screen_class", "source", "medium", "campaign", "content",
          "term", "hero_copy_variant", "hero_headline_variant", "cta_location",
          "section", "network", "tone", "control", "field", "action", "share_target",
          "target", "error_type", "status_code", "metric_name", "metric_value",
          "ref_present", "duplicate", "experiment", "variant", "issue_code", "category",
          "bank_slug", "platform", "app_version",
        ].includes(key))),
        received_at: new Date().toISOString(),
      }));
      mkdirSync(dataDir, { recursive: true });
      if (clean.length) appendFileSync(analyticsFile, clean.map((event) => JSON.stringify(event)).join("\n") + "\n", "utf8");
      response.writeHead(204);
      response.end();
    } catch {
      sendJson(response, 400, { message: "Invalid analytics request" });
    }
    return;
  }

  if (url.pathname === "/admin/analytics" && request.method === "GET") {
    const events = existsSync(analyticsFile)
      ? readFileSync(analyticsFile, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line))
      : [];
    const count = (name) => events.filter((event) => event.name === name).length;
    const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Аналитика mani</title>
      <style>body{margin:24px;font-family:Arial,sans-serif;color:#101a2d}section{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}div{padding:20px;border:1px solid #dde6f2;border-radius:14px}strong{display:block;font-size:30px;margin-top:8px}@media(max-width:700px){section{grid-template-columns:1fr 1fr}}</style></head>
      <body><h1>Локальная аналитика</h1><section><div>Просмотры<strong>${count("page_view")}</strong></div><div>CTA<strong>${count("cta_click")}</strong></div><div>Форма<strong>${count("waitlist_form_open")}</strong></div><div>Заявки<strong>${count("waitlist_success")}</strong></div></section></body></html>`;
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(html);
    return;
  }

  if (url.pathname === "/api/waitlist" && request.method === "GET") {
    const code = String(url.searchParams.get("referralCode") || "").trim().toUpperCase();
    if (!code) {
      sendJson(response, 200, getWaitlistStats());
      return;
    }
    const items = getSubmissions();
    const record = items.find((item) => item.referralCode === code);
    if (!record) {
      sendJson(response, 404, { message: "Referral identity not found" });
      return;
    }
    sendJson(response, 200, { ...getReferralPayload(record, items), stats: getWaitlistStats() });
    return;
  }

  if (url.pathname === "/admin/waitlist" && request.method === "GET") {
    const query = (url.searchParams.get("q") || "").trim().toLowerCase();
    const submissions = getSubmissions();
    const visibleSubmissions = query
      ? submissions.filter((item) => JSON.stringify(item).toLowerCase().includes(query))
      : submissions;
    const rows = visibleSubmissions.map((item) => `
      <tr>
        <td>#${escapeHtml(getPublicPosition(item))}</td>
        <td>${escapeHtml(item.phone || "")}</td>
        <td>${escapeHtml(item.email || "")}</td>
        <td>${escapeHtml(item.contactDetails || "")}</td>
        <td>${escapeHtml(item.heroHeadlineVariant === "chaos" ? "Хаос" : item.heroHeadlineVariant === "order" ? "Порядок" : "—")}</td>
        <td>${item.pdnConsent ? "yes" : ""}</td>
        <td>${escapeHtml(item.pdnConsentVersion || "")}</td>
        <td>${escapeHtml(item.referralCode || "")}</td>
        <td>${escapeHtml(item.referredBy || "")}</td>
        <td>${escapeHtml(item.createdAt || "")}</td>
        <td><form method="post" action="/api/waitlist-delete" onsubmit="return confirm('Delete this request?')"><input type="hidden" name="code" value="${escapeHtml(item.referralCode || "")}" /><button>Delete</button></form></td>
      </tr>
    `).join("");
    const html = `<!doctype html>
      <html lang="ru"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>mani waitlist admin</title>
      <style>body{font-family:Inter,Arial,sans-serif;margin:24px;color:#222}table{border-collapse:collapse;width:100%;font-size:14px}td,th{border:1px solid #eee;padding:10px;text-align:left;vertical-align:top}th{background:#f4f4f6}.top{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;gap:16px}.tools{display:flex;gap:10px;align-items:center;flex-wrap:wrap}input{min-height:38px;border:1px solid #ddd;border-radius:10px;padding:0 10px}button,.btn{min-height:38px;border:0;border-radius:10px;background:#fa5d27;color:#fff;padding:0 12px;font-weight:800;text-decoration:none;cursor:pointer}.btn.secondary{background:#f4f4f6;color:#222}a{color:#fa5d27}</style>
      </head><body><div class="top"><h1>Waitlist: ${submissions.length}${query ? ` / found ${visibleSubmissions.length}` : ""}</h1><div class="tools"><form method="get"><input name="q" value="${escapeHtml(query)}" placeholder="Search phone, email, code" /><button>Search</button></form><a class="btn secondary" href="/admin/waitlist">Reset</a><a class="btn secondary" href="/api/waitlist-export">JSONL</a><a class="btn secondary" href="/api/waitlist-export?format=csv">CSV</a></div></div>
      <table><thead><tr><th>Место</th><th>Телефон</th><th>Email</th><th>Комментарий / канал связи</th><th>Заголовок</th><th>Согласие</th><th>Версия согласия</th><th>Код</th><th>Пригласил</th><th>Дата</th><th></th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(html);
    return;
  }

  if (url.pathname === "/api/waitlist-export" && request.method === "GET") {
    if (url.searchParams.get("format") === "csv") {
      const columns = ["position", "phone", "email", "contactDetails", "heroHeadlineVariant", "pdnConsent", "pdnConsentVersion", "referralCode", "referredBy", "createdAt", "page"];
      const body = [
        columns.join(","),
        ...getSubmissions().map((item) => columns.map((column) => csvCell(
          column === "position" ? getPublicPosition(item) : item[column]
        )).join(",")),
      ].join("\n");
      response.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=\"waitlist-submissions.csv\"",
      });
      response.end(body);
      return;
    }
    if (!existsSync(waitlistFile)) {
      response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("");
      return;
    }
    response.writeHead(200, {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"waitlist-submissions.jsonl\"",
    });
    createReadStream(waitlistFile).pipe(response);
    return;
  }

  if (url.pathname === "/api/waitlist-delete" && request.method === "POST") {
    let body = "";
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => {
      const params = new URLSearchParams(body);
      const code = String(params.get("code") || "").trim();
      const kept = getSubmissions().filter((item) => item.referralCode !== code);
      mkdirSync(dataDir, { recursive: true });
      writeFileSync(waitlistFile, kept.map((item) => JSON.stringify(item)).join("\n") + (kept.length ? "\n" : ""), "utf8");
      response.writeHead(303, { Location: "/admin/waitlist" });
      response.end();
    });
    return;
  }

  if (url.pathname === "/api/waitlist" && request.method === "POST") {
    try {
      const body = await readJsonBody(request);
      const phone = String(body.phone || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const contact = String(body.contact || "manual").trim();
      const contactDetails = String(body.contactDetails || "").trim();
      const company = String(body.company || "").trim();
      const pdnConsent = body.pdnConsent === true;
      const pdnConsentVersion = String(body.pdnConsentVersion || "").trim();
      const pdnConsentAt = String(body.pdnConsentAt || "").trim();
      const referredBy = String(body.ref || "").trim().toUpperCase();
      const page = String(body.page || "").trim();
      const idempotencyKey = String(request.headers["idempotency-key"] || body.idempotencyKey || "").trim();
      const heroHeadlineVariant = String(body.heroHeadlineVariant || "").trim().toLowerCase();
      const firstTouch = cleanAttribution(body.firstTouch);
      const lastTouch = cleanAttribution(body.lastTouch);
      const rateKey = request.socket.remoteAddress || "local";

      if (company) {
        sendJson(response, 400, { message: "Bot request rejected" });
        return;
      }
      if (idempotencyKey && !/^[A-Za-z0-9-]{16,100}$/.test(idempotencyKey)) {
        sendJson(response, 400, { message: "Invalid idempotency key" });
        return;
      }
      if (heroHeadlineVariant && !["chaos", "order"].includes(heroHeadlineVariant)) {
        sendJson(response, 400, { message: "Invalid hero headline variant" });
        return;
      }
      if (
        contactDetails.length > 500 ||
        page.length > 300 ||
        referredBy.length > 64 ||
        pdnConsentVersion.length > 100 ||
        pdnConsentAt.length > 50
      ) {
        sendJson(response, 400, { message: "One or more fields are too long" });
        return;
      }

      mkdirSync(dataDir, { recursive: true });
      const submissions = getSubmissions();
      const idempotent = idempotencyKey && submissions.find((item) => item.idempotencyKey === idempotencyKey);
      if (idempotent) {
        sendJson(response, 200, {
          ...getReferralPayload(idempotent, submissions),
          duplicate: true,
          stats: getWaitlistStats(),
          referredByAccepted: Boolean(idempotent.referredBy),
        });
        return;
      }

      if (isRateLimited(rateKey)) {
        sendJson(response, 429, { message: "Too many requests. Try again later." });
        return;
      }

      if (!/^\+\d{10,15}$/.test(phone) || (email && !email.includes("@"))) {
        sendJson(response, 400, { message: "Valid international phone is required. Email must be valid if provided." });
        return;
      }

      if (!pdnConsent) {
        sendJson(response, 400, { message: "Personal data consent is required." });
        return;
      }

      const existing = submissions.find((item) => normalizeStoredPhone(item.phone) === normalizeStoredPhone(phone) || (email && item.email === email));
      if (existing) {
        sendJson(response, 200, {
          ...getReferralPayload(existing, submissions),
          duplicate: true,
          stats: getWaitlistStats(),
          referredByAccepted: false,
        });
        return;
      }

      const position = getNextPosition();
      const referrer = submissions.find((item) => item.referralCode === referredBy);
      const acceptedReferrer = referrer ? referredBy : "";
      const record = {
        position,
        positionScheme: "public-v2",
        status: getQueueStatus(position),
        referralCode: getUniqueReferralCode(submissions),
        referredBy: acceptedReferrer,
        phone,
        email,
        contact,
        contactDetails,
        pdnConsent,
        pdnConsentVersion,
        pdnConsentAt,
        page,
        idempotencyKey,
        heroHeadlineVariant,
        firstTouch,
        lastTouch,
        createdAt: new Date().toISOString(),
      };
      appendFileSync(waitlistFile, `${JSON.stringify(record)}\n`, "utf8");
      sendJson(response, 200, {
        ...getReferralPayload(record, [...submissions, record]),
        stats: getWaitlistStats(),
        referredByAccepted: Boolean(acceptedReferrer),
      });
    } catch (error) {
      sendJson(response, 500, { message: error.message || "Waitlist request failed" });
    }
    return;
  }

  if (url.pathname === "/privacy.html") {
    response.writeHead(301, { Location: redirectLocation("/privacy", url) });
    response.end();
    return;
  }

  if (url.pathname === "/index.html") {
    response.writeHead(301, { Location: redirectLocation("/", url) });
    response.end();
    return;
  }

  if (url.pathname === "/cookie.html") {
    response.writeHead(301, { Location: redirectLocation("/cookie", url) });
    response.end();
    return;
  }

  if (url.pathname === "/cookies" || url.pathname === "/cookies.html") {
    response.writeHead(301, { Location: redirectLocation("/cookie", url) });
    response.end();
    return;
  }

  if (url.pathname === "/bezopasnost.html") {
    response.writeHead(301, { Location: redirectLocation("/bezopasnost", url) });
    response.end();
    return;
  }

  if (url.pathname === "/pervye-1000" || url.pathname === "/pervye-1000.html") {
    response.writeHead(301, { Location: redirectLocation("/#early-access", url) });
    response.end();
    return;
  }

  if (url.pathname === "/faq.html") {
    response.writeHead(301, { Location: redirectLocation("/faq", url) });
    response.end();
    return;
  }

  if (url.pathname === "/consent" || url.pathname === "/consent.html" || url.pathname === "/soglasie.html") {
    response.writeHead(301, { Location: redirectLocation("/soglasie", url) });
    response.end();
    return;
  }

  const relativePath = normalize(resolvePath(url.pathname));
  if (relativePath.startsWith("..")) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  const filePath = join(root, relativePath);
  if (!existsSync(filePath)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const stats = statSync(filePath);
  response.writeHead(200, {
    "Content-Type": types[extname(filePath)] || "application/octet-stream",
    "Content-Length": stats.size,
  });

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  createReadStream(filePath).pipe(response);
}).listen(port, "127.0.0.1", () => {
  console.log(`Local mani server: http://127.0.0.1:${port}`);
});
