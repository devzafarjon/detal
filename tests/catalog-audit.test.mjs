// Exhaustive interaction checks against a read-only production snapshot.
import {JSDOM} from 'jsdom';
import {runInContext} from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
const snapshotPath='.netlify/catalog-audit/models.json';
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
  // A real imported table-only part can be linked manually and clicked afterward.
  const unlinked=snapshot.find(m=>m.parts.some(p=>p.tableOnly));await w.chooseModel(unlinked.id);
  const p=unlinked.parts.find(p=>p.tableOnly);d.querySelector(`[data-part="${p.id}"]`).click();d.getElementById('adminToggle').click();
  assert.match(d.getElementById('movePart').textContent,/bog‘lash/);
  w.DOMPoint=class{constructor(x,y){this.x=x;this.y=y}matrixTransform(){return this}};
  d.getElementById('diagram').getScreenCTM=()=>({inverse:()=>({})});
  d.getElementById('movePart').click();d.getElementById('diagram').dispatchEvent(new w.MouseEvent('click',{clientX:100,clientY:100,bubbles:true}));
  const added=d.querySelector(`.hotspot[data-id="${p.id}"]`);assert.ok(added,'manual linking must clear tableOnly');
  added.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));assert.equal(d.querySelector('#detail h2').textContent,p.name);
  assert.equal(w.eval('current.parts.find(p=>p.id===selected).tableOnly'),false);
  const result={at:new Date().toISOString(),sections:snapshot.length,listClicks,hotspotClicks,keyboardChecks,manualLink:true,environment:'JSDOM; no browser layout or image alignment verification'};
  fs.writeFileSync('.netlify/catalog-audit/interactions.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{w.close()}
});
