// Exhaustive interaction checks against a read-only production snapshot.
import {JSDOM} from 'jsdom';
import {runInContext} from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
const snapshotPath=process.env.CATALOG_SNAPSHOT||'.netlify/catalog-audit/models.json';
const snapshot=fs.existsSync(snapshotPath)?JSON.parse(fs.readFileSync(snapshotPath,'utf8')):null;
test('every production section, list selection, rendered hotspot and device filter',{skip:!snapshot&&'Run npm run audit:catalog to fetch a read-only production snapshot first.'},async()=>{
 const dom=new JSDOM(fs.readFileSync('public/catalog/index.html','utf8'),{url:'https://detal.example/catalog/',runScripts:'outside-only'}),w=dom.window,d=w.document,ctx=dom.getInternalVMContext();
 w.fetch=async url=>({ok:true,json:async()=>url==='/api/session'?{admin:true}:{models:structuredClone(snapshot)}});
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLElement.prototype.scrollIntoView=function(){};
 runInContext('const models=[];',ctx);
 for(const file of ['devices','ui','app','admin','pdf'])runInContext(fs.readFileSync(`public/catalog/${file}.js`,'utf8'),ctx);
 await new Promise(r=>setTimeout(r,20));let listClicks=0,hotspotClicks=0,keyboardChecks=0;
 try{
  assert.equal(d.body.dataset.state,'ready');
  for(const m of snapshot){
   await w.chooseModel(m.id);
   assert.equal(d.getElementById('modelTitle').textContent,m.name);
   assert.equal(d.querySelector('#diagram image').getAttribute('href'),m.image);
   assert.equal(d.getElementById('devicePicker').value,w.deviceKey(m));
   assert.equal(d.getElementById('modelPicker').value,String(m.id));
   for(const p of m.parts){
    d.querySelector(`[data-part="${p.id}"]`).click();listClicks++;
    assert.equal(d.querySelector('#detail h2').textContent,p.name,`${m.id}:${p.id} list`);
    assert.equal(d.querySelector(`[data-part="${p.id}"]`).getAttribute('aria-pressed'),'true');
    if(!p.tableOnly){d.getElementById('focusPart').click();const [x,y,width,height]=d.getElementById('diagram').getAttribute('viewBox').split(' ').map(Number),point=p.locations?.[0]||p;assert.ok(point.x>=x&&point.x<=x+width&&point.y>=y&&point.y<=y+height,`${m.id}:${p.id} focus must reveal label`);}

   }
   const hotspots=[...d.querySelectorAll('.hotspot')];
   assert.equal(hotspots.length,m.parts.filter(p=>!p.tableOnly).reduce((n,p)=>n+(p.locations?.length??1),0));
   for(const g of hotspots){
    const p=m.parts.find(p=>String(p.id)===g.dataset.id);
    g.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));hotspotClicks++;
    assert.equal(d.querySelector('#detail h2').textContent,p.name,`${m.id}:${p.id} hotspot`);
    assert.ok(g.classList.contains('selected'));
    g.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));keyboardChecks++;
    assert.equal(d.querySelector('#detail h2').textContent,p.name);
   }
   assert.equal(d.getElementById('diagramCoverage').hidden,m.parts.every(p=>!p.tableOnly));
  }
  const result={at:new Date().toISOString(),sections:snapshot.length,listClicks,hotspotClicks,keyboardChecks,environment:'JSDOM; no browser layout or image alignment verification'};
  fs.writeFileSync('.netlify/catalog-audit/interactions.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{w.close()}
});
