/** @typedef {{incidentId?:string,maniUserId?:string,providerKey?:string,bankSlug?:string,platform?:string,osVersion?:string,appVersion?:string,occurredAt?:string,timezone?:string,normalizedErrorCode?:string,profileStatus?:string,updateStage?:string,updateStartedAt?:string,lastSuccessfulUpdateAt?:string,hasPartialFailure?:boolean,connectionType?:string,vpnReported?:boolean,source?:string,correlationId?:string}} SafeBankSupportDiagnostic */

export const forbiddenDiagnosticKeys = new Set([
  "password", "otp", "smscode", "pin", "cvv", "cvc", "fullcardnumber", "accountnumber",
  "authdata", "accesstoken", "refreshtoken", "banksessiontoken",
]);

const allowedDiagnosticKeys = new Set([
  "incidentId", "maniUserId", "providerKey", "bankSlug", "platform", "osVersion", "appVersion",
  "occurredAt", "timezone", "normalizedErrorCode", "profileStatus", "updateStage", "updateStartedAt",
  "lastSuccessfulUpdateAt", "hasPartialFailure", "connectionType", "vpnReported", "source", "correlationId",
]);

const clean = (value, max = 120) => String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);

/** @param {Record<string, unknown>} input @param {{includeVpn?:boolean}} options @returns {SafeBankSupportDiagnostic} */
export function sanitizeBankSupportDiagnostic(input = {}, options = {}) {
  const output = {};
  for (const [key, value] of Object.entries(input)) {
    if (forbiddenDiagnosticKeys.has(key.toLocaleLowerCase("en-US")) || !allowedDiagnosticKeys.has(key)) continue;
    if (key === "vpnReported" && !options.includeVpn) continue;
    if (key === "hasPartialFailure" || key === "vpnReported") output[key] = value === true;
    else if (value != null && value !== "") output[key] = clean(value, key.includes("Id") ? 160 : 120);
  }
  return output;
}

export function diagnosticContainsForbiddenKeys(payload) {
  return Object.keys(payload || {}).some((key) => forbiddenDiagnosticKeys.has(key.toLocaleLowerCase("en-US")));
}
