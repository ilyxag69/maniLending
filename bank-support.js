import { bankConnectionIssues, bankIssueByCode, bankIssueCategories, searchableIssueText } from "/support/bank-connection-issues.js";
import { sanitizeBankSupportDiagnostic } from "/support/bank-support-diagnostics.js";

const $ = (selector, root = document) => root.querySelector(selector);
const banks = new Map([["tbank","Т‑Банк"],["sber","Сбер"],["alfa","Альфа-Банк"],["vtb","ВТБ"],["gazprombank","Газпромбанк"],["raiffeisen","Райффайзен Банк"],["ozon","Ozon Банк"],["yandex","Яндекс Банк"]]);
const allowed = {
  source: new Set(["app", "web", "support"]),
  platform: new Set(["ios", "android", "web"]),
};
const params = new URLSearchParams(location.search);
const cleanParam = (name, pattern, max = 80) => {
  const value = (params.get(name) || "").trim().slice(0, max);
  return pattern.test(value) ? value : "";
};
const rawError = cleanParam("error", /^[a-z0-9_]{1,64}$/);
const knownIssue = bankIssueByCode.get(rawError);
const issue = knownIssue || (rawError ? bankIssueByCode.get("unknown_error") : null);
const bankSlug = banks.has(params.get("bank")) ? params.get("bank") : "";
const source = allowed.source.has(params.get("source")) ? params.get("source") : "";
const platform = allowed.platform.has(params.get("platform")) ? params.get("platform") : "";
const appVersion = cleanParam("app_version", /^[0-9A-Za-z._+-]{1,32}$/, 32);
const incidentId = cleanParam("incident_id", /^[A-Za-z0-9._:-]{1,80}$/);
const track = (name, details = {}) => window.ManiAnalytics?.track?.(name, {
  issue_code: details.issue_code || undefined,
  category: details.category || undefined,
  bank_slug: bankSlug || undefined,
  platform: platform || undefined,
  app_version: appVersion || undefined,
  action: details.action || undefined,
});

let activeCategory = "all";
let query = "";
let searchTimer;

function makeList(title, items) {
  const block = document.createElement("div");
  const heading = document.createElement("h4"); heading.textContent = title;
  const list = document.createElement("ul");
  items.forEach((item) => { const li = document.createElement("li"); li.textContent = item; list.append(li); });
  block.append(heading, list); return block;
}

function renderIssues() {
  const list = $("[data-issue-list]"); list.replaceChildren();
  const visible = bankConnectionIssues.filter((item) => (activeCategory === "all" || item.category === activeCategory) && (!query || searchableIssueText(item).includes(query)));
  visible.forEach((item) => {
    const article = document.createElement("article"); article.className = "bs-issue"; article.id = item.slug;
    const button = document.createElement("button"); button.type = "button"; button.className = "bs-issue-toggle"; button.setAttribute("aria-expanded", "false"); button.setAttribute("aria-controls", `${item.slug}-body`);
    const text = document.createElement("span"); const title = document.createElement("strong"); title.textContent = item.title; const answer = document.createElement("small"); answer.textContent = item.shortAnswer; text.append(title, answer);
    const icon = document.createElement("b"); icon.textContent = "+"; icon.setAttribute("aria-hidden", "true"); button.append(text, icon);
    const body = document.createElement("div"); body.className = "bs-issue-body"; body.id = `${item.slug}-body`; body.hidden = true;
    body.append(makeList("Как это выглядит", item.symptoms), makeList("Что можно сделать", item.steps));
    const support = document.createElement("p"); support.className = "bs-when-support"; support.textContent = item.whenToContactSupport; body.append(support);
    if (item.securityWarning) { const warning = document.createElement("p"); warning.className = "bs-inline-warning"; warning.textContent = item.securityWarning; body.append(warning); }
    const actions = document.createElement("div"); actions.className = "bs-issue-actions";
    const copy = document.createElement("button"); copy.type = "button"; copy.textContent = "Скопировать ссылку"; copy.addEventListener("click", async () => { const url = `${location.origin}${location.pathname}#${item.slug}`; try { await navigator.clipboard.writeText(url); copy.textContent = "Ссылка скопирована"; } catch { window.prompt("Скопируйте ссылку", url); } track("bank_support_copy_link", { issue_code:item.code, category:item.category }); });
    const contact = document.createElement("a"); contact.href = "#contact-support"; contact.textContent = "Написать в поддержку"; contact.addEventListener("click", () => track("bank_support_contact_clicked", { issue_code:item.code, category:item.category }));
    actions.append(copy, contact); body.append(actions);
    button.addEventListener("click", () => openIssue(article, item)); article.append(button, body); list.append(article);
  });
  $("[data-results-count]").textContent = `Найдено: ${visible.length}`;
  $("[data-no-results]").hidden = visible.length !== 0;
}

function openIssue(article, item, scroll = false) {
  const button = $(".bs-issue-toggle", article); const body = $(".bs-issue-body", article); const opening = body.hidden;
  body.hidden = !opening; button.setAttribute("aria-expanded", String(opening)); $("b", button).textContent = opening ? "−" : "+";
  article.classList.toggle("is-open", opening);
  if (opening) { article.classList.add("is-highlighted"); setTimeout(() => article.classList.remove("is-highlighted"), 1800); }
  if (opening) track("bank_support_issue_opened", { issue_code:item.code, category:item.category });
  if (scroll) article.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block:"start" });
}

function openByCode(code, scroll = true) {
  const targetIssue = bankIssueByCode.get(code); if (!targetIssue) return;
  activeCategory = "all"; query = ""; $("[data-issue-search]").value = ""; renderFilters(); renderIssues();
  const article = document.getElementById(targetIssue.slug); if (article) openIssue(article, targetIssue, scroll);
}

function renderFilters() {
  const root = $("[data-category-filters]"); root.replaceChildren();
  bankIssueCategories.forEach(({id,label}) => { const button = document.createElement("button"); button.type="button"; button.textContent=label; button.className = id === activeCategory ? "is-active" : ""; button.setAttribute("aria-pressed", String(id === activeCategory)); button.addEventListener("click", () => { activeCategory=id; renderFilters(); renderIssues(); }); root.append(button); });
}

function setupQueryResult() {
  if (source === "app") { const back = $("[data-app-back]"); back.hidden=false; back.addEventListener("click", () => history.length > 1 ? history.back() : location.assign("/")); }
  if (!issue) return;
  const panel = $("[data-personal-result]"); panel.hidden=false;
  $("[data-personal-title]").textContent = issue.title;
  $("[data-personal-copy]").textContent = bankSlug ? `${banks.get(bankSlug)}: ${issue.shortAnswer}` : issue.shortAnswer;
  $("[data-personal-open]").addEventListener("click", () => openByCode(issue.code));
  setTimeout(() => openByCode(issue.code, false), 0);
}

function wizardRecommendations(values) {
  if (values.bankWorks === "no") return ["bank_maintenance", "provider_unavailable"];
  if (values.network === "vpn") return ["vpn_suspected", "network_error"];
  if (values.network === "foreign") return ["foreign_access_restricted", "network_error"];
  return ({selection:["bank_not_supported"], credentials:["invalid_credentials","session_expired"], confirmation:["sms_not_received","approval_required","invalid_otp"], loading:["already_updating","update_timeout","partial_update"], connected:["data_delayed","duplicates_detected"]})[values.stage] || ["unknown_error"];
}

function setupWizard() {
  const root = $("[data-diagnostic-wizard]"); const steps = [...root.querySelectorAll("[data-wizard-step]")]; const values = {}; let index = 0;
  const reset = () => { index=0; Object.keys(values).forEach((key)=>delete values[key]); steps.forEach((s,i)=>s.hidden=i!==0); $("[data-wizard-result]").hidden=true; $("[data-wizard-progress]").textContent="1 / 3"; };
  steps.forEach((step) => step.addEventListener("click", (event) => { const button=event.target.closest("button[data-value]"); if(!button)return; values[step.dataset.wizardStep]=button.dataset.value; track("bank_support_diagnostic_started", {action:`step_${index+1}`}); step.hidden=true; index+=1; if(index<steps.length){steps[index].hidden=false; $("[data-wizard-progress]").textContent=`${index+1} / 3`;} else { const result=$("[data-wizard-result]"); const links=$("[data-wizard-links]"); links.replaceChildren(); wizardRecommendations(values).forEach((code)=>{const found=bankIssueByCode.get(code); const b=document.createElement("button"); b.type="button"; b.textContent=found.title; b.addEventListener("click",()=>openByCode(code)); links.append(b);}); result.hidden=false; $("[data-wizard-progress]").textContent="Готово"; track("bank_support_recommendation_shown", {action:"wizard"}); } }));
  $("[data-wizard-reset]").addEventListener("click", reset);
}

function currentDiagnostic() {
  const selectedBank = $("[name=bank]")?.value || bankSlug;
  return sanitizeBankSupportDiagnostic({incidentId, bankSlug:selectedBank, platform, appVersion, occurredAt:$("[name=occurredAt]")?.value, normalizedErrorCode:issue?.code, updateStage:$("[name=stage]")?.value, source, timezone:Intl.DateTimeFormat().resolvedOptions().timeZone});
}

function refreshDiagnostic() {
  const dl=$("[data-diagnostic-preview] dl"); dl.replaceChildren(); const labels={incidentId:"Инцидент",bankSlug:"Банк",platform:"Платформа",appVersion:"Версия mani",occurredAt:"Время",normalizedErrorCode:"Код ошибки",updateStage:"Этап",source:"Источник",timezone:"Часовой пояс"};
  Object.entries(currentDiagnostic()).forEach(([key,value])=>{const dt=document.createElement("dt");dt.textContent=labels[key]||key;const dd=document.createElement("dd");dd.textContent=String(value);dl.append(dt,dd);});
}

function setupForm() {
  const form=$("[data-support-form]"); const fields=$("[data-support-fields]"); const success=$("[data-support-success]"); const result=$("[data-support-result]"); const submit=form.querySelector(".bs-submit");
  ["bank","stage","occurredAt"].forEach((name)=>form.elements[name]?.addEventListener("change",refreshDiagnostic));
  const bankSelect=form.elements.bank; banks.forEach((label,value)=>{const option=document.createElement("option");option.value=value;option.textContent=label;bankSelect.append(option);}); if(bankSlug)bankSelect.value=bankSlug; refreshDiagnostic();
  $("[data-support-telegram]").addEventListener("click",()=>track("bank_support_contact_clicked",{action:"telegram"}));
  form.addEventListener("submit", async(event)=>{
    event.preventDefault();
    result.classList.remove("is-error");
    if(!form.reportValidity())return;
    const description=form.elements.description.value.trim();
    const sensitive=/(?:\d[ -]?){13,19}|(?:парол|смс.?код|sms.?code|cvv|cvc|pin)/i.test(description);
    if(sensitive){result.textContent="Удалите из описания пароли, коды и полные реквизиты карты или счёта.";result.classList.add("is-error");return;}
    const diagnostic=currentDiagnostic();
    const message=[description||"Описание не добавлено.","","Безопасная диагностика:",JSON.stringify(diagnostic,null,2)].join("\n");
    result.textContent="Отправляем…"; submit.disabled=true;
    try{
      const response=await fetch("/api/contact",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"Поддержка подключения банка",replyTo:form.elements.replyTo.value.trim(),topic:"Техподдержка",message,website:form.elements.website.value,pdnConsent:form.elements.diagnosticConsent.checked})});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok || !payload.ticket)throw new Error(payload.message||"");
      $("[data-support-ticket]").textContent=payload.ticket;
      fields.hidden=true; success.hidden=false; success.focus?.();
      track("bank_support_feedback",{action:"sent"});
    }catch(error){
      result.textContent=error.message||"Не удалось отправить форму. Напишите нам в Telegram @eto_mani.";
      result.classList.add("is-error"); track("bank_support_feedback",{action:"error"});
    }finally{submit.disabled=false;}
  });
  $("[data-support-new]").addEventListener("click",()=>{form.reset();success.hidden=true;fields.hidden=false;result.classList.remove("is-error");result.textContent="Обязательны только контакт для ответа и согласие.";refreshDiagnostic();form.elements.replyTo.focus();track("bank_support_feedback",{action:"new_request"});});
}

function setupSiteNavigation() {
  const menuButton = $(".nm-menu");
  const panel = $(".nm-mobile-menu");
  if (!menuButton || !panel) return;
  const close = () => { document.body.classList.remove("menu-open"); menuButton.setAttribute("aria-expanded", "false"); menuButton.setAttribute("aria-label", "Открыть меню"); panel.setAttribute("aria-hidden", "true"); };
  menuButton.addEventListener("click", () => {
    const opening = !document.body.classList.contains("menu-open");
    document.body.classList.toggle("menu-open", opening);
    menuButton.setAttribute("aria-expanded", String(opening));
    menuButton.setAttribute("aria-label", opening ? "Закрыть меню" : "Открыть меню");
    panel.setAttribute("aria-hidden", String(!opening));
  });
  panel.addEventListener("click", (event) => { if (event.target.closest("a")) close(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") { close(); menuButton.focus(); } });
}

renderFilters(); renderIssues(); setupQueryResult(); setupWizard(); setupForm(); setupSiteNavigation();
const search=$("[data-issue-search]"); search.addEventListener("input",()=>{query=search.value.trim().toLocaleLowerCase("ru-RU");$("[data-search-clear]").hidden=!query;renderIssues();clearTimeout(searchTimer);if(query)searchTimer=setTimeout(()=>track("bank_support_search_used",{action:"has_query"}),500);});
$("[data-search-clear]").addEventListener("click",()=>{search.value="";query="";renderIssues();$("[data-search-clear]").hidden=true;search.focus();});
$("[data-reset-search]").addEventListener("click",()=>{search.value="";query="";activeCategory="all";renderFilters();renderIssues();});
if(location.hash){const hashIssue=bankConnectionIssues.find((item)=>`#${item.slug}`===location.hash);if(hashIssue)setTimeout(()=>openByCode(hashIssue.code),50);}
track("bank_support_opened", issue ? {issue_code:issue.code,category:issue.category} : {});
if(rawError && !knownIssue) track("unknown_support_error", {action:"unknown_code"});
