import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const code=readFileSync('product-status.js','utf8');
function client(now,launch={startsAt:'2026-10-27T09:00:00+03:00',label:'27 октября в 09:00 МСК'}){
 const events=[],attrs=new Map(),handlers=[],parts=Array.from({length:4},()=>({textContent:''}));
 const cta={dataset:{},hidden:false,href:'/#launch',childNodes:[{nodeType:3,nodeValue:'Откроется 27 октября'}],querySelector:()=>null,
  hasAttribute:k=>attrs.has(k),setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k),addEventListener:(k,fn)=>handlers.push(fn)};
 const status={textContent:''},clock={hidden:false,querySelectorAll:()=>parts};
 let interval;let time=now;
 class Clock extends Date {static now(){return time;}}
 const ctx={Date:Clock,URL,Node:{TEXT_NODE:3},location:{pathname:'/'},console,
  MANI_PRODUCT_CONFIG:{status:'web_beta',launch,web:{url:'https://webapp.moimani.ai/',cta:'Открыть mani'},waitlist:{}},
  ManiAnalytics:{attribution:()=>({source:'instagram',campaign:'team_content',email:'do-not-forward@example.test'}),track:(...args)=>events.push(args)},
  setInterval:fn=>interval=fn,addEventListener(){},document:{addEventListener(){},documentElement:{dataset:{}},querySelectorAll:s=>s==='[data-product-cta]'?[cta]:s==='[data-launch-state]'?[status]:s==='[data-launch-countdown]'?[clock]:[]}};
 ctx.window=ctx;vm.runInNewContext(code,ctx);
 return {ctx,cta,attrs,events,parts,status,clock,handlers,advance:ms=>{time=ms;interval();},click:()=>{let prevented=false;handlers.forEach(fn=>fn({preventDefault(){prevented=true;}}));return prevented;}};
}
const starts=Date.parse('2026-10-27T06:00:00Z');
test('Moscow launch instant, last second and exactly zero are unambiguous',()=>{
 const c=client(starts-1000);assert.equal(c.parts.at(-1).textContent,'01');assert.equal(c.attrs.get('aria-disabled'),'true');assert.equal(c.cta.href,'/#launch');assert.equal(c.click(),true);assert.equal(c.events.length,0);
 c.advance(starts);assert.equal(c.attrs.has('aria-disabled'),false);assert.equal(c.clock.hidden,true);assert.equal(c.cta.childNodes[0].nodeValue.trim(),'Открыть mani');assert.equal(new URL(c.cta.href).hostname,'webapp.moimani.ai');
 assert.equal(c.click(),false);assert.equal(c.events.length,1);assert.equal(new URL(c.cta.href).searchParams.get('utm_source'),'instagram');assert.equal(c.cta.href.includes('example.test'),false);
});
test('days/minutes, tab resume, background time and repeat apply do not drift or duplicate events',()=>{
 const c=client(starts-86400000-3600000-61000);assert.deepEqual(c.parts.map(p=>p.textContent),['01','01','01','01']);
 c.advance(starts+500000);c.ctx.ManiProductStatus.apply();c.ctx.ManiProductStatus.apply();c.click();assert.equal(c.events.length,1);assert.equal(c.handlers.length,2);
 c.advance(starts-1);assert.equal(c.click(),true);assert.equal(c.events.length,1);
});
test('invalid or timezone-free configured date fails closed, no negative countdown',()=>{
 for(const startsAt of ['bad','2026-10-27T09:00:00','']){const c=client(starts+999999,{startsAt});assert.equal(c.attrs.get('aria-disabled'),'true');assert.equal(c.cta.href,'/#launch');assert.equal(c.status.textContent,'Дата запуска уточняется');assert.equal(c.events.length,0);}
});
test('available raw HTML routes primary CTAs directly to the app without scripts',()=>{
 const home=readFileSync('index.html','utf8');const tags=[...home.matchAll(/<a\b[^>]*\bdata-product-cta\b[^>]*>/g)].map(m=>m[0]);assert.ok(tags.length>=4);assert.ok(tags.every(tag=>tag.includes('href="https://webapp.moimani.ai/"')));
 assert.doesNotMatch(home,/data-launch-countdown|Откроется 27 октября|data-hero-flow/);
});
test('a passed date cannot open paused public launch',()=>{
 const c=client(starts+99999999);c.ctx.MANI_PRODUCT_CONFIG={status:'waitlist',launch:{startsAt:'2020-01-01T00:00:00Z'},waitlist:{cta:'Сообщить о запуске'},release:{label:'Готовим публичный запуск'}};
 c.ctx.ManiProductStatus.apply();assert.equal(c.cta.href,'/#waitlist-dialog');assert.equal(c.attrs.has('data-open-waitlist'),true);assert.equal(c.ctx.ManiLaunchClock.state(c.ctx.MANI_PRODUCT_CONFIG).open,false);
 assert.equal(c.click(),false);assert.equal(c.events.length,0);assert.equal(c.cta.href,'/#waitlist-dialog');
 const config=readFileSync('product-config.js','utf8');assert.match(config,/status: "web_beta"/);assert.match(config,/launch: null/);
});
