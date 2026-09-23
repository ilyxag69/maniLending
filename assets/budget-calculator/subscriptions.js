import {subscriptions} from './subscriptions-model.mjs';
const form=document.querySelector('#subscriptions-form'),rows=document.querySelector('#subscription-rows'),result=document.querySelector('#subscriptions-result'),error=document.querySelector('#subscriptions-error'),add=document.querySelector('#subscription-add');
let counter=0,started=false,completed=false;
const track=name=>window.ManiAnalytics?.track(name,{section:'subscriptions_calculator'});
const fmt=n=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:2}).format(n/100);
function invalidate(){result.hidden=true;error.textContent='';if(!started){started=true;track('calculator_start');}}
function addRow(focus=false){
  const row=document.querySelector('#subscription-template').content.cloneNode(true);
  const fieldset=row.querySelector('fieldset');
  const label=`Подписка ${++counter}`;
  fieldset.querySelector('legend').textContent=label;
  fieldset.querySelector('[data-remove]').setAttribute('aria-label',`Удалить: ${label}`);
  fieldset.querySelector('[data-remove]').addEventListener('click',()=>{fieldset.remove();add.disabled=false;invalidate();add.focus();});
  rows.append(row);add.disabled=rows.children.length>=30;
  if(focus){fieldset.querySelector('input').focus();invalidate();}
}
add.addEventListener('click',()=>addRow(true));
form.addEventListener('input',invalidate);
form.addEventListener('change',invalidate);
form.addEventListener('submit',e=>{
  e.preventDefault();error.textContent='';result.hidden=true;
  try{
    const data=[...rows.children].map(row=>({amount:row.querySelector('[data-amount]').value,period:row.querySelector('select').value,remove:row.querySelector('[data-unused]').checked}));
    const r=subscriptions(data);
    for(const key of ['annual','monthly','removable','remaining']) document.querySelector(`[data-total="${key}"]`).textContent=fmt(r[key]);
    result.hidden=false;result.focus();if(!completed){completed=true;track('calculator_complete');}
  }catch(err){error.textContent=err.message;error.focus();}
});
document.querySelector('#subscriptions-share').addEventListener('click',async()=>{
  const url='https://moimani.ai/poisk-podpisok',status=document.querySelector('#subscriptions-share-status');
  status.textContent='';
  try{if(navigator.share)await navigator.share({title:'Сколько стоят твои подписки за год',url});else{await navigator.clipboard.writeText(url);status.textContent='Ссылка скопирована, без твоих подписок и сумм';}track('calculator_share');}
  catch(err){if(err.name!=='AbortError')status.textContent=`Скопируй ссылку: ${url}`;}
});
addRow();document.querySelector('#subscriptions-controls').disabled=false;
