import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const phpCgi = resolve(process.argv[2] || process.env.PHP_CGI || "php-cgi");
const root = process.cwd();
const script = join(root, "api", "waitlist.php");
const dataDir = await mkdtemp(join(tmpdir(), "mani-php-concurrency-"));
const dataFile = join(dataDir, "waitlist-submissions.jsonl");
const origin = "https://moimani.ai";
const salt = "concurrency-test-only-" + "a".repeat(64);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runCgi(body, remoteAddress, extraEnvironment = {}) {
  const raw = JSON.stringify(body);
  return new Promise((resolvePromise, reject) => {
    const child = spawn(phpCgi, [], {
      cwd: root,
      env: {
        ...process.env,
        REDIRECT_STATUS: "1",
        GATEWAY_INTERFACE: "CGI/1.1",
        SERVER_PROTOCOL: "HTTP/1.1",
        SERVER_NAME: "moimani.ai",
        SERVER_PORT: "443",
        REQUEST_METHOD: "POST",
        SCRIPT_FILENAME: script,
        SCRIPT_NAME: "/api/waitlist.php",
        CONTENT_TYPE: "application/json",
        CONTENT_LENGTH: String(Buffer.byteLength(raw)),
        HTTP_ORIGIN: origin,
        HTTP_IDEMPOTENCY_KEY: body.idempotencyKey,
        HTTP_USER_AGENT: "ManiConcurrencyAudit/1.0",
        REMOTE_ADDR: remoteAddress,
        MANI_ALLOWED_ORIGINS: origin,
        MANI_DATA_DIR: dataDir,
        MANI_REFERRAL_SALT: salt,
        MANI_WAITLIST_POSITION_START: "306",
        ...extraEnvironment,
      },
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("php-cgi request timed out"));
    }, 30000);
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(`php-cgi exited ${code}: ${stderr || stdout}`));
        return;
      }
      const separator = stdout.search(/\r?\n\r?\n/);
      const payload = separator >= 0 ? stdout.slice(separator).trim() : stdout.trim();
      try {
        resolvePromise(JSON.parse(payload));
      } catch {
        reject(new Error(`Invalid CGI JSON: ${stdout}\n${stderr}`));
      }
    });
    child.stdin.end(raw);
  });
}

function submission(index, overrides = {}) {
  return {
    phone: `+7999${String(index).padStart(7, "0")}`,
    email: "",
    contact: "manual",
    contactDetails: "",
    company: "",
    pdnConsent: true,
    pdnConsentVersion: "audit-v1",
    pdnConsentAt: new Date().toISOString(),
    ref: "",
    page: "/",
    idempotencyKey: `audit-${String(index).padStart(24, "0")}`,
    firstTouch: { source: "concurrency-audit" },
    lastTouch: { source: "concurrency-audit" },
    ...overrides,
  };
}

async function readRows() {
  const contents = await readFile(dataFile, "utf8");
  const lines = contents.split(/\r?\n/).filter(Boolean);
  return {
    contents,
    lines,
    rows: lines.map((line, index) => {
      try {
        return JSON.parse(line);
      } catch {
        throw new Error(`Corrupted JSONL line ${index + 1}: ${line}`);
      }
    }),
  };
}

try {
  await writeFile(dataFile, `${JSON.stringify({
    position: 1,
    referralCode: "MANI-LEGACY1",
    phone: "+79990000999",
    createdAt: "2026-06-08T00:00:00.000Z",
  })}\n`, "utf8");

  const uniqueResults = await Promise.all(
    Array.from({ length: 60 }, (_, index) =>
      runCgi(submission(index + 1), `198.51.100.${(index % 200) + 1}`)
    )
  );
  assert(uniqueResults.every((result) => result.position >= 307), "A unique request returned an invalid position");

  let snapshot = await readRows();
  assert(snapshot.lines.length === 61, `Expected 61 rows after unique burst, got ${snapshot.lines.length}`);
  assert(snapshot.contents.endsWith("\n"), "JSONL does not end with a newline");
  const created = snapshot.rows.filter((row) => row.positionScheme === "public-v2");
  assert(created.length === 60, `Expected 60 public-v2 rows, got ${created.length}`);
  assert(new Set(created.map((row) => row.position)).size === 60, "Duplicate queue positions detected");
  assert(Math.min(...created.map((row) => row.position)) === 307, "First new position is not 307");
  assert(Math.max(...created.map((row) => row.position)) === 366, "Last new position is not 366");
  assert(new Set(created.map((row) => row.idempotencyKey)).size === 60, "Duplicate idempotency keys detected");
  assert(new Set(created.map((row) => row.referralCode)).size === 60, "Duplicate referral codes detected");

  const sharedKey = "audit-idempotency-shared-000001";
  const idempotentResults = await Promise.all(
    Array.from({ length: 25 }, (_, index) =>
      runCgi(
        submission(1000, { idempotencyKey: sharedKey }),
        `203.0.113.${(index % 200) + 1}`
      )
    )
  );
  assert(new Set(idempotentResults.map((result) => result.position)).size === 1, "Idempotent burst returned different positions");
  assert(idempotentResults.filter((result) => result.duplicate !== true).length === 1, "Idempotent burst created more than one original response");

  const duplicatePhoneResults = await Promise.all(
    Array.from({ length: 25 }, (_, index) =>
      runCgi(
        submission(2000, { idempotencyKey: `audit-phone-${String(index).padStart(20, "0")}` }),
        `192.0.2.${(index % 200) + 1}`
      )
    )
  );
  assert(new Set(duplicatePhoneResults.map((result) => result.position)).size === 1, "Duplicate-contact burst returned different positions");

  snapshot = await readRows();
  assert(snapshot.lines.length === 63, `Expected 63 final rows, got ${snapshot.lines.length}`);
  assert(snapshot.rows.filter((row) => row.idempotencyKey === sharedKey).length === 1, "Shared idempotency key was written more than once");
  assert(snapshot.rows.filter((row) => row.phone === "+79990002000").length === 1, "Duplicate phone was written more than once");

  const blockedOrigin = await runCgi(
    submission(2500),
    "192.0.2.250",
    { HTTP_ORIGIN: "https://attacker.example" }
  );
  assert(blockedOrigin.message === "Request origin is not allowed", "Invalid Origin was not rejected");
  const missingSalt = await runCgi(
    submission(2501),
    "192.0.2.251",
    { MANI_REFERRAL_SALT: "" }
  );
  assert(missingSalt.message === "Waitlist is temporarily unavailable", "Missing salt did not fail closed");

  const untrustedProxyResults = await Promise.all(
    Array.from({ length: 21 }, (_, index) =>
      runCgi(
        submission(3000 + index),
        "198.18.0.1",
        { HTTP_X_FORWARDED_FOR: `203.0.113.${index + 1}` }
      )
    )
  );
  assert(
    untrustedProxyResults.filter((result) => result.message === "Too many requests. Try again later.").length === 1,
    "Untrusted X-Forwarded-For bypassed the rate limit"
  );

  const trustedProxyResults = await Promise.all(
    Array.from({ length: 21 }, (_, index) =>
      runCgi(
        submission(4000 + index),
        "198.18.0.2",
        {
          HTTP_X_FORWARDED_FOR: `203.0.114.${index + 1}`,
          MANI_TRUSTED_PROXY_IPS: "198.18.0.2",
        }
      )
    )
  );
  assert(
    trustedProxyResults.every((result) => !result.message),
    "Configured trusted proxy did not use distinct forwarded client addresses"
  );

  snapshot = await readRows();
  assert(snapshot.lines.length === 104, `Expected 104 final rows, got ${snapshot.lines.length}`);
  const finalPositions = snapshot.rows
    .filter((row) => row.positionScheme === "public-v2")
    .map((row) => row.position);
  assert(new Set(finalPositions).size === finalPositions.length, "Final JSONL contains duplicate public-v2 positions");

  console.log(JSON.stringify({
    result: "PASS",
    uniqueParallelRequests: 60,
    idempotentParallelRetries: 25,
    duplicateContactParallelRequests: 25,
    rejectedOrigins: 1,
    missingSaltRejected: 1,
    untrustedProxyRequests: 21,
    trustedProxyRequests: 21,
    totalProcesses: 154,
    validJsonlLines: snapshot.lines.length,
    corruptedLines: 0,
    duplicateIdempotencyKeys: 0,
    duplicateQueuePositions: 0,
    duplicateContacts: 0,
    positionRange: [Math.min(...finalPositions), Math.max(...finalPositions)],
  }, null, 2));
} finally {
  await rm(dataDir, { recursive: true, force: true });
}
