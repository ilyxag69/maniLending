import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const pages=['byudzhet-do-zarplaty','finansovyi-pomoshchnik','guides','kontrol-rashodov','neznakomoe-spisanie','poisk-podpisok','obiedinit-scheta'];
test('all guides load the current shared link styles',async()=>{
  for(const page of pages){
    const html=await readFile(new URL(`../${page}.html`,import.meta.url),'utf8');
    assert.ok(html.includes('guide-pages.css?v=20260923-links-2'),page);
    assert.ok(html.includes('guide-base.min.css?v=20260923-1'),page);
    assert.equal((html.match(/<h1[ >]/g)||[]).length,1,page);
  }
});
test('calculator links resolve to existing local sections',async()=>{
  for(const page of ['obiedinit-scheta','finansovyi-pomoshchnik']){
    const html=await readFile(new URL(`../${page}.html`,import.meta.url),'utf8');
    const links=[...html.matchAll(/href="\/([^"#]+)#calculator"/g)];
    assert.ok(links.length>0,page);
    for(const [,target] of links){
      const targetHtml=await readFile(new URL(`../${target}.html`,import.meta.url),'utf8');
      assert.ok(targetHtml.includes('id="calculator"'),target);
    }
  }
});
