import {calculate} from './model.mjs';
const form=document.querySelector('#budget-form'),result=document.querySelector('#budget-result'),error=document.querySelector('#budget-error');
const fmt=n=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:2}).format(n/100);
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const track=name=>window.ManiAnalytics?.track(name,{section:'budget_calculator'});
let started=false,completed=false;
function invalidate(){result.hidden=true;error.textContent='';if(!started){track('calculator_start');started=true;}}
form.addEventListener('input',invalidate);
form.addEventListener('change',invalidate);
form.addEventListener('submit',e=>{
  e.preventDefault();error.textContent='';result.hidden=true;
  try {
    const r=calculate({...Object.fromEntries(new FormData(form)),today:today()});
    document.querySelector('#budget-total').textContent=fmt(Math.max(0,r.available));
    document.querySelector('#budget-daily').textContent=fmt(r.daily);
    document.querySelector('#budget-week').textContent=`${fmt(r.period)} на ближайшие ${r.periodDays} дн`;
    document.querySelector('#budget-explanation').textContent=r.shortage>0
      ? `На обязательные платежи не хватает ${fmt(r.shortage)} ещё до резерва. Этот расчёт не означает, что можно обойтись без еды и транспорта. Проверь суммы и сроки обязательств`
      : r.available<0 ? `После обязательных платежей на выбранный резерв не хватает ${fmt(-r.available)}. Проверь размер резерва и расходы, прежде чем планировать покупки`
      : r.available===0 ? 'После платежей и резерва свободного остатка нет. Проверь, включены ли необходимые повседневные расходы в твой план'
      : `Считаем ${r.days} дн: сегодня включительно, день поступления дохода не включаем. Дневной ориентир округлён вниз до копеек`;
    document.querySelector('#budget-formula').textContent=`${fmt(r.funds)} − ${fmt(r.required)} − ${fmt(r.buffer)} = ${fmt(r.available)}`;
    result.hidden=false;result.focus();if(!completed){track('calculator_complete');completed=true;}
  } catch(err) {error.textContent=err.message;error.focus();}
});
document.querySelector('#budget-share').addEventListener('click',async()=>{
  const url='https://moimani.ai/byudzhet-do-zarplaty',status=document.querySelector('#budget-share-status');
  status.textContent='';
  try {
    if(navigator.share)await navigator.share({title:'Сколько можно тратить до зарплаты',url});
    else {await navigator.clipboard.writeText(url);status.textContent='Ссылка скопирована, твоих сумм в ней нет';}
    track('calculator_share');
  } catch(err) {if(err.name!=='AbortError')status.textContent=`Скопируй ссылку: ${url}`;}
});
document.querySelector('#budget-fields').disabled=false;
