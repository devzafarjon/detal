let admin=false,dirty=false,revision=0,loaded=false,busy=false,workingFile=null,editorDirty=false;
window.canAdmin=false;
const removedModels=new Map();
window.placementMode=null;
const hint=t=>{$('actionHint').textContent=t;$('actionHint').classList.toggle('is-error',/xato|saqlanmadi|mavjud|yuklanmadi/i.test(t));};
function changed(){current._dirty=true;dirty=true;$('syncStatus').textContent='Saqlanmagan o‘zgarishlar';}
function updateAdmin(){document.body.classList.toggle('admin-mode',admin);$('backgroundPanel').hidden=!admin;if(admin)window.refreshBackgroundJobs?.();$('mobileAdmin').hidden=!admin;$('quickEdit').hidden=!admin; $('adminBar').hidden=!admin;$('editor').hidden=!admin||!current.parts.length;$('adminToggle').innerHTML=uiIcon(admin?'back':'shield')+(admin?'Katalogga qaytish':'Admin panel');$('adminToggle').setAttribute('aria-pressed',String(admin));window.placementMode=null;syncEditor();}
window.syncEditor=function(){if(!$('editor'))return;$('mobileEdit').disabled=!current.parts.length;$('quickEdit').disabled=!current.parts.length;const p=current.parts.find(p=>p.id===selected);$('editor').hidden=!admin||!p;if(!p||editorDirty)return;$('movePart').textContent=p.tableOnly?'Chizmaga bog‘lash':'Belgini ko‘chirish';$('editModel').value=current.name;$('editNumber').value=p.id;$('editLabel').value=p.label||String(p.id);$('editName').value=p.name;$('editArticle').value=p.article;$('editPrice').value=p.price??'';$('editDemo').checked=p.demoPrice!==false;$('editReviewed').checked=!p.needsReview;document.querySelectorAll('.hotspot').forEach(g=>g.classList.toggle('review',!!current.parts.find(p=>p.id===+g.dataset.id)?.needsReview));};
$('adminToggle').onclick=()=>{if(!window.canAdmin)return;if(!loaded){hint('Katalog yuklanishini kuting. Xatolik bo‘lsa sahifani yangilang.');return;}if(!flushEditor())return;admin=!admin;hint('');updateAdmin()};
window.addEventListener('beforeunload',e=>{if(dirty||busy){e.preventDefault();e.returnValue=''}});
function applyFields(){if(!$('editForm').reportValidity())return false;const p=current.parts.find(p=>p.id===selected);if(!p)return true;const n=Number($('editNumber').value);if(current.parts.some(q=>q.id===n&&q!==p)){hint('Bu pozitsiya raqami mavjud. Boshqa raqam kiriting.');return false;}const price=$('editPrice').value===''?null:Number($('editPrice').value);const newName=$('editName').value.trim();if(newName!==p.name){p.nameStatus='user';p.nameEvidence='Nom admin panelda qo‘lda tahrirlangan.';p.nameSource='';}Object.assign(p,{id:n,label:$('editLabel').value.trim(),name:$('editName').value.trim(),article:$('editArticle').value.trim(),price,demoPrice:$('editDemo').checked,demoArticle:$('editArticle').value.startsWith('DEMO'),needsReview:!$('editReviewed').checked});current.name=$('editModel').value.trim();selected=n;editorDirty=false;changed();renderModel();hint('Tahrir qo‘llandi. Bazaga yozish uchun “O‘zgarishlarni saqlash”ni bosing.');return true;}
window.flushEditor=function(){return !admin||!editorDirty||applyFields()};
$('editForm').addEventListener('input',()=>{if(window.canAdmin){editorDirty=true;changed()}});
$('editForm').onsubmit=e=>{e.preventDefault();applyFields()};
$('removePart').onclick=async()=>{if(!flushEditor())return;const p=current.parts.find(p=>p.id===selected);if(!p)return;if(!await uiConfirm(`${p.id} — ${p.name} pozitsiyasini qoralamadan olib tashlaysizmi?`))return;current.parts=current.parts.filter(p=>p.id!==selected);selected=current.parts[0]?.id||1;changed();renderModel();hint('Pozitsiya qoralamadan olib tashlandi. Saqlamaguncha bazadagi nusxa o‘zgarmaydi.');};
$('addPart').onclick=()=>{if(!flushEditor())return;window.placementMode='add';hint('Yangi raqam turadigan joyga chizma ustida bosing. Escape — bekor qilish.');};
$('movePart').onclick=()=>{if(!current.parts.length||!flushEditor())return;window.placementMode='move';hint(`${selected}-pozitsiya turadigan yangi joyga bosing. Escape — bekor qilish.`)};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){window.placementMode=null;hint('')}});
$('diagram').addEventListener('click',e=>{if(!window.placementMode)return;e.stopImmediatePropagation();const point=new DOMPoint(e.clientX,e.clientY).matrixTransform($('diagram').getScreenCTM().inverse());if(point.x<0||point.y<0||point.x>current.size[0]||point.y>current.size[1]){hint('Rasm ichidagi joyni tanlang.');return;}if(window.placementMode==='add'){const id=Math.max(0,...current.parts.map(p=>p.id))+1;current.parts.push({id,name:`Detal ${id}`,article:'',price:null,demoPrice:false,demoArticle:false,needsReview:true,x:point.x,y:point.y});selected=id;}else {const part=current.parts.find(p=>p.id===selected);Object.assign(part,{x:point.x,y:point.y,tableOnly:false});delete part.locations;}window.placementMode=null;changed();renderModel();hint('Belgi joylashtirildi. Nom, narx va artikulni tahrirlang.');},true);
$('saveAll').onclick=async()=>{if(!window.canAdmin||busy||!loaded)return;if(admin&&current.parts.length&&!applyFields())return;busy=true;$('saveAll').disabled=true;
try{for(const m of models.filter(m=>m._dirty)){const {_revision,_dirty,...model}=m;const snapshot=JSON.stringify(model);const r=await fetch('/api/catalog',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({model,revision:_revision||0})});const d=await r.json();if(!r.ok)throw Error(d.error);m._revision=d.revision;const {_revision:a,_dirty:b,...now}=m;m._dirty=JSON.stringify(now)!==snapshot;}
for(const [id,rev] of removedModels){const r=await fetch('/api/catalog',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,revision:rev})});const d=await r.json();if(!r.ok)throw Error(d.error);removedModels.delete(id);}
hint('O‘zgarishlar bazaga saqlandi.');}catch(e){hint('Saqlanmadi: '+e.message);}finally{dirty=models.some(m=>m._dirty)||removedModels.size>0;$('syncStatus').textContent=dirty?'Saqlanmagan o‘zgarishlar':'✓ Bazaga saqlandi';busy=false;$('saveAll').disabled=false;}};
$('exportData').onclick=async()=>{if(!window.canAdmin)return;try{for(const m of models)await loadModel(m);const a=document.createElement('a');const u=URL.createObjectURL(new Blob([JSON.stringify({models:models.map(({_dirty,_revision,...m})=>m)},null,2)],{type:'application/json'}));a.href=u;a.download='detal-katalog.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}catch(e){hint(e.message)}};
$('newDrawing').onclick=()=>{if(busy)return;if(admin&&current._dirty&&current.parts.length&&!applyFields())return;$('uploadDialog').showModal();$('scanStatus').textContent='';};
$('closeUpload').onclick=()=>{if(!busy)$('uploadDialog').close()};
$('uploadDialog').addEventListener('cancel',e=>{if(busy)e.preventDefault()});
$('diagramSplit').oninput=()=>$('splitValue').textContent=$('diagramSplit').value+'%';
$('diagramSide').onchange=()=>$('splitLabel').hidden=$('diagramSide').value==='full';
let uploadQueue=[],pauseRequested=false;
function renderQueue(){const root=$('uploadQueue');root.replaceChildren();for(const item of uploadQueue){const row=document.createElement('div');row.className='upload-queue-item';const name=document.createElement('strong');name.textContent=item.file.name;const status=document.createElement('span');status.textContent=item.status||'Navbatda';row.append(name,status);root.append(row);} }
$('uploadFile').onchange=()=>{$('uploadFile').required=true;uploadQueue=Array.from($('uploadFile').files).map(file=>({file,status:'Navbatda',done:false,model:null}));renderQueue();$('scanUpload').textContent='Navbatni boshlash';$('uploadName').disabled=uploadQueue.length>1;const file=uploadQueue[0]?.file;if(!file)return;const u=URL.createObjectURL(file);$('uploadPreview').onload=()=>URL.revokeObjectURL(u);$('uploadPreview').src=u;$('uploadPreview').hidden=false;};
$('pauseQueue').onclick=()=>{pauseRequested=true;$('pauseQueue').disabled=true;$('pauseQueue').textContent='Joriy fayl tugashi kutilmoqda…';};
function wordsFromTSV(tsv){return (tsv||'').split('\n').slice(1).map(l=>{const c=l.split('\t');return {text:c.slice(11).join('\t').trim(),x:+c[6],y:+c[7],w:+c[8],h:+c[9],confidence:+c[10],line:c.slice(1,5).join('-')}}).filter(w=>w.text&&w.confidence>=0);}
function groupLines(words){const groups=new Map();for(const w of words){const key=w.line;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(w)}return [...groups.values()].map(ws=>({words:ws,text:ws.map(w=>w.text).join(' '),y:ws[0].y}));}
async function loadOCR(){if(window.Tesseract)return;await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';s.onload=resolve;s.onerror=()=>{s.remove();reject(Error('OCR kutubxonasi yuklanmadi. Internetni tekshiring yoki qo‘lda belgilang.'))};document.head.append(s)});}
async function cropForOCR(img,rect){const scale=Math.min(3,2600/Math.max(rect.width,rect.height));const c=document.createElement('canvas');c.width=Math.round(rect.width*scale);c.height=Math.round(rect.height*scale);const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,rect.left,rect.top,rect.width,rect.height,0,0,c.width,c.height);return {canvas:c,scale};}
function cleanOCRCanvas(canvas,scale,diagram=false){
 const ctx=canvas.getContext('2d'),image=ctx.getImageData(0,0,canvas.width,canvas.height),w=canvas.width,h=canvas.height,bits=new Uint8Array(w*h);
 for(let i=0;i<bits.length;i++)bits[i]=(image.data[i*4]+image.data[i*4+1]+image.data[i*4+2])/3<210?1:0;
 const erased=new Uint8Array(bits.length),run=Math.round((diagram?22:35)*scale);
 for(let y=0;y<h;y++){let start=-1;for(let x=0;x<=w;x++){if(x<w&&bits[y*w+x]){if(start<0)start=x;}else if(start>=0){if(x-start>=run)for(let k=start;k<x;k++)erased[y*w+k]=1;start=-1;}}}
 for(let x=0;x<w;x++){let start=-1;for(let y=0;y<=h;y++){if(y<h&&bits[y*w+x]){if(start<0)start=y;}else if(start>=0){if(y-start>=run)for(let k=start;k<y;k++)erased[k*w+x]=1;start=-1;}}}
 for(let i=0;i<bits.length;i++)if(erased[i])bits[i]=0;
 if(diagram){const seen=new Uint8Array(bits.length),queue=new Int32Array(bits.length);for(let root=0;root<bits.length;root++){if(!bits[root]||seen[root])continue;let tail=1,head=0,minX=w,minY=h,maxX=0,maxY=0;queue[0]=root;seen[root]=1;while(head<tail){const p=queue[head++],x=p%w,y=Math.floor(p/w);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);for(const n of [p-1,p+1,p-w,p+w]){if(n<0||n>=bits.length||Math.abs(n%w-x)>1||seen[n]||!bits[n])continue;seen[n]=1;queue[tail++]=n;}}if(maxX-minX>40*scale||maxY-minY>30*scale||tail<3)for(let j=0;j<tail;j++)bits[queue[j]]=0;}}
 for(let i=0;i<bits.length;i++){const v=bits[i]?0:255;image.data[i*4]=v;image.data[i*4+1]=v;image.data[i*4+2]=v;image.data[i*4+3]=255;}ctx.putImageData(image,0,0);return canvas;
}
function parseRows(words){const rows=new Map();for(const l of groupLines(words)){let text=l.text.replace(/[|丨]/g,' ').replace(/\s+/g,' ').replace(/[①-⑳]/g,c=>String(c.charCodeAt(0)-9311));const match=text.match(/^\s*(\d{1,4})\s+(.+)$/);if(!match)continue;const id=+match[1];if(id<1||id>9999)continue;let rest=match[2].trim();if(/^(序号|名称|数量|单价)/.test(rest))continue;let article='';const code=rest.match(/^((?:\d{6,12}|GB\s*\/?T?\s*\d+[.\d/-]*(?:\s*-\s*\d+)?)\b)\s*/i);if(code){article=code[1];rest=rest.slice(code[0].length)}// Quantity/price columns are not guessed as product prices.
rest=rest.replace(/\s+\d+(?:\s+.*)?$/,'').trim();if(rest&&/[A-Za-z\u3400-\u9fff\u0400-\u04ff]/.test(rest))rows.set(id,{name:rest.slice(0,300),article});}return rows;}
async function scanModel(model,img){
 await loadOCR();let worker;
 try{worker=await Tesseract.createWorker('eng',1,{logger:m=>{if(m.status==='recognizing text'){$('scanProgress').value=m.progress;$('scanStatus').textContent=`Raqamlar / jadval o‘qilmoqda… ${Math.round(m.progress*100)}%`}}});
 const rect={left:model.view[0],top:0,width:model.view[2],height:model.size[1]};const crop=await cropForOCR(img,rect);
 await worker.setParameters({tessedit_pageseg_mode:'11',tessedit_char_whitelist:'',user_defined_dpi:'300'});
 const result=await worker.recognize(crop.canvas,{}, {text:true,tsv:true});const cleaned=cleanOCRCanvas(crop.canvas,crop.scale,true);const second=await worker.recognize(cleaned,{}, {text:true,tsv:true});const words=[...wordsFromTSV(result.data.tsv),...wordsFromTSV(second.data.tsv)];
 const candidates=new Map();for(const w of words){if(!/^\d{1,4}$/.test(w.text)||w.confidence<25)continue;const id=+w.text;if(id<1||id>9999||w.h>crop.canvas.height*.08)continue;const p={id,name:`Detal ${id}`,article:'',price:null,demoPrice:false,demoArticle:false,needsReview:true,x:rect.left+(w.x+w.w/2)/crop.scale,y:(w.y+w.h/2)/crop.scale,ocrConfidence:Math.round(w.confidence)};if(!candidates.has(id)||candidates.get(id).ocrConfidence<p.ocrConfidence)candidates.set(id,p);}
 let rows=new Map();const side=$('diagramSide').value;
 if(side!=='full'){
  $('scanStatus').textContent='Jadval tili yuklanmoqda…';await worker.reinitialize($('ocrLanguage').value);await worker.setParameters({tessedit_pageseg_mode:'6',tessedit_char_whitelist:'',preserve_interword_spaces:'1'});
  const tableLeft=side==='left'?model.view[2]:0;const tableWidth=model.size[0]-model.view[2];const columns=$('twoColumns').checked?2:1;
  for(let column=0;column<columns;column++){const t=await cropForOCR(img,{left:tableLeft+column*tableWidth/columns,top:0,width:tableWidth/columns,height:model.size[1]});cleanOCRCanvas(t.canvas,t.scale);const r=await worker.recognize(t.canvas,{}, {text:true,tsv:true});for(const [id,entry] of parseRows(wordsFromTSV(r.data.tsv)))rows.set(id,entry);}
 }
 for(const [id,p] of candidates){if(rows.has(id))Object.assign(p,rows.get(id));}
 model.parts=[...candidates.values()].sort((a,b)=>a.id-b.id);return {found:model.parts.length,matched:model.parts.filter(p=>p.name!==`Detal ${p.id}`).length};
 }finally{if(worker)await worker.terminate()}
}
async function upload(scan){
 if(!window.canAdmin||busy||!$('uploadForm').reportValidity())return;
 const pending=uploadQueue.filter(item=>!item.done);if(!pending.length){$('scanStatus').textContent='Yangi fayllarni tanlang. Bu navbat allaqachon tugagan.';return;}
 if(models.length+pending.filter(item=>!item.model).length>1000){$('scanStatus').textContent='Tanlangan fayllar bilan 1 000 ta chizma limiti oshadi. Kamroq fayl tanlang.';return;}
 busy=true;pauseRequested=false;
 const controls=[...$('uploadForm').querySelectorAll('input,select,button')];const disabled=controls.map(el=>el.disabled);controls.forEach(el=>el.disabled=true);
 $('pauseQueue').hidden=false;$('pauseQueue').disabled=false;$('pauseQueue').textContent='Joriy fayldan keyin pauza';$('scanProgress').hidden=!scan;
 try{for(const item of pending){if(pauseRequested)break;
 item.status='Yuklanmoqda…';renderQueue();$('scanStatus').textContent=item.file.name;
 let img;
 try{let file=item.file;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024){const {imageToJPEG}=await import('./document-import.mjs');try{const {blob}=await imageToJPEG(file);file=new File([blob],file.name.replace(/\.[^.]+$/, '')+'.jpg',{type:'image/jpeg'});item.file=file;}catch{throw Error('Bu rasmni yuqoridagi “Hujjat yoki rasm” maydonidan kiriting — konvertatsiya sinab ko‘riladi.');}}if(file.size>12*1024*1024)throw Error('Fayl 12 MB dan kichik bo‘lsin.');
 img=new Image();const local=URL.createObjectURL(file);try{img.src=local;await img.decode();}finally{URL.revokeObjectURL(local)}
 if(img.naturalWidth*img.naturalHeight>24000000||img.naturalWidth>16000||img.naturalHeight>16000)throw Error('Rasm 24 megapikseldan va tomonlari 16000 pikseldan oshmasin.');
 if(!item.model){const r=await fetch('/api/upload',{method:'POST',headers:{'Content-Type':file.type},body:file});const d=await r.json();if(!r.ok)throw Object.assign(Error(d.error),{status:r.status});
 const w=img.naturalWidth,h=img.naturalHeight,side=$('diagramSide').value,width=side==='full'?w:Math.round(w*+$('diagramSplit').value/100);
 item.model={id:Math.max(Date.now(),...models.map(m=>m.id+1)),name:item.name||(uploadQueue.length===1?$('uploadName').value.trim():'')||file.name.replace(/\.[^.]+$/,'').slice(0,150),image:d.url,size:[w,h],view:item.view||[side==='right'?w-width:0,0,width,h],...(item.pdfSource?{pdfSource:item.pdfSource,note:`Hujjat: ${item.pdfSource.file} · ${item.pdfSource.pages.join(', ')}-sahifa. AI ajratgan hudud va nomlarni tekshiring.`}:{}),parts:[],_revision:0,_dirty:true};if(!(scan&&$('scanEngine').value==='background')){models.push(item.model);dirty=true;}}
 item.status=scan?'Detallar tahlil qilinmoqda…':'Qoralama tayyor';renderQueue();
 let result={found:0,matched:0};if(scan&&$('scanEngine').value==='background'){await window.submitBackground(item.model,img);item.done=true;item.status='Server qabul qildi — sahifani yopsangiz ham AI davom etadi.';item.model._dirty=false;renderQueue();continue;}if(!models.includes(item.model))models.push(item.model);if(scan)result=$('scanEngine').value==='ai'?await window.scanWithAI(item.model,img):await scanModel(item.model,img);
 item.model._dirty=true;dirty=true;item.done=true;item.status=scan?`Tayyor — ${result.found} ta detal, ${result.matched} ta nom. Tekshirib saqlang.`:'Yuklandi — qo‘lda belgilang va saqlang.';
 if(result.warnings?.length)item.status+=' '+result.warnings.join(' ');
 }catch(e){item.status='Xatolik: '+e.message+(item.model?' Rasm qoralamada.':'');if(e.status===429||e.status===401||e.status===403||/quota|balans|kredit|credit|limit/i.test(e.message))pauseRequested=true;}
 finally{if(img)img.src='';renderQueue();}
 }
 }finally{busy=false;controls.forEach((el,i)=>el.disabled=disabled[i]);$('pauseQueue').hidden=true;$('scanProgress').hidden=true;
 const last=uploadQueue.filter(item=>item.model&&models.includes(item.model)).at(-1);if(last){current=last.model;selected=current.parts[0]?.id||1;renderModel();$('syncStatus').textContent='Saqlanmagan o‘zgarishlar';}
 const remaining=uploadQueue.filter(item=>!item.done).length;$('scanUpload').textContent=remaining?'Qolganlarini davom ettirish':'Navbat tugadi';
 $('scanStatus').textContent=`${uploadQueue.filter(item=>item.done).length} / ${uploadQueue.length} ta tayyor. ${remaining?'Qolganlari uchun davom ettirishni bosing. ':''}Oynani yopib, natijalarni tekshiring va “O‘zgarishlarni saqlash”ni bosing.`;
 if(scan&&$('scanEngine').value==='background'){$('scanStatus').textContent=`${uploadQueue.filter(item=>item.done).length} / ${uploadQueue.length} ta serverga yuborildi. Qabul qilingan tahlillar sahifa yopilganda ham davom etadi. Natijalar — Fon tahlillari bo‘limida.`;window.refreshBackgroundJobs?.();}else hint('Yangi chizmalar qoralamada. Natijalarni tekshirib, o‘zgarishlarni saqlang.');
 }
}
$('uploadForm').onsubmit=e=>{e.preventDefault();upload(true)};$('manualUpload').onclick=()=>upload(false);
(async()=>{try{const [r,session]=await Promise.all([fetch('/api/catalog'),fetch('/api/session',{cache:'no-store'})]);const d=await r.json();if(!r.ok)throw Error(d.error);const identity=session.ok?await session.json():{admin:false};window.canAdmin=identity.admin===true;$('adminToggle').hidden=!window.canAdmin;$('adminSignIn').hidden=window.canAdmin;models.splice(0,models.length,...d.models);loaded=true;if(models.length)await chooseModel(matchingModels().find(m=>m.deviceKey===deviceFilter)?.id||models[0].id);else {$('syncStatus').textContent='Katalog hozircha bo‘sh';setCatalogState('empty');}if(window.canAdmin)window.checkAI?.();}catch(e){$('syncStatus').textContent='Baza yuklanmadi';setCatalogState('error',e.message);hint(e.message+' Sahifani yangilang.')}})();

$('removeModel').onclick=async()=>{if(!window.canAdmin)return;if(models.length===1){hint('Kamida bitta model qolishi kerak.');return;}if(!await uiConfirm(current.name+' chizmasini katalog qoralamasidan olib tashlaysizmi?'))return;if(!current._dirty||current._revision>0||current.id<10000)removedModels.set(current.id,current._revision||0);models.splice(models.indexOf(current),1);dirty=true;admin=false;updateAdmin();await chooseModel(models[0].id);hint('Chizma qoralamadan olib tashlandi. Bazaga qo‘llash uchun saqlang.');};

function focusDetailEditor(){if(!window.canAdmin||!admin||!current.parts.length)return;$('editor').scrollIntoView({behavior:'smooth',block:'start'});$('editName').focus({preventScroll:true});}
$('quickEdit').onclick=focusDetailEditor;
$('mobileEdit').onclick=focusDetailEditor;
$('mobileUpload').onclick=()=>{if(window.canAdmin&&admin&&!busy)$('newDrawing').click()};
$('mobileSave').onclick=()=>{if(window.canAdmin&&admin&&!busy)$('saveAll').click()};
new MutationObserver(()=>{$('mobileSave').disabled=$('saveAll').disabled;$('mobileSave').innerHTML=$('saveAll').disabled?'Saqlanmoqda…':'Saqlash<br><small>Bazaga yozish</small>';}).observe($('saveAll'),{attributes:true,attributeFilter:['disabled']});
