const activeSmsStages = new Set(["sms", "otp", "confirmation", "code"]);
const activeCredentialStages = new Set(["credentials", "login", "password", "auth_form"]);

/** Convert known Cashoff-shaped state into a safe public issue code. Unknown details are never exposed. */
export function mapBankTechnicalState(state = {}, now = Date.now()) {
  const profileStatus = String(state.profileStatus || state.profile?.status || "").toLowerCase();
  const updateStatus = String(state.updateStatus || state.update?.status || "").toLowerCase();
  const stage = String(state.updateStage || state.update_current_stage || "").toLowerCase();
  const failedBlocks = state.failedStmBlocks || state.failed_stm_blocks;
  const httpStatus = Number(state.httpStatus || state.statusCode || 0);

  if (updateStatus === "already_started") return "already_updating";
  if (updateStatus === "provider_unavailable") return "provider_unavailable";
  if (updateStatus === "form_invalid" && activeSmsStages.has(stage)) return "invalid_otp";
  if (updateStatus === "form_invalid" && activeCredentialStages.has(stage)) return "invalid_credentials";
  if (updateStatus === "in_use" || httpStatus === 423) return "profile_in_use";
  if (Array.isArray(failedBlocks) && failedBlocks.length > 0) return "partial_update";
  if (profileStatus === "auth" && (!stage || state.sessionExpired === true)) return "session_expired";
  if (profileStatus === "updating" || updateStatus === "update_progress") {
    const started = Date.parse(String(state.updateStartedAt || state.update_started_at || ""));
    if (Number.isFinite(started) && now - started > 30 * 60 * 1000) return "update_timeout";
    return "already_updating";
  }
  if (profileStatus === "error") {
    if (state.last_attempt_error || state.lastAttemptError) return "unknown_error";
    return "internal_error";
  }
  if (profileStatus === "ok" && updateStatus === "ok") return null;
  return "unknown_error";
}
