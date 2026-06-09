import { appendFileSync, createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { createServer } from "node:http";

const root = process.cwd();
const port = Number(process.env.PORT || 4179);
const waitlistBaseCount = 0;
const waitlistLimit = 1000;
const dataDir = join(root, "data");
const waitlistFile = join(dataDir, "waitlist-submissions.jsonl");
const rateLimitWindowMs = 10 * 60 * 1000;
const rateLimitMax = 5;
const rateLimitHits = new Map();

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
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
  if (urlPath === "/pervye-1000") return "pervye-1000.html";
  if (urlPath === "/faq") return "faq.html";
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

function getSubmissionCount() {
  if (!existsSync(waitlistFile)) return 0;
  return readFileSync(waitlistFile, "utf8").split("\n").filter(Boolean).length;
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

function getNextPosition() {
  return Math.max(0, ...getSubmissions().map((item) => Number(item.position) || 0)) + 1;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
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
  if (position <= 100) return "Founding users";
  if (position <= 500) return "Early crew";
  if (position <= 1000) return "Last free access";
  return "Waiting list";
}

function getReferralCode(position) {
  return `MANI-${String(position).padStart(4, "0")}`;
}

function getWaitlistStats() {
  const registered = Math.min(waitlistBaseCount + getSubmissionCount(), waitlistLimit);
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

  if (url.pathname === "/admin/waitlist" && request.method === "GET") {
    const query = (url.searchParams.get("q") || "").trim().toLowerCase();
    const submissions = getSubmissions();
    const visibleSubmissions = query
      ? submissions.filter((item) => JSON.stringify(item).toLowerCase().includes(query))
      : submissions;
    const rows = visibleSubmissions.map((item) => `
      <tr>
        <td>#${escapeHtml(item.position)}</td>
        <td>${escapeHtml(item.phone || "")}</td>
        <td>${escapeHtml(item.email || "")}</td>
        <td>${escapeHtml(item.contactDetails || "")}</td>
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
      <title>Mani.ai waitlist admin</title>
      <style>body{font-family:Inter,Arial,sans-serif;margin:24px;color:#222}table{border-collapse:collapse;width:100%;font-size:14px}td,th{border:1px solid #eee;padding:10px;text-align:left;vertical-align:top}th{background:#f4f4f6}.top{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;gap:16px}.tools{display:flex;gap:10px;align-items:center;flex-wrap:wrap}input{min-height:38px;border:1px solid #ddd;border-radius:10px;padding:0 10px}button,.btn{min-height:38px;border:0;border-radius:10px;background:#fa5d27;color:#fff;padding:0 12px;font-weight:800;text-decoration:none;cursor:pointer}.btn.secondary{background:#f4f4f6;color:#222}a{color:#fa5d27}</style>
      </head><body><div class="top"><h1>Waitlist: ${submissions.length}${query ? ` / found ${visibleSubmissions.length}` : ""}</h1><div class="tools"><form method="get"><input name="q" value="${escapeHtml(query)}" placeholder="Search phone, email, code" /><button>Search</button></form><a class="btn secondary" href="/admin/waitlist">Reset</a><a class="btn secondary" href="/api/waitlist-export">JSONL</a><a class="btn secondary" href="/api/waitlist-export?format=csv">CSV</a></div></div>
      <table><thead><tr><th>Место</th><th>Телефон</th><th>Email</th><th>Комментарий / канал связи</th><th>Согласие</th><th>Версия согласия</th><th>Код</th><th>Пригласил</th><th>Дата</th><th></th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(html);
    return;
  }

  if (url.pathname === "/api/waitlist-export" && request.method === "GET") {
    if (url.searchParams.get("format") === "csv") {
      const columns = ["position", "phone", "email", "contactDetails", "pdnConsent", "pdnConsentVersion", "referralCode", "referredBy", "createdAt", "page"];
      const body = [
        columns.join(","),
        ...getSubmissions().map((item) => columns.map((column) => csvCell(item[column])).join(",")),
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
      const referredBy = String(body.ref || "").trim();
      const page = String(body.page || "").trim();
      const rateKey = request.socket.remoteAddress || "local";

      if (company) {
        sendJson(response, 400, { message: "Bot request rejected" });
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

      mkdirSync(dataDir, { recursive: true });
      const existing = getSubmissions().find((item) => normalizeStoredPhone(item.phone) === normalizeStoredPhone(phone) || (email && item.email === email));
      if (existing) {
        sendJson(response, 200, {
          duplicate: true,
          position: existing.position,
          referralCode: existing.referralCode || getReferralCode(existing.position),
          status: getQueueStatus(existing.position),
          stats: getWaitlistStats(),
        });
        return;
      }

      const position = waitlistBaseCount + getNextPosition();
      const record = {
        position,
        status: getQueueStatus(position),
        referralCode: getReferralCode(position),
        referredBy,
        phone,
        email,
        contact,
        contactDetails,
        pdnConsent,
        pdnConsentVersion,
        pdnConsentAt,
        page,
        createdAt: new Date().toISOString(),
        userAgent: request.headers["user-agent"] || "",
      };
      appendFileSync(waitlistFile, `${JSON.stringify(record)}\n`, "utf8");
      sendJson(response, 200, {
        position,
        referralCode: record.referralCode,
        status: record.status,
        stats: getWaitlistStats(),
      });
    } catch (error) {
      sendJson(response, 500, { message: error.message || "Waitlist request failed" });
    }
    return;
  }

  if (url.pathname === "/privacy.html") {
    response.writeHead(301, { Location: "/privacy" });
    response.end();
    return;
  }

  if (url.pathname === "/cookie.html") {
    response.writeHead(301, { Location: "/cookie" });
    response.end();
    return;
  }

  if (url.pathname === "/bezopasnost.html") {
    response.writeHead(301, { Location: "/bezopasnost" });
    response.end();
    return;
  }

  if (url.pathname === "/pervye-1000.html") {
    response.writeHead(301, { Location: "/pervye-1000" });
    response.end();
    return;
  }

  if (url.pathname === "/faq.html") {
    response.writeHead(301, { Location: "/faq" });
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
  console.log(`Local Mani.ai server: http://127.0.0.1:${port}`);
});
