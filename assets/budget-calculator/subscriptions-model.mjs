import {money} from './model.mjs';
// Weekly charges are annualized with 52 payments, not a calendar forecast
export function subscriptions(rows) {
  if (!rows.length || rows.length>30) throw new Error('Добавь от 1 до 30 подписок');
  let annual=0, removable=0;
  for (const row of rows) {
    const periods={month:12,year:1,week:52};
    if (!Object.hasOwn(periods,row.period)) throw new Error('Проверь период оплаты');
    const factor=periods[row.period];
    const cost=money(row.amount)*factor;
    annual+=cost;if(row.remove)removable+=cost;
  }
  return {annual, monthly:Math.round(annual/12),removable,remaining:annual-removable};
}
