export function money(value) {
  const normalized = String(value).trim().replace(/[\s\u00a0\u202f]/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) throw new Error('Укажи сумму от 0 до 100 000 000 ₽, не больше двух знаков после запятой');
  const cents = Math.round(Number(normalized) * 100);
  if (!Number.isSafeInteger(cents) || cents > 10000000000) throw new Error('Сумма должна быть не больше 100 000 000 ₽');
  return cents;
}
function calendarDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Укажи дату следующего дохода');
  const [y,m,d] = value.split('-').map(Number);
  const stamp = Date.UTC(y,m-1,d), date = new Date(stamp);
  if (date.getUTCFullYear()!==y || date.getUTCMonth()!==m-1 || date.getUTCDate()!==d) throw new Error('Проверь дату');
  return stamp / 86400000;
}
export function calculate({balance, bills, reserve, payday, today}) {
  const days = calendarDay(payday) - calendarDay(today);
  if (days <= 0) throw new Error(days===0 ? 'Если доход уже пришёл, обнови остаток и выбери следующую дату. Если ещё ждёшь, рассчитай план после поступления' : 'Дата дохода должна быть позже сегодняшнего дня');
  if (days > 366) throw new Error('Выбери дату в пределах ближайшего года');
  const funds=money(balance), required=money(bills), buffer=money(reserve);
  const available=funds-required-buffer;
  return {days, funds, required, buffer, available, daily:Math.floor(Math.max(0,available)/days), periodDays:Math.min(7,days), period:Math.floor(Math.max(0,available)*Math.min(7,days)/days), shortage:Math.max(0,required-funds)};
}
