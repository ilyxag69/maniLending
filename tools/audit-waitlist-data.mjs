import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const file = resolve(process.argv[2] || "data/waitlist-submissions.jsonl");
const positionStart = Math.max(1, Number(process.env.MANI_WAITLIST_POSITION_START || 306));
const contents = await readFile(file, "utf8");
const lines = contents.split(/\r?\n/).filter(Boolean);
const malformed = [];
const rows = [];

lines.forEach((line, index) => {
  try {
    rows.push({ line: index + 1, record: JSON.parse(line.replace(/^\uFEFF/, "")) });
  } catch {
    malformed.push(index + 1);
  }
});

function duplicates(values) {
  const counts = new Map();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value, count]) => ({ value, count }));
}

function publicPosition(record) {
  const stored = Number(record.position) || 0;
  if (stored <= 0) return positionStart;
  return record.positionScheme === "public-v2" ? stored : stored + positionStart - 1;
}

const ambiguous = rows
  .filter(({ record }) => !record.positionScheme && Number(record.position) >= positionStart)
  .map(({ line, record }) => ({ line, position: record.position, createdAt: record.createdAt || "" }));
const report = {
  file,
  lines: lines.length,
  validRows: rows.length,
  malformedLines: malformed,
  ambiguousUnmarkedPositions: ambiguous,
  duplicatePublicPositions: duplicates(rows.map(({ record }) => publicPosition(record))),
  duplicateReferralCodes: duplicates(rows.map(({ record }) => record.referralCode)),
  duplicateIdempotencyKeys: duplicates(rows.map(({ record }) => record.idempotencyKey)),
  duplicateNormalizedPhones: duplicates(rows.map(({ record }) => String(record.phone || "").replace(/\D/g, ""))),
  requestFingerprintRows: rows.filter(({ record }) => record.requestFingerprint).map(({ line }) => line),
  rawIpRows: rows.filter(({ record }) => record.ip || record.remoteAddress).map(({ line }) => line),
};

console.log(JSON.stringify(report, null, 2));

if (
  malformed.length ||
  ambiguous.length ||
  report.duplicatePublicPositions.length ||
  report.duplicateReferralCodes.length ||
  report.duplicateIdempotencyKeys.length ||
  report.duplicateNormalizedPhones.length
) {
  process.exitCode = 1;
}
