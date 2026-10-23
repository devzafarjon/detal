import { runInContext } from 'node:vm';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import postcss from 'postcss';
const html=readFileSync('public/catalog/index.html','utf8');
const model={id:1,name:'Bosch 750',image:'/test.png',view:[0,0,100,100],size:[100,100],parts:[{id:1,name:'Rotor',article:'R-1',price:null,x:30,y:40},{id:2,name:'Stator',article:'S-2',price:50000,x:60,y:40}]};
async function setup({models=[model],fail=false,admin=false,lazy=false,device=''}={}){
 const dom=new JSDOM(html,{url:'https://detal.example/catalog/?device='+encodeURIComponent(device),runScripts:'outside-only'}),w=dom.window;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 w.HTMLDialogElement.prototype.close=function(value){this.open=false;this.returnValue=value||'';this.dispatchEvent(new w.Event('close'));};
 w.fetch=async url=>({ok:!fail,json:async()=>url==='/api/session'?{admin}:String(url).includes('/api/catalog?id=')?{model:structuredClone(models.find(m=>m.id===Number(String(url).split('id=')[1]))),revision:1}:{models:structuredClone(lazy?models.map(m=>({id:m.id,name:m.name,partCount:m.parts.length})):models),error:'Aloqa xatosi'}});
 runInContext('const models=[];',dom.getInternalVMContext());
 for(const file of ['devices','ui','app','admin','pdf'])runInContext(readFileSync(`public/catalog/${file}.js`,'utf8'),dom.getInternalVMContext());
 await new Promise(resolve=>setTimeout(resolve,10));return dom;
}
test('catalog loads, model search filters and selected part is accessible',async()=>{const dom=await setup(),w=dom.window,d=w.document;try{assert.equal(d.body.dataset.state,'ready');assert.equal(d.querySelectorAll('.metric').length,2);assert.equal(d.querySelectorAll('.part').length,2);d.querySelector('[data-part="2"]').click();assert.match(d.getElementById('detail').textContent,/Stator/);assert.equal(d.querySelector('[data-part="2"]').getAttribute('aria-pressed'),'true');const search=d.getElementById('search');search.value='missing';search.dispatchEvent(new w.Event('input'));assert.match(d.getElementById('parts').textContent,/Detal topilmadi/);const modelSearch=d.getElementById('modelSearch');modelSearch.value='750';modelSearch.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(d.querySelectorAll('[data-suggest-model]').length,1);modelSearch.value='missing';modelSearch.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(d.getElementById('devicePicker').disabled,true);}finally{w.close();}});
test('empty and unavailable catalogs present recovery states',async()=>{for(const [options,state] of [[{models:[]},'empty'],[{fail:true},'error']]){const dom=await setup(options);assert.equal(dom.window.document.body.dataset.state,state);assert.equal(dom.window.document.getElementById('retryCatalog').hidden,state!=='error');dom.window.close();}});
test('confirmation cancels without mutation and accepts explicit action',async()=>{const dom=await setup({admin:true}),w=dom.window,d=w.document;try{d.getElementById('adminToggle').click();assert.equal(d.getElementById('adminBar').hidden,false);d.getElementById('removePart').click();assert.equal(d.getElementById('confirmDialog').open,true);d.getElementById('confirmCancel').click();await Promise.resolve();assert.equal(d.querySelectorAll('.part').length,2);d.getElementById('removePart').click();d.getElementById('confirmAccept').click();await Promise.resolve();assert.equal(d.querySelectorAll('.part').length,1);assert.match(d.getElementById('detail').textContent,/Stator/);}finally{w.close();}});
test('markup has unique IDs, named dialogs and parsed responsive stylesheet',()=>{const dom=new JSDOM(html),d=dom.window.document;const ids=[...d.querySelectorAll('[id]')].map(n=>n.id);assert.equal(ids.length,new Set(ids).size);for(const dialog of d.querySelectorAll('dialog'))assert.ok(d.getElementById(dialog.getAttribute('aria-labelledby')));const css=postcss.parse(readFileSync('public/catalog/style.css','utf8'));assert.ok(css.nodes.some(n=>n.type==='atrule'&&n.params.includes('730px')));assert.ok(css.nodes.some(n=>n.type==='atrule'&&n.params.includes('prefers-reduced-motion')));dom.window.close();});
test('login password toggle and error messages work',()=>{const dom=new JSDOM(readFileSync('netlify/admin.html','utf8'),{url:'https://detal.example/admin/?error=limit',runScripts:'outside-only'}),w=dom.window,d=w.document;w.eval(readFileSync('public/catalog/ui.js','utf8'));w.eval(readFileSync('netlify/login.js','utf8'));assert.match(d.getElementById('error').textContent,/15 daqiqadan/);d.getElementById('togglePassword').click();assert.equal(d.getElementById('password').type,'text');assert.equal(d.getElementById('togglePassword').getAttribute('aria-pressed'),'true');d.getElementById('togglePassword').click();assert.equal(d.getElementById('password').type,'password');w.close();});
test('A7 groups sections, searches alternative articles and excludes table-only hotspots',async()=>{
 const a7=JSON.parse(readFileSync('research/a7/catalog.json','utf8'));const dom=await setup({models:[model,...a7]}),w=dom.window,d=w.document;
 try{assert.equal(d.getElementById('devicePicker').options.length,2);assert.equal(d.querySelector('.section-picker').hidden,true);let picker=d.getElementById('devicePicker');picker.value='a7';assert.equal(picker.value,'a7',picker.outerHTML);assert.ok(picker.closest('#models'),picker.parentElement.outerHTML);picker.dispatchEvent(new w.Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,10));assert.equal(d.getElementById('modelPicker').options.length,18,w.eval('JSON.stringify({deviceFilter,current:current.id,match:matchingModels().length})')); assert.match(d.querySelector('.device-summary').textContent,/18 ta bo‘lim/);
 const search=d.getElementById('search');search.value='115-034400-00';search.dispatchEvent(new w.Event('input'));assert.equal(d.querySelectorAll('.part').length,1);d.querySelector('.part').click();assert.match(d.getElementById('detail').textContent,/European standard/);assert.match(d.getElementById('detail').textContent,/115-034401-00/);
 picker=d.getElementById('modelPicker');picker.value='710018';picker.dispatchEvent(new w.Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,10));assert.equal(d.querySelectorAll('.hotspot').length,0);assert.match(d.getElementById('diagramSelectionHint').textContent,/ro‘yxatdan/);assert.equal(d.querySelectorAll('.part').length,43);assert.equal(d.getElementById('devicePicker').value,'a7');picker=d.getElementById('devicePicker');picker.value='model-1';picker.dispatchEvent(new w.Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,10));assert.equal(d.querySelector('.section-picker').hidden,true);assert.match(d.getElementById('modelTitle').textContent,/Bosch/);
 }finally{w.close();}
});

test('medical device filters work with lazy API summaries and correct document links',async()=>{
 const medical=JSON.parse(readFileSync('research/medical/catalog.json','utf8'));const items=medical.filter(m=>['catalog-05','catalog-15'].includes(m.deviceId));const dom=await setup({models:[model,...items],lazy:true,device:'catalog-15'}),w=dom.window,d=w.document;
 try{assert.equal(d.getElementById('devicePicker').options.length,3);assert.equal(d.getElementById('devicePicker').value,'catalog-15');assert.equal(d.getElementById('modelPicker').options.length,16);assert.match(d.querySelector('.catalog-variant a').getAttribute('href'),/medical\/catalog-15\.pdf#page=/);const picker=d.getElementById('devicePicker');picker.value='catalog-05';picker.dispatchEvent(new w.Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,10));assert.equal(d.getElementById('modelPicker').options.length,6);assert.match(d.querySelector('.device-summary a').getAttribute('href'),/catalog-05\.pdf$/);assert.equal(d.querySelectorAll('.device-picker option').length,3);}finally{w.close();}
});

test('unlinked parts can be placed, selected and revealed as markers',async()=>{
 const item=structuredClone(model);item.parts[0].tableOnly=true;
 const dom=await setup({models:[item],admin:true}),w=dom.window,d=w.document;
 try{
  assert.equal(d.querySelectorAll('.hotspot').length,1);
  assert.equal(d.getElementById('diagramCoverage').hidden,false);
  d.getElementById('showMarkers').click();assert.ok(d.getElementById('diagram').classList.contains('show-markers'));
  d.querySelector('[data-part="1"]').click();d.getElementById('adminToggle').click();
  assert.match(d.getElementById('movePart').textContent,/bog‘lash/);
  w.DOMPoint=class{constructor(x,y){this.x=x;this.y=y}matrixTransform(){return this}};
  d.getElementById('diagram').getScreenCTM=()=>({inverse:()=>({})});
  d.getElementById('movePart').click();d.getElementById('diagram').dispatchEvent(new w.MouseEvent('click',{clientX:25,clientY:30,bubbles:true}));
  assert.equal(d.getElementById('diagramCoverage').hidden,true);
  d.querySelector('.hotspot[data-id="1"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  assert.equal(d.querySelector('#detail h2').textContent,'Rotor');assert.equal(d.querySelector('.selection-warning'),null);
  let saved;w.fetch=async(url,options)=>{saved=JSON.parse(options.body);return {ok:true,json:async()=>({revision:2})}};
  await d.getElementById('saveAll').onclick();assert.equal(saved.model.parts[0].tableOnly,false);assert.equal(saved.model.parts[0].x,25);assert.equal(saved.model.parts[0].y,30);
 }finally{w.close()}
});

test('part search matches literal ampersands and names containing markup characters',async()=>{
 const item=structuredClone(model);item.parts[0].name='Rotor & stator <assembly>';
 const dom=await setup({models:[item]}),w=dom.window,d=w.document;
 try{const search=d.getElementById('search');search.value='& stator <';search.dispatchEvent(new w.Event('input'));assert.equal(d.querySelectorAll('.part').length,1);assert.equal(d.querySelector('.part b').textContent,item.parts[0].name);}finally{w.close()}
});

test('diagram zoom, reset, original image and keyboard selection controls work',async()=>{
 const dom=await setup(),w=dom.window,d=w.document;
 try{
  const svg=d.getElementById('diagram'),originalView=svg.getAttribute('viewBox');
  d.getElementById('plus').click();assert.notEqual(svg.getAttribute('viewBox'),originalView);
  d.getElementById('minus').click();assert.equal(d.getElementById('reset').textContent,'100%');
  d.getElementById('plus').click();d.getElementById('reset').click();assert.equal(svg.getAttribute('viewBox'),originalView);
  d.getElementById('source').click();assert.equal(d.getElementById('original').open,true);assert.equal(d.getElementById('originalImage').getAttribute('src'),model.image);
  d.getElementById('close').click();assert.equal(d.getElementById('original').open,false);
  const hotspot=d.querySelector('.hotspot[data-id="2"]');hotspot.dispatchEvent(new w.KeyboardEvent('keydown',{key:' ',bubbles:true}));
  assert.equal(d.querySelector('#detail h2').textContent,'Stator');assert.equal(hotspot.getAttribute('aria-pressed'),'true');
  w.HTMLElement.prototype.scrollIntoView=function(){};d.getElementById('goToParts').click();assert.equal(d.activeElement,d.getElementById('search'));
 }finally{w.close()}
});

test('admin edits survive selecting another part and invalid edits block navigation',async()=>{
 const dom=await setup({admin:true}),w=dom.window,d=w.document;
 try{
  d.getElementById('adminToggle').click();d.querySelector('[data-part="1"]').click();
  const name=d.getElementById('editName');name.value='Rotor yangilandi';name.dispatchEvent(new w.Event('input',{bubbles:true}));
  d.querySelector('[data-part="2"]').click();d.querySelector('[data-part="1"]').click();
  assert.equal(d.getElementById('editName').value,'Rotor yangilandi');
  const number=d.getElementById('editNumber');number.value='2';number.dispatchEvent(new w.Event('input',{bubbles:true}));
  d.querySelector('[data-part="2"]').click();assert.match(d.getElementById('actionHint').textContent,/raqami mavjud/);
  assert.equal(d.querySelector('#detail h2').textContent,'Rotor yangilandi');
  number.value='1';number.dispatchEvent(new w.Event('input',{bubbles:true}));
  let saved;w.fetch=async(url,options)=>{saved=JSON.parse(options.body);return {ok:true,json:async()=>({revision:2})}};
  await d.getElementById('saveAll').onclick();assert.equal(saved.model.parts[0].name,'Rotor yangilandi');
 }finally{w.close()}
});
