const state = {
  user: null, dashboard: null, transactions: [], profile: null,
  page: 'overview', history: [], onboardingStep: 0, persona: 'mentor',
  balancesHidden: false, pendingSignup: null, recoveryEmail: '', selectedMonth: '', selectedCategory: '',
  selectedPayment: null, selectedProvider: 'tbank', selectedAccountId: '', selectedTransaction: null, transactionReturnPage: 'account-detail', accountReturnPage: 'balance', expandedBalanceProvider: '', bankStep: 'list', bankPhone: '',
  localBankStatus: null, lastLocalImportAt: '',
  reportSlide: 0, surveyStep: 0, surveyAnswers: {}, lastChatMessage: '', cashflowMode: 'income', homeInsightIndex: 0,
};

let homeBriefingSlides = [];
let homeBriefingTimer = null;
let bankSessionTimer = null;
const PREVIEW_API = 'api.php?route=';

function previewTrack(event, details = {}) {
  const payload = JSON.stringify({ event, ...details, viewport: `${window.innerWidth}x${window.innerHeight}`, build: 'mobile-preview-1' });
  if (navigator.sendBeacon) navigator.sendBeacon(`${PREVIEW_API}${encodeURIComponent('/api/preview-event')}`, new Blob([payload], { type: 'application/json' }));
  else fetch(`${PREVIEW_API}${encodeURIComponent('/api/preview-event')}`, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
}

const el = (id) => document.getElementById(id);
const authView = el('auth-view');
const onboardingView = el('onboarding-view');
const appView = el('app-view');
const rub = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });
const shortDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
const longDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
const monthName = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });

const personaDetails = {
  mentor: { asset: 'assets/mani-motivator.png', homeAsset: 'assets/mani-home-good.png', label: 'Мотиватор', description: 'Поддерживает, объясняет и помогает держать темп' },
  roaster: { asset: 'assets/mani-funny.png', homeAsset: 'assets/mani-funny.png', label: 'Весельчак', description: 'Шутит, говорит прямо и подталкивает без занудства' },
};
const bankNames = { tbank_demo: 'Т‑Банк', tbank: 'Т‑Банк', sber: 'СберБанк', alfa: 'АльфаБанк', vtb: 'ВТБ', yoomoney: 'ЮMoney' };

function node(tag, className = '', text) {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (text !== undefined) item.textContent = text;
  return item;
}
function button(className, text, handler) {
  const item = node('button', className, text);
  item.type = 'button';
  if (handler) item.addEventListener('click', handler);
  return item;
}
function setText(id, value) { const item = el(id); if (item) item.textContent = value; }
function plural(value, one, few, many) {
  const number = Math.abs(value) % 100; const digit = number % 10;
  if (number > 10 && number < 20) return many;
  if (digit === 1) return one;
  if (digit >= 2 && digit <= 4) return few;
  return many;
}
function formatMoney(value, sign = false) {
  if (value === null || value === undefined) return state.balancesHidden ? '••• ₽' : '—';
  const amount = Number(value || 0);
  if (state.balancesHidden) return '••• ₽';
  return `${sign && amount > 0 ? '+' : ''}${rub.format(amount)}`;
}
function formatAccountBalance(account) { return account?.balance === null || account?.balance === undefined ? '—' : rub.format(account.balance); }
function formatAccountsBalance(accounts) { return accounts.some((item) => item.balance === null || item.balance === undefined) ? '—' : rub.format(accounts.reduce((sum, item) => sum + Number(item.balance), 0)); }
function accountCards(account) { return Array.isArray(account?.extra?.cards) ? account.extra.cards.filter(Boolean) : account?.card_mask ? [account.card_mask] : []; }
function accountTypeLabel(type) { return ({ credit: 'Кредитный счёт', debit: 'Дебетовый счёт', investbox: 'Инвесткопилка', account: 'Счёт', card: 'Карта' })[type] || type || 'Счёт'; }
function safeDate(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date; }
function providerLabel(provider = '') {
  const key = String(provider).toLowerCase();
  if (bankNames[key]) return bankNames[key];
  if (key.startsWith('tbank')) return 'Т‑Банк';
  if (key.includes('sber')) return 'СберБанк';
  if (key.includes('alfa')) return 'АльфаБанк';
  if (key.includes('vtb')) return 'ВТБ';
  return provider || 'Банк';
}
function toast(message, error = false) {
  const box = el('toast'); box.textContent = message;
  box.className = `toast is-visible${error ? ' is-error' : ''}`;
  clearTimeout(toast.timer); toast.timer = setTimeout(() => { box.className = 'toast'; }, 3800);
}
async function api(url, options = {}) {
  const response = await fetch(`${PREVIEW_API}${encodeURIComponent(url)}`, { credentials: 'same-origin', ...options, headers: { ...(options.body ? { 'content-type': 'application/json' } : {}), ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && data?.error?.code === 'authentication_required') showAuth('login');
    const error = new Error(data?.error?.message || 'Не удалось выполнить запрос.'); error.code = data?.error?.code; throw error;
  }
  return data;
}
async function fetchAllTransactions(parameters) {
  const items = []; let offset = 0;
  for (let page = 0; page < 100; page += 1) {
    const query = new URLSearchParams({ ...parameters, limit: '500', offset: String(offset) });
    const result = await api(`/api/transactions?${query}`); const batch = result.items || []; items.push(...batch);
    if (!result.has_more || batch.length === 0) break;
    offset += batch.length;
  }
  return items;
}

function showAuth(screen = 'welcome') {
  state.user = null; authView.hidden = false; onboardingView.hidden = true; appView.hidden = true;
  document.querySelectorAll('[data-auth-screen]').forEach((item) => item.classList.toggle('is-active', item.dataset.authScreen === screen));
  window.scrollTo({ top: 0 });
}
function applyPersona(persona) {
  state.persona = persona === 'roaster' ? 'roaster' : 'mentor';
  const details = personaDetails[state.persona]; document.body.dataset.persona = state.persona;
  document.querySelectorAll('[data-persona-avatar]').forEach((image) => { image.src = details.asset; image.alt = `MANI — ${details.label}`; });
  const homeImage = document.querySelector('#home-mascot img'); if (homeImage) homeImage.src = details.homeAsset;
  document.querySelectorAll('.persona-choice').forEach((choice) => {
    const selected = choice.dataset.persona === state.persona; choice.classList.toggle('is-selected', selected); choice.setAttribute('aria-pressed', String(selected));
  });
  const tone = document.querySelector(`input[name="assistant-tone"][value="${state.persona}"]`); if (tone) tone.checked = true;
  setText('persona-description', details.description);
}
function renderOnboarding() {
  document.querySelectorAll('.onboarding-slide').forEach((slide) => slide.classList.toggle('is-active', Number(slide.dataset.onboardingStep) === state.onboardingStep));
  const dots = el('onboarding-dots'); dots.replaceChildren();
  for (let index = 0; index < 5; index += 1) dots.append(node('span', index === state.onboardingStep ? 'is-active' : ''));
  dots.setAttribute('aria-label', `Шаг ${state.onboardingStep + 1} из 5`);
  const finalStep = state.onboardingStep === 4; el('onboarding-skip').hidden = finalStep; el('onboarding-next').textContent = finalStep ? 'Поехали!' : 'Продолжить';
}
function showOnboarding() {
  authView.hidden = true; appView.hidden = true; onboardingView.hidden = false; state.onboardingStep = 0;
  applyPersona(state.profile?.assistant_tone || 'mentor'); renderOnboarding(); window.scrollTo({ top: 0 });
}
async function finishOnboarding() {
  const next = el('onboarding-next'); next.disabled = true;
  try {
    const result = await api('/api/profile', { method: 'PATCH', body: JSON.stringify({ assistant_tone: state.persona, onboarding_completed: true }) });
    state.profile = result.preferences; onboardingView.hidden = true; appView.hidden = false;
    await loadDashboard(); navigate('overview', { reset: true }); toast(`${personaDetails[state.persona].label} выбран.`);
  } catch (error) { toast(error.message, true); } finally { next.disabled = false; }
}
async function loadProfile() {
  const result = await api('/api/profile'); state.profile = result.preferences; setText('profile-email', result.user.email); applyPersona(result.preferences.assistant_tone); return result.preferences;
}
async function showApp(user) {
  state.user = user; authView.hidden = true; onboardingView.hidden = true; appView.hidden = true;
  try {
    const preferences = await loadProfile();
    if (!preferences.onboarding_completed) { showOnboarding(); return; }
    appView.hidden = false; await loadDashboard(); navigate('overview', { reset: true });
  } catch (error) { toast(error.message, true); showAuth('login'); }
}

function navigate(page, options = {}) {
  if (!document.querySelector(`[data-page-view="${page}"]`)) return;
  if (page === 'bank-connect') { openBankConnectPopover(); return; }
  closeBankConnectPopover(false);
  if (options.reset) state.history = [];
  else if (!options.fromBack && state.page !== page) state.history.push(state.page);
  state.page = page;
  previewTrack('screen_view', { page });
  document.querySelectorAll('.app-page').forEach((view) => view.classList.toggle('is-active', view.dataset.pageView === page));
  document.querySelectorAll('.tab-link').forEach((item) => item.classList.toggle('is-active', item.dataset.page === page));
  const rootPage = ['overview', 'assistant', 'profile'].includes(page);
  el('mobile-tabbar').hidden = !rootPage; el('topbar').hidden = page !== 'overview';
  if (page === 'assistant' && !options.skipChatLoad) loadChat();
  if (page === 'survey') startSurvey();
  if (page === 'banks') renderBanks();
  if (page === 'bank-detail') renderBankDetail();
  if (page === 'account-detail') renderAccountDetail();
  if (page === 'transaction-detail') renderTransactionDetail();
  if (page === 'category') renderCategoryDetail();
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function goBack(fallback = 'overview') { const previous = state.history.pop() || fallback; navigate(previous, { fromBack: true }); }
function closeToRoot() { navigate('overview', { reset: true }); }

async function loadDashboard() {
  const [dashboard, transactions] = await Promise.all([api('/api/dashboard'), api('/api/transactions?limit=500')]);
  state.dashboard = dashboard; state.transactions = transactions.items || []; renderDashboard();
}
function renderDashboard() {
  const report = state.dashboard; if (!report) return;
  const hasData = Boolean(report.counts.accounts || report.counts.transactions);
  el('empty-state').hidden = hasData; el('dashboard-content').hidden = !hasData; renderManiState(); renderHomeBriefing(true);
  if (hasData) { renderHomeMoney(); renderHomeUpdate(); renderHomeUpcoming(); renderHomeBanks(); }
  renderBalance(); renderMonths(); renderReport(); renderBanks(); renderBankDetail(); renderAccountDetail(); renderTransactionDetail();
}
function renderManiState(forcedState = '') {
  const report = state.dashboard; const hasData = Boolean(report?.counts?.transactions);
  const overspending = hasData && (report.kpis.spending_excluding_transfers > report.kpis.total_income || report.report.risk === 'Высокий');
  const mode = forcedState || (!hasData ? 'empty' : overspending ? 'overspending' : 'good');
  const mascot = el('home-mascot'); mascot.dataset.state = mode; const image = mascot.querySelector('img');
  if (state.persona === 'roaster') image.src = personaDetails.roaster.homeAsset; else image.src = mode === 'empty' ? 'assets/mani-motivator.png' : 'assets/mani-home-good.png';
}
function getHomeBriefingSlides() {
  const report = state.dashboard; const hasData = Boolean(report?.counts?.transactions);
  if (!hasData) return [{ eyebrow: 'MANI сейчас', title: 'Начнём с банка', copy: 'Подключите первый банк — я соберу баланс, расходы и ближайшие платежи.', actionLabel: 'Добавить банк', tone: 'neutral', action: openBankConnectPopover }];
  const slides = []; const income = Number(report.kpis.total_income || 0); const spending = Number(report.kpis.spending_excluding_transfers || 0); const net = income - spending;
  slides.push({ eyebrow: 'Итог периода', title: net >= 0 ? `Осталось ${formatMoney(net)}` : `Не хватило ${formatMoney(Math.abs(net))}`, copy: `${report.coverage.days} ${plural(report.coverage.days, 'день', 'дня', 'дней')} данных. ${net >= 0 ? 'Доходы пока выше расходов.' : 'Расходы обгоняют доходы — стоит проверить крупные категории.'}`, actionLabel: 'Открыть отчёт', tone: net >= 0 ? 'positive' : 'attention', action: openReportPopover });
  const payment = (report.recurring_payments || []).map(paymentInfo).filter((item) => item.next).sort((a, b) => a.next - b.next)[0];
  if (payment) slides.push({ eyebrow: 'Следующее списание', title: payment.merchant || 'Регулярный платёж', copy: `${longDate.format(payment.next)} ожидается −${rub.format(payment.estimated_monthly_amount)}.`, actionLabel: 'Посмотреть платёж', tone: 'payment', action: () => { state.selectedPayment = payment; renderPayment(); navigate('payment'); } });
  const risk = report.report?.risk || 'Не определён'; const factors = (report.report?.risk_factors || []).filter(Boolean);
  slides.push({ eyebrow: 'Фокус MANI', title: `${risk} риск`, copy: factors[0] || 'Спросите MANI, какие расходы можно оптимизировать без жёстких ограничений.', actionLabel: 'Спросить MANI', tone: risk === 'Высокий' ? 'attention' : 'neutral', action: () => navigate('assistant') });
  return slides;
}
function setHomeInsight(index, restartTimer = true) {
  if (!homeBriefingSlides.length) return; state.homeInsightIndex = (Number(index) + homeBriefingSlides.length) % homeBriefingSlides.length; const slide = homeBriefingSlides[state.homeInsightIndex];
  const copy = document.querySelector('.home-briefing-copy'); copy.classList.remove('is-changing'); void copy.offsetWidth; copy.classList.add('is-changing');
  setText('home-insight-eyebrow', slide.eyebrow); setText('home-insight-title', slide.title); setText('home-insight-copy', slide.copy); setText('home-insight-action', slide.actionLabel); el('home-briefing').dataset.tone = slide.tone;
  document.querySelectorAll('#home-insight-dots button').forEach((dot, dotIndex) => { const selected = dotIndex === state.homeInsightIndex; dot.classList.toggle('is-active', selected); dot.setAttribute('aria-pressed', String(selected)); });
  if (restartTimer) scheduleHomeBriefing();
}
function scheduleHomeBriefing() {
  clearInterval(homeBriefingTimer); if (homeBriefingSlides.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  homeBriefingTimer = setInterval(() => setHomeInsight(state.homeInsightIndex + 1, false), 9000);
}
function renderHomeBriefing(reset = false) {
  homeBriefingSlides = getHomeBriefingSlides(); if (reset || state.homeInsightIndex >= homeBriefingSlides.length) state.homeInsightIndex = 0;
  const dots = el('home-insight-dots'); dots.replaceChildren(); homeBriefingSlides.forEach((slide, index) => { const dot = button('', `Показать: ${slide.eyebrow}`, () => setHomeInsight(index)); dot.setAttribute('aria-label', `Показать карточку «${slide.eyebrow}»`); dots.append(dot); });
  setHomeInsight(state.homeInsightIndex);
}
function renderHomeMoney() {
  const report = state.dashboard; setText('kpi-balance', formatMoney(report.kpis.total_balance)); setText('kpi-income', formatMoney(report.kpis.total_income));
  setText('kpi-spending', state.balancesHidden ? '••• ₽' : `−${rub.format(report.kpis.spending_excluding_transfers)}`);
  const visibility = el('balance-visibility'); visibility.classList.toggle('is-hidden', state.balancesHidden); visibility.setAttribute('aria-label', state.balancesHidden ? 'Показать суммы' : 'Скрыть суммы');
}
function renderHomeUpdate() {
  const latest = (state.dashboard.imports || []).find((item) => item.completed_at || item.created_at);
  if (!latest) { setText('coverage-copy', 'Ожидание первого обновления'); return; }
  const updated = safeDate(latest.completed_at || latest.created_at); if (!updated) { setText('coverage-copy', 'Данные импортированы'); return; }
  const days = Math.max(0, Math.floor((Date.now() - updated.getTime()) / 86_400_000));
  setText('coverage-copy', days === 0 ? `Обновлено сегодня в ${timeFormat.format(updated)}` : days === 1 ? `Обновлено вчера в ${timeFormat.format(updated)}` : `Обновлено ${days} ${plural(days, 'день', 'дня', 'дней')} назад`);
}
function paymentInfo(item) {
  const ids = new Set((item.transaction_ids || []).map(String));
  const related = state.transactions.filter((transaction) => ids.has(String(transaction.id))).sort((a, b) => String(b.occurred_at).localeCompare(String(a.occurred_at)));
  const last = state.transactions.find((transaction) => String(transaction.id) === String(item.last_transaction_id)) || related[0];
  const next = safeDate(item.next_expected_at); const account = state.dashboard.accounts.find((candidate) => String(candidate.id) === String(item.account_id));
  return { ...item, next, last, account, related };
}
function renderHomeUpcoming() {
  const items = (state.dashboard.recurring_payments || []).map(paymentInfo).filter((item) => item.next).sort((a, b) => a.next - b.next).slice(0, 2); const section = el('home-upcoming'); const root = el('home-upcoming-list'); root.replaceChildren(); section.hidden = items.length === 0;
  items.forEach((item) => {
    const row = button('home-payment-row'); row.addEventListener('click', () => { state.selectedPayment = item; renderPayment(); navigate('payment'); });
    const date = node('span', 'home-payment-date'); const parts = shortDate.format(item.next).split(' '); date.append(node('small', '', (parts[1] || '').replace('.', '')), node('b', '', String(item.next.getDate())));
    const copy = node('span', 'home-payment-copy'); copy.append(node('b', '', item.merchant || 'Регулярное списание'), node('small', '', `${item.category || 'Без категории'} · вероятность ${Math.round(Number(item.confidence || 0) * 100)}%`));
    row.append(date, copy, node('strong', '', `−${rub.format(item.estimated_monthly_amount)}`)); root.append(row);
  });
}
function bankLogo(provider) { return node('span', `bank-logo ${String(provider).startsWith('tbank') ? 'tbank' : ''}`, String(provider).startsWith('tbank') ? 'T' : providerLabel(provider).slice(0, 1)); }
function groupedAccounts() {
  const groups = new Map(); (state.dashboard?.accounts || []).forEach((account) => { const list = groups.get(account.provider) || []; list.push(account); groups.set(account.provider, list); }); return groups;
}
function renderHomeBanks() {
  const root = el('home-bank-list'); root.replaceChildren();
  for (const [provider, accounts] of groupedAccounts()) {
    const card = button('home-bank-card'); card.addEventListener('click', () => { state.selectedProvider = provider; navigate('bank-detail'); });
    const line = node('span', 'home-bank-title'); line.append(bankLogo(provider), node('b', '', providerLabel(provider)), node('span', 'home-bank-indicator active', '✓'));
    card.append(line, node('small', '', `${accounts.length} ${plural(accounts.length, 'счёт', 'счёта', 'счетов')} · актуально`)); root.append(card);
  }
}

function renderBalance() {
  const root = el('balance-list'); root.replaceChildren();
  if (!state.dashboard?.accounts?.length) { root.append(emptyCard('Нет подключённых банков', 'Добавьте банк, чтобы увидеть общий баланс и разбивку по счетам.')); return; }
  const bankGroups = [...groupedAccounts()]; const total = node('article', 'hero-number balance-total'); total.append(node('small', '', 'Общий баланс'), node('strong', '', formatMoney(state.dashboard.kpis.total_balance)), node('p', '', `${bankGroups.length} ${plural(bankGroups.length, 'банк', 'банка', 'банков')} · ${state.dashboard.accounts.length} ${plural(state.dashboard.accounts.length, 'продукт', 'продукта', 'продуктов')}`)); root.append(total);
  const breakdown = state.dashboard.kpis.balance_breakdown;
  if (breakdown?.credit_limit > 0) {
    const balanceFacts = node('article', 'detail-card facts balance-breakdown'); balanceFacts.append(fact('Собственные средства', formatMoney(breakdown.own_funds)), fact('Доступно с кредитным лимитом', formatMoney(breakdown.available_with_credit)), fact('Кредитный лимит', formatMoney(breakdown.credit_limit)), fact('Задолженность', formatMoney(breakdown.debt))); root.append(balanceFacts);
  }
  for (const [provider, accounts] of bankGroups) {
    const expanded = state.expandedBalanceProvider === provider; const card = node('article', `balance-bank-accordion${expanded ? ' is-expanded' : ''}`); const panelId = `balance-bank-${String(provider).replace(/[^a-z0-9_-]/gi, '-')}`;
    const toggle = button('balance-bank-toggle'); toggle.setAttribute('aria-expanded', String(expanded)); toggle.setAttribute('aria-controls', panelId); toggle.addEventListener('click', () => { state.expandedBalanceProvider = expanded ? '' : provider; renderBalance(); });
    const identity = node('span', 'balance-bank-identity'); const name = node('span'); name.append(node('b', '', providerLabel(provider)), node('small', '', `${accounts.length} ${plural(accounts.length, 'продукт', 'продукта', 'продуктов')}`)); identity.append(bankLogo(provider), name);
    const amount = node('span', 'balance-bank-amount'); amount.append(node('strong', '', formatAccountsBalance(accounts)), node('i', '', '⌄')); toggle.append(identity, amount); card.append(toggle);
    const panel = node('div', 'balance-bank-panel'); panel.id = panelId; panel.hidden = !expanded;
    accounts.forEach((account) => { const cards = accountCards(account); const row = button('balance-product-row'); const icon = node('i', 'product-kind', String(accountTypeLabel(account.type)).slice(0, 1).toUpperCase()); const copy = node('span'); copy.append(node('b', '', account.name || 'Счёт'), node('small', '', [accountTypeLabel(account.type), cards.length ? `${cards.length} ${plural(cards.length, 'карта', 'карты', 'карт')}` : '', account.currency].filter(Boolean).join(' · '))); const value = node('span', 'product-balance'); value.append(node('strong', '', formatAccountBalance(account)), node('b', '', '›')); row.append(icon, copy, value); row.addEventListener('click', () => { state.selectedProvider = provider; state.selectedAccountId = account.id; state.accountReturnPage = 'balance'; navigate('account-detail'); }); panel.append(row); });
    panel.append(button('bank-overview-link', 'Все данные банка', () => { state.selectedProvider = provider; navigate('bank-detail'); })); card.append(panel);
    root.append(card);
  }
}
function renderMonths() {
  const root = el('month-list'); root.replaceChildren(); const incomeMode = state.cashflowMode === 'income';
  const months = [...(state.dashboard?.monthly || [])].filter((item) => incomeMode ? item.income > 0 : item.spending > 0).sort((a, b) => b.month.localeCompare(a.month));
  const label = incomeMode ? 'Доходы' : 'Расходы'; setText('cashflow-title', label); document.body.dataset.cashflow = state.cashflowMode;
  document.querySelectorAll('.cashflow-card [data-flow-filter]').forEach((item) => item.classList.toggle('is-active', item.dataset.flowFilter === state.cashflowMode));
  const switcher = node('div', 'flow-switch surface');
  const incomeButton = button(incomeMode ? 'is-active' : '', 'Доходы', () => setCashflowMode('income'));
  const expenseButton = button(!incomeMode ? 'is-active' : '', 'Расходы', () => setCashflowMode('expense'));
  switcher.append(incomeButton, expenseButton); root.append(switcher);
  if (!months.length) { root.append(emptyCard('Пока нет операций', 'После импорта здесь появятся доходы и расходы по месяцам.')); return; }
  const total = incomeMode ? state.dashboard.kpis.total_income : state.dashboard.kpis.spending_excluding_transfers;
  const matchingCount = incomeMode ? Number(state.dashboard.flow_counts?.income || 0) : Number(state.dashboard.flow_counts?.spending || 0);
  const summary = node('article', `hero-number compact flow-hero ${state.cashflowMode}`);
  summary.append(node('small', '', `${label} за доступный период`), node('strong', '', `${incomeMode ? '+' : '−'}${rub.format(total)}`), node('p', '', `${matchingCount} ${plural(matchingCount, 'операция', 'операции', 'операций')} · ${state.dashboard.coverage.days} ${plural(state.dashboard.coverage.days, 'день', 'дня', 'дней')}`)); root.append(summary);
  if (!incomeMode) renderCategories(root);
  months.forEach((item) => {
    const date = new Date(`${item.month}-01T00:00:00`); const card = button(`detail-card month-row ${state.cashflowMode}`); card.addEventListener('click', () => { state.selectedMonth = item.month; renderMonth(); navigate('month'); });
    const count = incomeMode ? Number(item.income_count || 0) : Number(item.spending_count || 0);
    const title = node('span'); title.append(node('b', '', monthName.format(date)), node('small', '', `${count} ${plural(count, 'операция', 'операции', 'операций')}`));
    const values = node('span', 'month-values'); values.append(node('em', state.cashflowMode, `${incomeMode ? '+' : '−'}${rub.format(incomeMode ? item.income : item.spending)}`), node('b', 'flow-arrow', '›')); card.append(title, values); root.append(card);
  });
}
function transactionCategory(item) { return item.user_category || item.category || 'Без категории'; }
function renderCategories(root) {
  const categories = state.dashboard?.categories || [];
  if (!categories.length) return;
  root.append(node('h2', 'date-divider category-heading', 'Категории расходов'));
  const list = node('div', 'category-list');
  categories.forEach((item) => {
    const row = button('category-row'); row.addEventListener('click', () => { state.selectedCategory = item.name; navigate('category'); });
    const copy = node('span'); copy.append(node('b', '', item.name), node('small', '', `${item.count} ${plural(item.count, 'операция', 'операции', 'операций')} · ${Math.round(item.share * 100)}% расходов`));
    const value = node('span', 'category-value'); value.append(node('strong', '', `−${rub.format(item.amount)}`), node('b', '', '›'));
    const track = node('span', 'category-track'); const fill = node('i'); fill.style.width = `${Math.max(3, item.share * 100)}%`; track.append(fill); row.append(copy, value, track); list.append(row);
  });
  root.append(list, node('h2', 'date-divider', 'По месяцам'));
}
function transactionMatchesFlow(item) {
  if (!item.analytics_included || /(declin|reject|cancel|fail|отклон|отмен|ошиб)/i.test(String(item.status || ''))) return false;
  if (state.cashflowMode === 'income') return Number(item.amount) > 0;
  const transfer = /(перевод|пополнен|между счет|сбп)/i.test(`${item.category || ''} ${item.description || ''}`);
  return Number(item.amount) < 0 && !transfer;
}
function setCashflowMode(mode, open = false) {
  state.cashflowMode = mode === 'expense' ? 'expense' : 'income'; document.body.dataset.cashflow = state.cashflowMode;
  document.querySelectorAll('.cashflow-card [data-flow-filter]').forEach((item) => item.classList.toggle('is-active', item.dataset.flowFilter === state.cashflowMode));
  renderMonths(); if (state.page === 'month') renderMonth(); if (open) navigate('cashflow');
}
function transactionRow(item, interactive = false) {
  const positive = Number(item.amount) > 0; const row = interactive ? button('transaction-row is-interactive') : node('article', 'transaction-row'); row.append(node('span', `transaction-icon ${positive ? 'positive' : ''}`, positive ? '↓' : '↑'));
  const copy = node('span', 'transaction-copy'); const date = safeDate(item.occurred_at); copy.append(node('b', '', item.merchant || item.description || 'Операция'), node('small', '', `${transactionCategory(item)}${date ? ` · ${shortDate.format(date)}` : ''}`));
  row.append(copy, node('strong', positive ? 'positive' : '', `${positive ? '+' : '−'}${rub.format(Math.abs(item.amount))}`)); if (interactive) row.addEventListener('click', () => { state.selectedTransaction = item; state.transactionReturnPage = state.page; renderTransactionDetail(); navigate('transaction-detail'); }); return row;
}
async function renderMonth() {
  const date = new Date(`${state.selectedMonth || new Date().toISOString().slice(0, 7)}-01T00:00:00`); const label = state.cashflowMode === 'income' ? 'Доходы' : 'Расходы'; setText('month-title', `${label} · ${monthName.format(date)}`);
  const root = el('month-transactions'); root.replaceChildren();
  const loading = emptyCard('Загружаю операции…', 'MANI получает все страницы выбранного месяца.'); root.append(loading);
  try {
    const loaded = await fetchAllTransactions({ month: state.selectedMonth, flow: state.cashflowMode }); loading.remove();
    const items = loaded.filter(transactionMatchesFlow).sort((a, b) => String(b.occurred_at).localeCompare(String(a.occurred_at)));
    if (!items.length) { root.append(emptyCard('Нет операций', 'За этот месяц операции не найдены.')); return; }
    let day = ''; items.forEach((item) => { const key = String(item.occurred_at || '').slice(0, 10); if (key !== day) { day = key; const dateItem = safeDate(item.occurred_at); root.append(node('h2', 'date-divider', dateItem ? longDate.format(dateItem) : 'Без даты')); } root.append(transactionRow(item, true)); });
  } catch (error) { loading.remove(); root.append(emptyCard('Не удалось загрузить месяц', error.message)); }
}
async function renderCategoryDetail() {
  const root = el('category-content'); root.replaceChildren(); const category = state.selectedCategory;
  setText('category-title', category || 'Категория');
  if (!category) { root.append(emptyCard('Категория не выбрана', 'Вернитесь в расходы и выберите категорию.')); return; }
  const summary = (state.dashboard?.categories || []).find((item) => item.name === category);
  if (summary) { const hero = node('article', 'hero-number compact flow-hero expense'); hero.append(node('small', '', 'Расходы в категории'), node('strong', '', `−${rub.format(summary.amount)}`), node('p', '', `${summary.count} ${plural(summary.count, 'операция', 'операции', 'операций')} · ${Math.round(summary.share * 100)}% всех расходов`)); root.append(hero); }
  const loading = node('article', 'empty-card'); loading.append(node('strong', '', 'Загружаю операции…')); root.append(loading);
  try {
    const loaded = await fetchAllTransactions({ category }); loading.remove();
    const items = loaded.filter((item) => transactionCategory(item) === category && transactionMatchesFlow(item));
    if (!items.length) { root.append(emptyCard('Операции не найдены', 'В текущем наборе данных нет расходов этой категории.')); return; }
    let day = ''; items.forEach((item) => { const key = String(item.occurred_at || '').slice(0, 10); if (key !== day) { day = key; const dateItem = safeDate(item.occurred_at); root.append(node('h2', 'date-divider', dateItem ? longDate.format(dateItem) : 'Без даты')); } root.append(transactionRow(item, true)); });
  } catch (error) { loading.remove(); root.append(emptyCard('Не удалось загрузить категорию', error.message)); }
}
function renderPayment() {
  const root = el('payment-detail'); root.replaceChildren(); const item = state.selectedPayment;
  if (!item) { root.append(emptyCard('Платёж не выбран', 'Вернитесь на главную и откройте предстоящий платёж.')); return; }
  const paymentProviders = item.providers?.length ? item.providers.map(providerLabel).join(', ') : providerLabel(item.provider || item.last?.provider); const hero = node('article', 'payment-hero'); hero.append(node('small', '', 'Прогноз по истории'), node('h1', '', item.merchant || 'Регулярное списание'), node('strong', '', `−${rub.format(item.estimated_monthly_amount)}`), node('p', '', `${longDate.format(item.next)} · ${paymentProviders}`)); root.append(hero);
  const facts = node('article', 'detail-card facts'); facts.append(fact('Категория', item.category || 'Без категории'), fact('Вероятность', `${Math.round(Number(item.confidence || 0) * 100)}%`), fact('Периодичность', `примерно раз в ${Math.round(item.median_interval_days || 30)} дней`), fact('Подтверждено списаний', String(item.occurrences || item.related.length)), fact('Диапазон сумм', item.amount_range ? `${rub.format(item.amount_range.min)} – ${rub.format(item.amount_range.max)}` : '—'), fact('Последнее списание', item.last_occurred_at ? longDate.format(new Date(item.last_occurred_at)) : 'нет данных'));
  if (item.merchant_aliases?.length > 1) facts.append(fact('Названия в банке', item.merchant_aliases.join(', ')));
  root.append(facts, node('h2', 'date-divider', 'История')); item.related.slice(0, 8).forEach((transaction) => root.append(transactionRow(transaction)));
}
function renderAccountDetail() {
  const root = el('account-detail-content'); root.replaceChildren(); const account = (state.dashboard?.accounts || []).find((item) => String(item.id) === String(state.selectedAccountId));
  if (!account) { setText('account-detail-title', 'Счёт'); root.append(emptyCard('Продукт не выбран', 'Раскройте банк в разделе баланса и выберите нужный счёт или карту.')); return; }
  state.selectedProvider = account.provider; el('account-detail-back').dataset.back = state.accountReturnPage || 'balance'; setText('account-detail-title', account.name || 'Счёт');
  const transactions = state.transactions.filter((item) => String(item.account_id) === String(account.id)).sort((a, b) => String(b.occurred_at).localeCompare(String(a.occurred_at))); const income = transactions.filter((item) => Number(item.amount) > 0).reduce((sum, item) => sum + Number(item.amount || 0), 0); const spending = Math.abs(transactions.filter((item) => Number(item.amount) < 0).reduce((sum, item) => sum + Number(item.amount || 0), 0));
  const cards = accountCards(account); const hero = node('article', 'bank-detail-hero account-product-hero'); hero.append(bankLogo(account.provider), node('small', '', [providerLabel(account.provider), accountTypeLabel(account.type)].filter(Boolean).join(' · ')), node('h1', '', account.name || 'Счёт'), node('strong', '', formatAccountBalance(account)), node('p', '', [cards.join(', '), account.currency].filter(Boolean).join(' · '))); root.append(hero);
  const facts = node('article', 'detail-card facts account-product-facts'); facts.append(fact('Доходы за период', rub.format(income)), fact('Расходы за период', rub.format(spending)), fact('Операции', String(transactions.length)));
  if (cards.length) facts.append(fact('Карты', cards.join(', ')));
  if (account.extra?.available_balance !== null && account.extra?.available_balance !== undefined) facts.append(fact('Доступно сейчас', rub.format(account.extra.available_balance)));
  if (account.extra?.credit_limit !== null && account.extra?.credit_limit !== undefined) facts.append(fact('Кредитный лимит', rub.format(account.extra.credit_limit)));
  if (account.extra?.debt !== null && account.extra?.debt !== undefined) facts.append(fact('Задолженность', rub.format(account.extra.debt)));
  if (account.extra?.bonus_points !== null && account.extra?.bonus_points !== undefined) facts.append(fact('Бонусные баллы', new Intl.NumberFormat('ru-RU').format(account.extra.bonus_points)));
  if (account.extra?.credit_schedule?.minimum_payment_status) facts.append(fact('Минимальный платёж', account.extra.credit_schedule.minimum_payment_status));
  if (account.extra?.credit_schedule?.statement_at) facts.append(fact('Следующая выписка', longDate.format(new Date(account.extra.credit_schedule.statement_at))));
  if (account.extra?.credit_schedule?.payment_due_at) facts.append(fact('Крайний срок платежа', longDate.format(new Date(account.extra.credit_schedule.payment_due_at))));
  (account.extra?.details || []).slice(0, 12).forEach((item) => { if (item.label && item.value && !facts.textContent.includes(item.label)) facts.append(fact(item.label, item.value)); });
  root.append(facts, node('h2', 'date-divider', 'Последние операции'));
  if (!transactions.length) { root.append(emptyCard('Операций пока нет', 'После следующего обновления они появятся здесь.')); return; }
  transactions.slice(0, 50).forEach((transaction) => root.append(transactionRow(transaction, true)));
}
function renderTransactionDetail() {
  const root = el('transaction-detail-content'); root.replaceChildren(); const item = state.selectedTransaction;
  document.querySelector('[data-page-view="transaction-detail"] [data-back]').dataset.back = state.transactionReturnPage || 'account-detail';
  if (!item) { root.append(emptyCard('Операция не выбрана', 'Откройте счёт и выберите операцию из списка.')); return; }
  const account = (state.dashboard?.accounts || []).find((candidate) => String(candidate.id) === String(item.account_id)); const positive = Number(item.amount) > 0; const date = safeDate(item.occurred_at);
  const hero = node('article', `payment-hero transaction-detail-hero${positive ? ' positive' : ''}`); hero.append(node('small', '', positive ? 'Поступление' : 'Расход'), node('h1', '', item.merchant || item.description || 'Операция'), node('strong', '', `${positive ? '+' : '−'}${rub.format(Math.abs(item.amount))}`), node('p', '', date ? longDate.format(date) : 'Дата не указана')); root.append(hero);
  const details = node('article', 'detail-card facts transaction-facts'); details.append(fact('Категория', transactionCategory(item)), fact('Категория банка', item.bank_category || '—'), fact('Своя категория', item.user_category || '—'), fact('Описание', item.description || item.merchant || '—'), fact('Банк', providerLabel(item.provider || account?.provider)), fact('Продукт', account?.name || 'Счёт'), fact('Карты', accountCards(account).join(', ') || account?.card_mask || '—'), fact('MCC', item.mcc || '—'), fact('Статус', item.status || '—'), fact('Учёт в аналитике', item.analytics_included ? 'Да' : 'Нет'), fact('Сумма в валюте счёта', item.account_amount === null || item.account_amount === undefined ? '—' : `${item.account_amount} ${item.account_currency || ''}`), fact('Исходная сумма', item.operation_amount === null || item.operation_amount === undefined ? '—' : `${item.operation_amount} ${item.operation_currency || ''}`), fact('Бонусы и кэшбэк', item.bonuses === null || item.bonuses === undefined ? '—' : String(item.bonuses)), fact('Сообщение', item.extra?.message || '—'));
  if (item.payment_at) details.append(fact('Дата платежа', longDate.format(new Date(item.payment_at))));
  if (item.external_id) details.append(fact('Идентификатор', String(item.external_id))); root.append(details);
}
function fact(label, value) { const row = node('div', 'fact-row'); row.append(node('span', '', label), node('b', '', value)); return row; }

function renderReport() {
  const report = state.dashboard; if (!report) return; const hasData = Boolean(report.counts.transactions); const loading = !hasData && (report.imports || []).some((item) => item.status === 'processing');
  el('report-empty').hidden = hasData || loading; el('report-loading').hidden = !loading; el('report-content').hidden = !hasData; el('report-dots').hidden = !hasData; el('report-chat').hidden = !hasData;
  if (!hasData) return;
  const net = report.kpis.total_income - report.kpis.spending_excluding_transfers;
  setText('report-headline', net >= 0 ? 'Деньги остаются' : 'Расходы обгоняют доход'); setText('report-explainer', net >= 0 ? `За доступный период запас составил ${rub.format(net)}.` : `За доступный период не хватило ${rub.format(Math.abs(net))}.`);
  setText('report-average', rub.format(report.report.average_check)); setText('report-income', rub.format(report.kpis.total_income)); setText('report-expense', rub.format(report.kpis.spending_excluding_transfers));
  setText('report-top3', `${Math.round(report.report.top_three_merchants_share * 100)}%`); setText('report-weekend', `${Math.round(report.report.weekend_index * 100)}%`); setText('risk-title', `${report.report.risk} риск`); setText('risk-factors', report.report.risk_factors.join(' · '));
  setText('report-subscriptions', String(report.recurring_payments.length)); setText('report-recurring', rub.format(report.kpis.estimated_monthly_recurring)); setText('report-reserve', rub.format(report.report.average_monthly_reserve)); setText('report-income-state', report.kpis.total_income > 0 ? 'Доходы найдены' : 'Нет данных');
  const recurringShare = report.kpis.total_income ? report.kpis.estimated_monthly_recurring / Math.max(1, report.kpis.total_income) : 0; setText('report-payment-state', recurringShare > 0.25 ? 'Высокая нагрузка' : 'Под контролем'); renderReportSlide(state.reportSlide); renderMerchantDetail();
}
function renderReportSlide(index) {
  state.reportSlide = Number(index) === 1 ? 1 : 0;
  document.querySelectorAll('[data-report-slide]').forEach((slide) => slide.classList.toggle('is-active', Number(slide.dataset.reportSlide) === state.reportSlide));
  document.querySelectorAll('[data-report-to]').forEach((dot) => dot.classList.toggle('is-active', Number(dot.dataset.reportTo) === state.reportSlide));
}
function renderMerchantDetail() {
  const root = el('merchant-detail-list'); root.replaceChildren(); const items = state.dashboard?.merchants?.slice(0, 8) || [];
  if (!items.length) { root.append(emptyCard('Нет данных о продавцах', 'После импорта MANI покажет концентрацию расходов.')); return; }
  const hero = node('article', 'hero-number compact'); hero.append(node('small', '', 'Три крупнейших продавца'), node('strong', '', `${Math.round(state.dashboard.report.top_three_merchants_share * 100)}%`), node('p', '', 'доля всех расходов в доступном периоде')); root.append(hero);
  const max = Math.max(...items.map((item) => item.amount), 1);
  items.forEach((item, index) => { const card = node('article', 'merchant-row'); const top = node('div'); top.append(node('span', '', `${index + 1}. ${item.name}`), node('strong', '', rub.format(item.amount))); const track = node('span', 'merchant-track'); const fill = node('i'); fill.style.width = `${Math.max(5, item.amount / max * 100)}%`; track.append(fill); card.append(top, track, node('small', '', `${item.count} ${plural(item.count, 'операция', 'операции', 'операций')} · ${Math.round(item.share * 100)}%`)); root.append(card); });
}
function emptyCard(title, copy) { const card = node('article', 'empty-card'); card.append(node('strong', '', title), node('p', '', copy)); return card; }

function renderBanks() {
  const root = el('connected-banks'); root.replaceChildren(); const groups = groupedAccounts();
  if (!groups.size) root.append(emptyCard('Банков пока нет', 'Добавьте Т‑Банк и загрузите CSV с реальными операциями или используйте демо-набор.'));
  for (const [provider, accounts] of groups) {
    const card = button('connected-bank-card'); card.addEventListener('click', () => { state.selectedProvider = provider; navigate('bank-detail'); }); const head = node('div'); head.append(bankLogo(provider), node('span', '', providerLabel(provider)), node('i', 'status-ok', '✓'));
    card.append(head, node('strong', '', formatAccountsBalance(accounts)), node('small', '', `${accounts.length} ${plural(accounts.length, 'счёт', 'счёта', 'счетов')} · данные актуальны`)); root.append(card);
  }
  root.append(button('button pale json-button', 'Импортировать нормализованный JSON', () => el('json-import').click()));
}
function renderBankStep() {
  const root = el('bank-step'); root.replaceChildren();
  if (state.bankStep === 'list') {
    root.append(node('p', 'bank-eyebrow', 'Подключение банка'), node('h1', '', 'Выберите банк'), node('p', 'bank-copy', 'Т‑Банк доступен для безопасной проверки на реальной выгрузке. Пароль, PIN и SMS‑код MANI не запрашивает.'));
    const list = node('div', 'bank-choice-list'); list.append(bankChoice('tbank', 'Т‑Банк', 'Реальные операции', true), bankChoice('sber', 'СберБанк', 'Скоро', false), bankChoice('alfa', 'АльфаБанк', 'Скоро', false), bankChoice('vtb', 'ВТБ', 'Скоро', false)); root.append(list); return;
  }
  if (state.bankStep === 'tbank-options') {
    root.append(node('p', 'bank-eyebrow', 'Т‑Банк · локальное подключение'), node('h1', '', 'Войти — остальное сделает MANI'), node('p', 'bank-copy', 'При первом входе MANI заберёт доступную историю. Затем будет догружать только новый период с защитным перекрытием, скачивать CSV и обновлять аналитику.'));
    const routes = node('div', 'bank-route-list');
    const local = button('bank-route-card local-bank-route'); local.append(node('b', '', 'Продолжить в Т‑Банке'), node('span', '', 'Сохранённая сессия используется до тех пор, пока её принимает банк'), node('i', '', '›')); local.addEventListener('click', () => startLocalTBankBrowser(el('remember-bank-session')?.checked !== false));
    const statement = button('bank-route-card'); statement.append(node('b', '', 'Загрузить готовую CSV‑выписку'), node('span', '', 'Если файл уже скачан — выбрать его вручную'), node('i', '', '›')); statement.addEventListener('click', () => el('tbank-statement-import').click());
    routes.append(local, statement);
    const remember = node('label', 'remember-row local-remember'); const checkbox = node('input'); checkbox.type = 'checkbox'; checkbox.id = 'remember-bank-session'; checkbox.checked = true; const rememberCopy = node('span'); rememberCopy.append(node('b', '', 'Запомнить меня на этом компьютере'), node('small', '', 'Сессия останется в постоянном банковском профиле. Chrome/Edge сможет предложить сохранить пароль или passkey отдельно — только по вашему выбору.')); remember.append(checkbox, rememberCopy);
    root.append(routes, remember, node('p', 'bank-proof', 'MANI не получает сохранённый пароль, PIN, passkey или одноразовый код. Их подставляет и защищает сам браузер или операционная система на официальной странице банка.'), button('text-button light', 'Заполнить демо-данными', importDemo)); return;
  }
  if (state.bankStep === 'local-browser') {
    const status = state.localBankStatus || { state: 'opening' };
    const syncFrom = safeDate(status.sync_plan?.request_from); const syncRange = status.sync_plan?.mode === 'incremental' && syncFrom ? `с ${shortDate.format(syncFrom)}` : 'доступная история';
    const labels = {
      opening: ['Открываем Т‑Банк', 'Подождите, запускается отдельное банковское окно.'],
      awaiting_login: status.reauth_required
        ? ['Банк запросил подтверждение', 'Сохранённая сессия закончилась. Выполните только тот шаг, который сейчас показал сам Т‑Банк.']
        : ['Войдите в Т‑Банк', 'Введите данные только в официальном окне банка. Подтвердите вход способом, который предложит сам Т‑Банк.'],
      bank_open: ['Вход подтверждён', 'Больше ничего нажимать не нужно — MANI начинает автоматическую загрузку операций.'],
      discovering_products: ['Собираю счета и карты', 'MANI определяет продукты, доступные остатки, лимиты и привязанные карты.'],
      preparing_export: ['Забираю данные', `Вход выполнен. MANI готовит официальный экспорт: ${syncRange}.`],
      importing: ['Загружаем операции', 'MANI локально нормализует выписку и пересчитывает аналитику.'],
      data_imported: ['Данные готовы', 'Выписка уже добавлена в ваш кабинет MANI.'],
      closed: ['Банковское окно закрыто', 'Можно открыть его снова: сохранённая сессия останется только на этом компьютере.'],
      error: ['Нужна проверка', status.error || 'Не удалось завершить локальное подключение.'],
    };
    const [title, copy] = labels[status.state] || labels.opening;
    root.append(node('p', 'bank-eyebrow', 'Т‑Банк · официальный сайт'), node('div', `bank-loader local-browser-state ${status.state}`, status.state === 'data_imported' ? '✓' : 'm'), node('h1', '', title), node('p', 'bank-copy', copy));
    const stages = node('div', 'loading-stages local-bank-stages'); stages.append(fact('Авторизация', ['bank_open', 'discovering_products', 'preparing_export', 'importing', 'data_imported'].includes(status.state) ? 'готово' : 'в официальном окне'), fact('Счета и карты', ['preparing_export', 'importing', 'data_imported'].includes(status.state) ? 'собраны' : status.state === 'discovering_products' ? 'загружаются' : 'после входа'), fact('Период операций', syncRange), fact('Импорт в MANI', status.state === 'data_imported' ? `${status.last_import?.transactions || 0} операций` : status.state === 'importing' ? 'идёт' : 'без дополнительных действий')); root.append(stages);
    if (status.session_reused && !status.reauth_required) root.append(node('p', 'bank-proof', 'MANI успешно использует ранее сохранённую сессию — телефон, пароль и SMS вводить заново не нужно.'));
    if (status.automatic_sync && status.next_automatic_at) { const nextSync = safeDate(status.next_automatic_at); if (nextSync) root.append(node('p', 'bank-proof', `Сессия активна. Следующая фоновая проверка — ${longDate.format(nextSync)} в ${timeFormat.format(nextSync)}.`)); }
    if (status.state === 'data_imported') root.append(button('button primary', 'Открыть данные Т‑Банка', async () => { await loadDashboard(); state.selectedProvider = 'tbank'; navigate('bank-detail', { reset: true }); }));
    else root.append(button('button primary', status.state === 'closed' || status.state === 'error' ? 'Открыть окно снова' : 'Проверить данные', status.state === 'closed' || status.state === 'error' ? () => startLocalTBankBrowser(status.remember !== false) : refreshLocalTBankStatus));
    root.append(button('text-button light', 'Закрыть банковское окно', closeLocalTBankBrowser)); return;
  }
  if (state.bankStep === 'partner-required') {
    root.append(node('p', 'bank-eyebrow', 'Автосинхронизация'), node('h1', '', 'Нужен доступ партнёра'), node('p', 'bank-copy', 'Обычный T‑ID подтверждает пользователя, но публично не даёт приложению историю его личных карт. Боевой доступ к финансовым данным банк выдаёт партнёру отдельно после согласования договора, client_id, redirect URI и разрешений.'));
    const facts = node('div', 'loading-stages partner-facts'); facts.append(fact('Форма входа', 'на стороне Т‑Банка'), fact('Пароли и SMS в MANI', 'никогда'), fact('Токены', 'только на сервере'), fact('Текущий статус', 'нужен договор')); root.append(facts, node('p', 'bank-proof warning', 'До выдачи банком прав кнопка «Подключить» не может загрузить личные операции — добавлять фиктивный OAuth нельзя.'), button('button primary', 'Загрузить CSV сейчас', () => el('tbank-statement-import').click())); return;
  }
  if (state.bankStep === 'loading') {
    root.append(node('div', 'bank-loader', 'm'), node('h1', '', 'Читаем выписку'), node('p', 'bank-copy', 'Нормализуем реальные операции и пересчитываем аналитику MANI.'));
    const stages = node('div', 'loading-stages'); stages.append(fact('Файл', 'получен'), fact('Операции', 'обработка'), fact('Дубликаты', 'проверка'), fact('Аналитика MANI', 'следом')); root.append(stages); return;
  }
  root.append(node('div', 'bank-error-icon', '!'), node('h1', '', 'Не удалось прочитать файл'), node('p', 'bank-copy', 'Проверьте, что это CSV из раздела «Операции» Т‑Банка и в нём есть дата, сумма и описание.'), button('button primary', 'Выбрать другой CSV', () => el('tbank-statement-import').click()), button('text-button light', 'Вернуться к способам', () => { state.bankStep = 'tbank-options'; renderBankStep(); }));
}

async function startLocalTBankBrowser(remember = true) {
  state.bankStep = 'local-browser'; state.localBankStatus = { state: 'opening', remember }; renderBankStep();
  try {
    state.localBankStatus = await api('/api/local-connectors/tbank/start', { method: 'POST', body: JSON.stringify({ remember }) });
    renderBankStep(); scheduleBankSessionPolling();
  } catch (error) {
    state.localBankStatus = { state: 'error', remember, error: error.message }; renderBankStep(); toast(error.message, true);
  }
}
async function refreshLocalTBankStatus() {
  try {
    const status = await api('/api/local-connectors/tbank/status'); state.localBankStatus = status;
    if (status.state === 'data_imported' && status.last_import?.imported_at && status.last_import.imported_at !== state.lastLocalImportAt) {
      state.lastLocalImportAt = status.last_import.imported_at; await loadDashboard(); state.selectedProvider = 'tbank';
      toast(`Импортировано ${status.last_import.transactions} ${plural(status.last_import.transactions, 'операция', 'операции', 'операций')}.`);
    }
    if (state.bankStep === 'local-browser') renderBankStep();
  } catch (error) { clearInterval(bankSessionTimer); toast(error.message, true); }
}
function scheduleBankSessionPolling() {
  clearInterval(bankSessionTimer); bankSessionTimer = setInterval(() => { if (state.bankStep === 'local-browser') refreshLocalTBankStatus(); }, 2000);
}
async function closeLocalTBankBrowser() {
  try { state.localBankStatus = await api('/api/local-connectors/tbank/close', { method: 'POST', body: '{}' }); clearInterval(bankSessionTimer); renderBankStep(); }
  catch (error) { toast(error.message, true); }
}
function bankChoice(provider, name, status, enabled) {
  const item = button(`bank-choice${enabled ? '' : ' disabled'}`); item.disabled = !enabled; item.append(bankLogo(provider), node('span', '', name), node('small', '', status), node('b', '', enabled ? '›' : ''));
  if (enabled) item.addEventListener('click', () => { state.selectedProvider = provider; state.bankStep = provider === 'tbank' ? 'tbank-options' : 'list'; renderBankStep(); }); return item;
}
async function importDemo() {
  renderManiState('processing');
  try {
    const result = await api('/api/imports/demo', { method: 'POST', body: '{}' }); await loadDashboard(); state.selectedProvider = 'tbank_demo';
    toast(`Загружено ${result.import.transactions} ${plural(result.import.transactions, 'операция', 'операции', 'операций')}.`); navigate('bank-detail', { reset: true });
  } catch (error) { state.bankStep = 'error'; renderBankStep(); toast(error.message, true); }
}
async function decodeStatementFile(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes[0] === 0xFF && bytes[1] === 0xFE) return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  if (bytes[0] === 0xFE && bytes[1] === 0xFF) return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  return new TextDecoder('utf-8').decode(bytes);
}
async function importTBankStatement(file) {
  state.bankStep = 'loading'; renderBankStep(); renderManiState('processing');
  try {
    const content = await decodeStatementFile(file);
    const result = await api('/api/imports/tbank-statement', { method: 'POST', body: JSON.stringify({ filename: file.name, content }) });
    await loadDashboard(); state.selectedProvider = 'tbank';
    const from = safeDate(result.coverage?.from); const to = safeDate(result.coverage?.to); const range = from && to ? ` за ${shortDate.format(from)} — ${shortDate.format(to)}` : '';
    toast(`Импортировано ${result.import.transactions} ${plural(result.import.transactions, 'операция', 'операции', 'операций')}${range}.`); navigate('bank-detail', { reset: true });
  } catch (error) { state.bankStep = 'error'; renderBankStep(); toast(error.message, true); }
}
function renderBankDetail() {
  const provider = state.selectedProvider; const accounts = (state.dashboard?.accounts || []).filter((account) => account.provider === provider); const objects = (state.dashboard?.bank_objects || []).filter((item) => item.provider === provider); setText('bank-detail-title', providerLabel(provider)); const root = el('bank-detail-content'); root.replaceChildren();
  if (!accounts.length) { root.append(emptyCard('Банк не подключён', 'Вернитесь к выбору банков и загрузите CSV‑выписку.')); return; }
  const hero = node('article', 'bank-detail-hero'); hero.append(bankLogo(provider), node('h1', '', providerLabel(provider)), node('span', 'status-pill', 'Данные актуальны'), node('strong', '', formatAccountsBalance(accounts))); root.append(hero, node('h2', 'date-divider', 'Счета и карты'));
  accounts.forEach((account) => { const cards = accountCards(account); const card = button('detail-card account-row is-interactive'); const copy = node('span'); copy.append(node('b', '', account.name || 'Счёт'), node('small', '', [accountTypeLabel(account.type), cards.length ? cards.join(', ') : ''].filter(Boolean).join(' · '))); const amount = node('span', 'product-balance'); amount.append(node('strong', '', formatAccountBalance(account)), node('b', '', '›')); card.append(copy, amount); card.addEventListener('click', () => { state.selectedAccountId = account.id; state.accountReturnPage = 'bank-detail'; navigate('account-detail'); }); root.append(card); });
  const schedules = objects.filter((item) => item.kind === 'credit_schedule');
  if (schedules.length) { root.append(node('h2', 'date-divider', 'Даты по кредитам')); schedules.forEach((item) => { const card = node('article', 'detail-card bank-object-card'); card.append(node('b', '', item.name || 'Кредитный счёт'), node('small', '', item.status || 'Статус не указан')); const facts = node('div', 'bank-object-facts'); if (item.metadata?.statement_at) facts.append(fact('Следующая выписка', longDate.format(new Date(item.metadata.statement_at)))); if (item.metadata?.payment_due_at) facts.append(fact('Срок платежа', longDate.format(new Date(item.metadata.payment_due_at)))); if (item.metadata?.period_spending !== null && item.metadata?.period_spending !== undefined) facts.append(fact('Траты в периоде', rub.format(item.metadata.period_spending))); card.append(facts); root.append(card); }); }
  const trackers = objects.filter((item) => item.kind === 'bill_subscription');
  if (trackers.length) { root.append(node('h2', 'date-divider', 'Контроль счетов')); const note = node('p', 'bank-data-note', 'Штрафы, налоги и ЖКХ, которые отслеживает сам Т‑Банк.'); root.append(note); trackers.forEach((item) => { const card = node('article', 'detail-card bank-object-row'); const copy = node('span'); copy.append(node('b', '', item.name || 'Счёт'), node('small', '', [item.metadata?.category, ...(item.metadata?.details || []).slice(0, 2)].filter(Boolean).join(' · '))); card.append(copy, node('strong', '', /нет /i.test(item.status || '') ? 'Нет счетов' : item.status || 'Статус неизвестен')); root.append(card); }); }
  const bindings = objects.filter((item) => item.kind === 'payment_binding');
  if (bindings.length) { root.append(node('h2', 'date-divider', 'Привязанные сервисы')); root.append(node('p', 'bank-data-note', 'Это разрешения на оплату через СБП, а не предстоящие списания.')); const grid = node('div', 'binding-grid'); bindings.forEach((item) => { const card = node('article', 'binding-chip'); card.append(node('b', '', item.name), node('small', '', 'СБП · активно')); grid.append(card); }); root.append(grid); }
  root.append(button('button pale', provider === 'tbank' ? 'Обновить через Т‑Банк' : 'Обновить демо-данные', async (event) => { if (provider === 'tbank') { openBankConnectPopover(); state.bankStep = 'tbank-options'; renderBankStep(); return; } const target = event.currentTarget; target.disabled = true; target.textContent = 'Обновляем…'; try { await importDemo(); } finally { target.disabled = false; target.textContent = 'Обновить демо-данные'; } }));
  root.append(button('button danger-link', 'Отключить банк', () => openDisconnectModal(provider)));
}

function addChatBubble(role, content, createdAt, withFeedback = false) {
  const wrap = node('article', `chat-message ${role}`); wrap.append(node('p', '', content), node('small', '', createdAt ? timeFormat.format(new Date(createdAt)) : 'сейчас'));
  if (role === 'assistant' && withFeedback) wrap.append(button('feedback-mini', 'Оценить ответ', () => openFeedbackModal(content))); el('chat-list').append(wrap);
}
async function loadChat() {
  const root = el('chat-list'); root.replaceChildren();
  try {
    const result = await api('/api/assistant/messages');
    if (!result.items.length) addChatBubble('assistant', state.persona === 'roaster' ? 'Ну что, посмотрим, куда разбежались деньги? Я уже готов к цифрам.' : 'Привет! Давай спокойно разберёмся с финансами. Спроси меня о расходах, подписках или рисках.');
    result.items.forEach((item) => addChatBubble(item.role, item.content, item.created_at, item.role === 'assistant')); root.scrollTop = root.scrollHeight;
  } catch (error) { toast(error.message, true); }
}
async function sendChat(message) {
  const text = String(message || '').trim(); if (!text) return; state.lastChatMessage = text; addChatBubble('user', text); el('chat-input').value = '';
  const status = el('chat-status'); status.hidden = false; status.textContent = 'MANI получил запрос…'; el('chat-list').scrollTop = el('chat-list').scrollHeight;
  const timer = setTimeout(() => { status.textContent = 'MANI анализирует данные…'; }, 450);
  try { const result = await api('/api/assistant/chat', { method: 'POST', body: JSON.stringify({ message: text }) }); clearTimeout(timer); status.hidden = true; addChatBubble('assistant', result.answer, null, true); el('chat-list').scrollTop = el('chat-list').scrollHeight; }
  catch (error) { clearTimeout(timer); status.hidden = true; openRetryModal(error.message); }
}

const surveyQuestions = [
  { key: 'name', text: 'Как тебя зовут? Так я смогу обращаться к тебе по‑человечески.', placeholder: 'Ваше имя' },
  { key: 'goal', text: 'Какая финансовая цель сейчас главная?', placeholder: 'Например, накопить подушку' },
  { key: 'children', text: 'Есть ли у тебя дети или регулярные семейные расходы?', placeholder: 'Расскажите коротко' },
];
function startSurvey() {
  state.surveyStep = 0; state.surveyAnswers = { ...(state.profile?.survey || {}) }; const root = el('survey-chat'); root.replaceChildren();
  addSurveyBubble('assistant', 'Давай познакомимся. Ответы останутся в локальном профиле и помогут персонализировать анализ.'); addSurveyBubble('assistant', surveyQuestions[0].text); el('survey-input').placeholder = surveyQuestions[0].placeholder;
}
function addSurveyBubble(role, text) { const bubble = node('article', `chat-message ${role}`); bubble.append(node('p', '', text)); el('survey-chat').append(bubble); el('survey-chat').scrollTop = el('survey-chat').scrollHeight; }
async function submitSurveyAnswer(answer) {
  const question = surveyQuestions[state.surveyStep]; state.surveyAnswers[question.key] = answer; addSurveyBubble('user', answer); state.surveyStep += 1;
  if (state.surveyStep < surveyQuestions.length) { addSurveyBubble('assistant', surveyQuestions[state.surveyStep].text); el('survey-input').placeholder = surveyQuestions[state.surveyStep].placeholder; return; }
  addSurveyBubble('assistant', 'Готово. Теперь мои ответы будут точнее и ближе к твоей ситуации.');
  try { const survey = { ...state.surveyAnswers, completed_at: new Date().toISOString() }; const result = await api('/api/profile', { method: 'PATCH', body: JSON.stringify({ display_name: survey.name || '', survey }) }); state.profile = result.preferences; toast('Знакомство сохранено.'); setTimeout(() => navigate('profile', { reset: true }), 650); }
  catch (error) { toast(error.message, true); }
}

let reportReturnFocus = null;
function openReportPopover() {
  const report = el('report-popover'); reportReturnFocus = document.activeElement; clearInterval(homeBriefingTimer); renderReport();
  report.classList.add('is-popover-open'); report.setAttribute('aria-hidden', 'false'); document.documentElement.classList.add('report-popover-open');
  el('analysis-button').setAttribute('aria-expanded', 'true'); requestAnimationFrame(() => el('report-close').focus());
}
function closeReportPopover(restoreFocus = true) {
  const report = el('report-popover'); if (!report.classList.contains('is-popover-open')) return;
  report.classList.remove('is-popover-open'); report.setAttribute('aria-hidden', 'true'); document.documentElement.classList.remove('report-popover-open'); el('analysis-button').setAttribute('aria-expanded', 'false');
  if (restoreFocus && reportReturnFocus instanceof HTMLElement) reportReturnFocus.focus(); reportReturnFocus = null; if (state.page === 'overview') scheduleHomeBriefing();
}
let bankConnectReturnFocus = null;
function openBankConnectPopover() {
  closeReportPopover(false); clearInterval(homeBriefingTimer); const bank = el('bank-connect-popover'); bankConnectReturnFocus = document.activeElement; state.bankStep = 'list'; renderBankStep();
  bank.classList.add('is-popover-open'); bank.setAttribute('aria-hidden', 'false'); document.documentElement.classList.add('bank-popover-open');
  requestAnimationFrame(() => el('bank-connect-close').focus());
}
function closeBankConnectPopover(restoreFocus = true) {
  const bank = el('bank-connect-popover'); if (!bank.classList.contains('is-popover-open')) return;
  bank.classList.remove('is-popover-open'); bank.setAttribute('aria-hidden', 'true'); document.documentElement.classList.remove('bank-popover-open'); clearInterval(bankSessionTimer);
  if (restoreFocus && bankConnectReturnFocus instanceof HTMLElement) bankConnectReturnFocus.focus(); bankConnectReturnFocus = null; if (state.page === 'overview') scheduleHomeBriefing();
}
function bankConnectBack() {
  if (['partner-required', 'local-browser', 'loading', 'error'].includes(state.bankStep)) { clearInterval(bankSessionTimer); state.bankStep = 'tbank-options'; renderBankStep(); return; }
  if (state.bankStep !== 'list') { state.bankStep = 'list'; renderBankStep(); return; }
  closeBankConnectPopover();
}
function openModal(content) { el('modal-content').replaceChildren(content); el('modal').hidden = false; requestAnimationFrame(() => el('modal').classList.add('is-open')); }
function closeModal() { el('modal').classList.remove('is-open'); setTimeout(() => { el('modal').hidden = true; el('modal-content').replaceChildren(); }, 180); }
function modalLayout(title, copy) { const root = node('div', 'modal-body'); root.append(node('h2', '', title), node('p', '', copy)); return root; }
function openLegal(type) {
  const data = {
    privacy: ['Политика конфиденциальности', 'Локальный прототип хранит данные аккаунта и импортированные банковские данные в SQLite на этом компьютере. Перед публикацией потребуется юридически согласованная полная версия документа.'],
    terms: ['Пользовательское соглашение', 'Это продуктовый локальный прототип MANI. Он не совершает платежи и не является банковским приложением. Перед запуском для пользователей условия должны пройти юридическую проверку.'],
    cookies: ['Политика Cookie', 'Сейчас используется только защищённая HTTP-only cookie локальной сессии. Рекламные и сторонние cookie не подключены.'],
  }[type] || ['Документ', 'Раздел находится в разработке.'];
  const root = modalLayout(data[0], data[1]); root.append(button('button primary', 'Понятно', closeModal)); openModal(root);
}
function openFeedbackModal(answer = '') {
  const root = modalLayout('Оценить ответ MANI', 'Что можно улучшить? Это локальная форма интерфейса; отправка в службу поддержки пока не подключена.'); const choices = node('div', 'feedback-choices');
  ['Полезно', 'Неточно', 'Непонятно', 'Не по теме'].forEach((text) => choices.append(button('chip', text, (event) => event.currentTarget.classList.toggle('is-selected'))));
  const comment = node('textarea'); comment.placeholder = 'Комментарий (необязательно)'; comment.maxLength = 400; root.append(choices, comment, button('button primary', 'Отправить', () => { closeModal(); toast(answer ? 'Оценка ответа сохранена локально.' : 'Сообщение принято локально.'); })); openModal(root);
}
function openRetryModal(message) { const root = modalLayout('MANI не ответил', message || 'Запрос занял слишком много времени.'); root.append(button('button primary', 'Повторить', () => { closeModal(); sendChat(state.lastChatMessage); }), button('button pale', 'Закрыть', closeModal)); openModal(root); }
function openDeleteModal() {
  const root = modalLayout('Удалить аккаунт?', 'Будут безвозвратно удалены профиль, банковские данные, операции и история чата этого локального пользователя.'); const form = node('form', 'modal-form'); const input = node('input'); input.type = 'password'; input.placeholder = 'Введите пароль'; input.required = true; const error = node('p', 'form-error');
  const submit = button('button danger', 'Удалить всё'); submit.type = 'submit';
  form.append(input, error, submit, button('button pale', 'Отмена', closeModal));
  form.addEventListener('submit', async (event) => { event.preventDefault(); try { await api('/api/profile', { method: 'DELETE', body: JSON.stringify({ password: input.value }) }); closeModal(); toast('Локальный аккаунт и его данные удалены.'); showAuth('welcome'); } catch (apiError) { error.textContent = apiError.message; } }); root.append(form); openModal(root);
}
function openDisconnectModal(provider) {
  const root = modalLayout(`Отключить ${providerLabel(provider)}?`, 'В этом прототипе отключение удалит импортированные данные выбранного банка из локальной базы.');
  root.append(button('button danger', 'Отключить и удалить данные', async () => { try { await api(`/api/banks/${encodeURIComponent(provider)}`, { method: 'DELETE', body: '{}' }); closeModal(); await loadDashboard(); navigate('overview', { reset: true }); toast('Банк и его локальные данные отключены.'); } catch (error) { toast(error.message, true); } }), button('button pale', 'Отмена', closeModal)); openModal(root);
}

document.querySelectorAll('[data-auth-go]').forEach((item) => item.addEventListener('click', () => showAuth(item.dataset.authGo)));
document.querySelectorAll('[data-password-toggle]').forEach((item) => item.addEventListener('click', () => { const input = el(item.dataset.passwordToggle); input.type = input.type === 'password' ? 'text' : 'password'; item.textContent = input.type === 'password' ? '◉' : '○'; }));
document.querySelectorAll('[data-open-legal]').forEach((item) => item.addEventListener('click', () => openLegal(item.dataset.openLegal)));
document.querySelectorAll('[data-page]').forEach((item) => item.addEventListener('click', () => { if (item.closest('.report-page')) closeReportPopover(false); navigate(item.dataset.page); }));
document.querySelectorAll('[data-back]').forEach((item) => item.addEventListener('click', () => item.dataset.back ? navigate(item.dataset.back) : goBack()));
document.querySelectorAll('[data-close]').forEach((item) => item.addEventListener('click', closeToRoot));
document.querySelectorAll('[data-report-to]').forEach((item) => item.addEventListener('click', () => renderReportSlide(item.dataset.reportTo)));
document.querySelectorAll('[data-prompt]').forEach((item) => item.addEventListener('click', () => sendChat(item.dataset.prompt)));
document.querySelectorAll('.persona-choice').forEach((item) => item.addEventListener('click', () => applyPersona(item.dataset.persona)));
document.querySelectorAll('[data-flow-filter]').forEach((item) => item.addEventListener('click', () => setCashflowMode(item.dataset.flowFilter, true)));
el('analysis-button').addEventListener('click', openReportPopover); el('report-close').addEventListener('click', () => closeReportPopover());
el('report-popover').addEventListener('click', (event) => { if (event.target === el('report-popover')) closeReportPopover(); });
el('bank-connect-close').addEventListener('click', () => closeBankConnectPopover()); el('bank-connect-back').addEventListener('click', bankConnectBack);
el('bank-connect-popover').addEventListener('click', (event) => { if (event.target === el('bank-connect-popover')) closeBankConnectPopover(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { closeReportPopover(); closeBankConnectPopover(); } });

el('login-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const error = el('login-error'); error.textContent = ''; const submit = el('login-submit'); submit.disabled = true;
  try { const result = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: el('login-email').value, password: el('login-password').value }) }); await showApp(result.user); }
  catch (apiError) { error.textContent = apiError.message; } finally { submit.disabled = false; }
});
el('register-form').addEventListener('submit', (event) => {
  event.preventDefault(); const email = el('register-email').value.trim(); const password = el('register-password').value; const error = el('register-error'); error.textContent = '';
  if (!/^\S+@\S+\.\S+$/.test(email)) { error.textContent = 'Введите корректную почту.'; return; } if (password.length < 10) { error.textContent = 'Пароль должен содержать не менее 10 символов.'; return; }
  state.pendingSignup = { email, password }; setText('verify-email', email); showAuth('verify');
});
el('verify-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const error = el('verify-error'); error.textContent = '';
  if (el('verify-code').value !== '123456') { error.textContent = 'Неверный локальный код. Используйте 123456.'; return; } if (!state.pendingSignup) { showAuth('register'); return; }
  try { const result = await api('/api/auth/register', { method: 'POST', body: JSON.stringify(state.pendingSignup) }); state.pendingSignup = null; await showApp(result.user); }
  catch (apiError) { error.textContent = apiError.message; }
});
el('recovery-form').addEventListener('submit', (event) => { event.preventDefault(); state.recoveryEmail = el('recovery-email').value.trim(); setText('recovery-code-email', state.recoveryEmail); showAuth('recovery-code'); });
el('recovery-code-form').addEventListener('submit', (event) => { event.preventDefault(); const error = el('recovery-code-error'); error.textContent = ''; if (el('recovery-code').value !== '123456') { error.textContent = 'Неверный локальный код. Используйте 123456.'; return; } showAuth('recovery-new'); });
el('recovery-new-form').addEventListener('submit', (event) => {
  event.preventDefault(); const password = el('recovery-password').value; const confirm = el('recovery-confirm').value; const error = el('recovery-new-error'); error.textContent = '';
  if (password.length < 10) { error.textContent = 'Пароль должен содержать не менее 10 символов.'; return; } if (password !== confirm) { error.textContent = 'Пароли не совпадают.'; return; }
  toast('Экран проверен. Серверная смена пароля пока не подключена.'); showAuth('login');
});
el('onboarding-next').addEventListener('click', () => { if (state.onboardingStep < 4) { state.onboardingStep += 1; renderOnboarding(); } else finishOnboarding(); });
el('onboarding-skip').addEventListener('click', () => { state.onboardingStep = 4; renderOnboarding(); });
el('balance-visibility').addEventListener('click', (event) => { event.stopPropagation(); state.balancesHidden = !state.balancesHidden; renderHomeMoney(); renderHomeBriefing(); });
el('home-insight-action').addEventListener('click', () => homeBriefingSlides[state.homeInsightIndex]?.action?.());
el('home-insight-next').addEventListener('click', () => setHomeInsight(state.homeInsightIndex + 1));
el('home-briefing').addEventListener('mouseenter', () => clearInterval(homeBriefingTimer)); el('home-briefing').addEventListener('mouseleave', scheduleHomeBriefing);
el('home-briefing').addEventListener('focusin', () => clearInterval(homeBriefingTimer)); el('home-briefing').addEventListener('focusout', scheduleHomeBriefing);
document.querySelectorAll('input[name="assistant-tone"]').forEach((input) => input.addEventListener('change', async () => {
  try { const result = await api('/api/profile', { method: 'PATCH', body: JSON.stringify({ assistant_tone: input.value }) }); state.profile = result.preferences; applyPersona(input.value); renderManiState(); toast(`${personaDetails[input.value].label} выбран.`); }
  catch (error) { toast(error.message, true); }
}));
el('chat-form').addEventListener('submit', (event) => { event.preventDefault(); sendChat(el('chat-input').value); });
el('survey-form').addEventListener('submit', (event) => { event.preventDefault(); const answer = el('survey-input').value.trim(); if (!answer) return; el('survey-input').value = ''; submitSurveyAnswer(answer); });
el('report-chat').addEventListener('click', async () => {
  const report = state.dashboard?.report;
  closeReportPopover(false);
  navigate('assistant', { reset: true, skipChatLoad: true });
  await loadChat();
  await sendChat(`Разбери мой финансовый отчёт: риск — ${report?.risk || 'не определён'}, средний резерв — ${rub.format(report?.average_monthly_reserve || 0)}, топ‑3 продавцов — ${Math.round((report?.top_three_merchants_share || 0) * 100)}%. Что мне сделать в первую очередь?`);
});
el('report-share').addEventListener('click', async () => {
  const report = state.dashboard?.report; const summary = `MANI: риск ${report?.risk || 'не определён'}, средний чек ${rub.format(report?.average_check || 0)}, резерв ${rub.format(report?.average_monthly_reserve || 0)}.`;
  try { if (navigator.share) await navigator.share({ title: 'Мой отчёт MANI', text: summary }); else { await navigator.clipboard.writeText(summary); toast('Краткий отчёт скопирован.'); } }
  catch (error) { if (error.name !== 'AbortError') toast('Не удалось поделиться отчётом.', true); }
});
el('logout-button').addEventListener('click', async () => { try { await api('/api/auth/logout', { method: 'POST', body: '{}' }); } finally { state.history = []; showAuth('welcome'); } });
el('feedback-button').addEventListener('click', () => openFeedbackModal()); el('delete-open').addEventListener('click', openDeleteModal); el('modal').addEventListener('click', (event) => { if (event.target === el('modal')) closeModal(); });
el('json-import').addEventListener('change', async (event) => {
  const file = event.target.files?.[0]; if (!file) return;
  try { const payload = JSON.parse(await file.text()); if (!payload.provider) payload.provider = 'local_json'; const result = await api('/api/imports/normalized', { method: 'POST', body: JSON.stringify(payload) }); await loadDashboard(); toast(`Импортировано ${result.import.transactions} ${plural(result.import.transactions, 'операция', 'операции', 'операций')}.`); navigate('overview', { reset: true }); }
  catch (error) { toast(error instanceof SyntaxError ? 'Файл не является корректным JSON.' : error.message, true); } finally { event.target.value = ''; }
});
el('tbank-statement-import').addEventListener('change', async (event) => {
  const file = event.target.files?.[0]; if (!file) return;
  try { await importTBankStatement(file); } finally { event.target.value = ''; }
});

document.addEventListener('click', (event) => {
  const target = event.target.closest('button,a');
  if (!target) return;
  const action = target.dataset.page || target.dataset.flowFilter || target.id || target.getAttribute('aria-label') || target.textContent?.trim().slice(0, 60) || 'control';
  previewTrack('control_click', { page: state.page, action });
});
window.addEventListener('error', (event) => previewTrack('js_error', { page: state.page, action: String(event.message || 'unknown').slice(0, 120) }));
window.addEventListener('unhandledrejection', () => previewTrack('js_error', { page: state.page, action: 'unhandled_promise_rejection' }));

(async function boot() { previewTrack('preview_open', { page: 'boot' }); try { const session = await api('/api/session'); if (session.user) await showApp(session.user); else showAuth('welcome'); } catch { showAuth('welcome'); } })();
