import assert from "node:assert/strict";
import { bankConnectionIssues, bankIssueByCode, searchableIssueText } from "../support/bank-connection-issues.js";
import { diagnosticContainsForbiddenKeys, sanitizeBankSupportDiagnostic } from "../support/bank-support-diagnostics.js";
import { mapBankTechnicalState } from "../support/bank-status-mapper.js";

assert.equal(bankConnectionIssues.length, 26);
assert.equal(new Set(bankConnectionIssues.map(({code}) => code)).size, 26);
for (const issue of bankConnectionIssues) {
  assert.ok(issue.code && issue.slug && issue.title && issue.shortAnswer && issue.category);
  assert.ok(issue.steps.length >= 3);
  assert.equal(issue.analyticsKey, issue.code);
}
assert.ok(searchableIssueText(bankIssueByCode.get("sms_not_received")).includes("sms"));
const safe = sanitizeBankSupportDiagnostic({incidentId:"abc",password:"secret",otp:"1234",bankSlug:"sber",vpnReported:true});
assert.deepEqual(safe, {incidentId:"abc",bankSlug:"sber"});
assert.equal(diagnosticContainsForbiddenKeys(safe), false);
assert.equal(mapBankTechnicalState({updateStatus:"already_started"}), "already_updating");
assert.equal(mapBankTechnicalState({updateStatus:"in_use"}), "profile_in_use");
assert.equal(mapBankTechnicalState({profileStatus:"ok",updateStatus:"ok"}), null);
console.log("bank support unit checks passed");
