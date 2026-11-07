import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(p,'utf8'),home=read('index.html');
const pages=[...read('sitemap.xml').matchAll(/<loc>https:\/\/moimani.ai([^<]*)<\/loc>/g)].map(m=>m[1]==='/'?'index.html':m[1]==='/support/bank-connection'?'bank-connection.html':m[1].slice(1)+'.html');
test('available smartphone version has usable raw actions and one config',()=>{
 const ctx={window:{}};vm.runInNewContext(read('product-config.js'),ctx);
 assert.equal(ctx.window.MANI_PRODUCT_CONFIG.status,'web_beta');assert.equal(ctx.window.MANI_PRODUCT_CONFIG.launch,null);
 assert.equal(ctx.window.MANI_PRODUCT_CONFIG.web.url,'https://webapp.moimani.ai/');
 assert.equal([...home.matchAll(/<h1\b/g)].length,1);
 for(const f of pages){const html=read(f),ctas=[...html.matchAll(/<a\b[^>]*data-product-cta[^>]*>/g)];assert.ok(ctas.length>=2,f);for(const [tag]of ctas){assert.ok(tag.includes('href="https://webapp.moimani.ai/"'),f);assert.ok(!tag.includes('data-open-waitlist'),f);}}
 assert.doesNotMatch(home,/27 октября|data-launch-countdown|ИИ по отдельному согласию|Общий запуск пока готовим/);
 assert.match(home,/Узнать о выходе в магазинах приложений/);assert.match(home,/name="platform"/);
});
test('hero uses the captured current UI, not the invented dashboard',()=>{
 const file='assets/mani/product/mani-finances-screen-tall-20261106@2x.png';assert.ok(existsSync(file));
 const png=readFileSync(file);assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),780);assert.equal(png.readUInt32BE(20),1540);
 assert.ok(home.includes('data-device-model="iphone-air"'));assert.ok(home.includes('mani-finances-screen-tall-20261106@2x.webp'));assert.doesNotMatch(home,/Так выглядит Мани на смартфоне|Все суммы на изображении вымышлены/);assert.doesNotMatch(home,/clarity-product-glass|84 520|18 540/);
});
test('brand actions preserve the approved orange gradient',()=>{
 for(const f of ['clarity-home.css','clarity-shell.css']){const css=read(f);for(const token of ['rgba(255,151,101,.96)','rgba(255,104,47,.96)','rgba(239,76,20,.97)'])assert.ok(css.includes(token),f);assert.doesNotMatch(css,/#c54a1e|#b33f16/);}
});
test('shared chrome is identical across indexed pages',()=>{
 const header=home.match(/<header class="header nm-header">[\s\S]*?<\/header>/)[0],footer=home.match(/<footer class="nm-footer"[^>]*>[\s\S]*?<\/footer>/)[0];
 for(const file of [...pages,'404.php']){assert.ok(read(file).includes(header),file+' header');assert.ok(read(file).includes(footer),file+' footer');assert.ok(read(file).includes('/site-footer.css?'),file+' isolated footer styles');}
});
test('attribution, duplicate protection, forms and sharing remain wired',()=>{
 const js=read('script.js');for(const contract of ['Idempotency-Key','firstTouch','lastTouch','data.duplicate','trackWaitlistConversion','referral_share','data-referral-card','/api/contact','/api/waitlist','formData.get("platform")'])assert.ok(js.includes(contract),contract);
 for(const token of ['analytics-client.js','103776176','3681438','G-P6TDY2N5FK','data-contact-form','data-waitlist-form','data-share-example'])assert.ok(home.includes(token),token);
});
test('initial page stays light and available features have concrete examples',()=>{
 assert.doesNotMatch(home,/hero-flow|three\.module|mani-home\.min\.css/);
 assert.ok(read('clarity-home.css').length+read('clarity-shell.css').length<50000);
 for(const text of ['Не узнаёшь списание?','Хочешь разобраться без таблиц?','Нужен контекст покупки?','Сбер и Т Банк','Мани отвечает по доступным данным'])assert.ok(home.includes(text),text);
});
