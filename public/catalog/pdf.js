/* Detect schematics across the document, then render each assembly, not each page. */
(() => {
 let documentTask=null,pdf=null,file=null,diagrams=[],objectUrls=[],lastKey='',pdfBusy=false;
 const status=text=>$('pdfStatus').textContent=text;
 const release=()=>{objectUrls.forEach(URL.revokeObjectURL);objectUrls=[];};
 const storage={get:key=>{try{return localStorage.getItem(key)}catch{return null}},set:(key,value)=>{try{localStorage.setItem(key,value)}catch{}},remove:key=>{try{localStorage.removeItem(key)}catch{}}};
 const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 async function renderPage(number,maxSide){const page=await pdf.getPage(number),size=page.getViewport({scale:1});const viewport=page.getViewport({scale:Math.min(4,maxSide/Math.max(size.width,size.height))});const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvasContext:canvas.getContext('2d'),viewport,background:'#ffffff'}).promise;page.cleanup();return canvas;}
 async function openPDF(){
  if(pdf)return;
  if(!file)throw Error('Avval PDF fayl tanlang.');if(file.size>40*1024*1024)throw Error('PDF 40 MB dan kichik bo‘lsin.');
  const lib=await import('./vendor/pdf.min.mjs');lib.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdf.worker.min.mjs',location.href).href;
  const bytes=new Uint8Array(await file.arrayBuffer());const hash=await crypto.subtle.digest('SHA-256',bytes);lastKey='detal-pdf-layout:'+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
  documentTask=lib.getDocument({data:bytes,isEvalSupported:false,cMapUrl:new URL('./vendor/cmaps/',location.href).href,cMapPacked:true,standardFontDataUrl:new URL('./vendor/standard_fonts/',location.href).href,wasmUrl:new URL('./vendor/wasm/',location.href).href});
  try{pdf=await documentTask.promise;}catch(e){throw Error(e.name==='PasswordException'?'Parol bilan himoyalangan PDF. Parolsiz nusxasini tanlang.':'PDF ochilmadi. Fayl buzilgan yoki qo‘llanmaydi.');}
  if(pdf.numPages>50){await pdf.destroy();pdf=null;throw Error('Bitta PDF uchun limit — 50 sahifa. Hujjatni kichikroq bo‘laklarga ajrating.');}
  $('pdfPage').max=pdf.numPages;status(`${pdf.numPages} sahifa o‘qildi. Butun PDFdan sxemalar qidiriladi.`);
 }
 async function requestLayout(){
  let id=storage.get(lastKey);
  if(!id){
   let pages=[];
   for(let n=1;n<=pdf.numPages;n++){status(`PDF tayyorlanmoqda: ${n}/${pdf.numPages} sahifa…`);const canvas=await renderPage(n,1400);pages.push({page:n,image:canvas.toDataURL('image/jpeg',.72)});canvas.width=canvas.height=1;}
   let payload=JSON.stringify({name:file.name.slice(0,150),pages});
   if(payload.length>3900000||pages.some(p=>p.image.length>1000000)){
    pages=[];for(let n=1;n<=pdf.numPages;n++){status(`PDF hajmi moslashtirilmoqda: ${n}/${pdf.numPages}…`);const canvas=await renderPage(n,1000);pages.push({page:n,image:canvas.toDataURL('image/jpeg',.5)});canvas.width=canvas.height=1;}payload=JSON.stringify({name:file.name.slice(0,150),pages});
   }
   if(payload.length>3900000||pages.some(p=>p.image.length>1000000))throw Error('PDF tasvirlari juda katta. Kichikroq PDF bilan qayta urinib ko‘ring.');
   status('AI butun PDFdagi sxemalar va ularga tegishli jadvallarni ajratmoqda…');
   const r=await fetch('/api/pdf-layout',{method:'POST',headers:{'Content-Type':'application/json'},body:payload});const d=await r.json();if(!r.ok)throw Error(d.error);id=d.id;storage.set(lastKey,id);
  }
  for(let i=0;i<240;i++){
   status('PDF sxemalari aniqlanmoqda… Natijani olish uchun oynani ochiq tuting.');
   const r=await fetch('/api/pdf-layout?id='+encodeURIComponent(id),{cache:'no-store'}),d=await r.json();
   if(r.status===202){await delay(2500);continue;}
   if(!r.ok){if(r.status===404||d.terminal)storage.remove(lastKey);throw Error(d.error);}
   return d;
  }
  throw Error('Tahlil davom etmoqda. “Sxemalarni topish”ni yana bosing — mavjud tahlil holati tekshiriladi.');
 }
 async function makeSheet(diagram){
  const {sheetPlan}=await import('./pdf-geometry.mjs'),numbers=[...new Set(diagram.regions.map(r=>r.page))],dimensions={};
  for(const n of numbers){const page=await pdf.getPage(n),size=page.getViewport({scale:1}),viewport=page.getViewport({scale:Math.min(4,3000/Math.max(size.width,size.height))});dimensions[n]=[Math.ceil(viewport.width),Math.ceil(viewport.height)];}
  const plan=sheetPlan(diagram.regions,dimensions),canvas=document.createElement('canvas');canvas.width=plan.width;canvas.height=plan.height;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);
  try{for(const n of numbers){const page=await renderPage(n,3000);try{for(const p of plan.placements.filter(p=>p.page===n))ctx.drawImage(page,...p.crop,...p.dest);}finally{page.width=page.height=1;}}
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.92));if(!blob)throw Error('Sxema tasviri tayyorlanmadi.');if(blob.size>12*1024*1024)throw Error('Sxema tasviri 12 MB dan oshdi. Hududni kichraytiring.');return {blob,view:plan.view};
  }finally{canvas.width=canvas.height=1;}
 }
 function renderResults(){
  const root=$('pdfResults');root.replaceChildren();$('pdfImport').hidden=!diagrams.length;
  diagrams.forEach((d,i)=>{
   const card=document.createElement('article');card.className='pdf-scheme';
   const label=document.createElement('label');label.className='check';const check=document.createElement('input');check.type='checkbox';check.checked=d.selected!==false;check.disabled=!!d.imported;check.onchange=()=>d.selected=check.checked;label.append(check,document.createTextNode(`Sxema ${i+1} · ${[...new Set(d.regions.map(r=>r.page))].join(', ')}-sahifa`));card.append(label);
   const nameLabel=document.createElement('label');nameLabel.textContent='Model / sxema nomi';const name=document.createElement('input');name.value=d.name;name.maxLength=150;name.oninput=()=>d.name=name.value;nameLabel.append(name);card.append(nameLabel);
   const details=document.createElement('details');details.className='upload-details';const summary=document.createElement('summary');summary.textContent='Ajratilgan hududlarni tekshirish / tuzatish';details.append(summary);
   d.regions.forEach(region=>{const fields=document.createElement('div');fields.className='pdf-region';[['Sahifa',region.page,1,pdf.numPages],['Chap %',region.box[0]/10,0,100],['Tepa %',region.box[1]/10,0,100],['Kenglik %',region.box[2]/10,.5,100],['Balandlik %',region.box[3]/10,.5,100]].forEach(([title,value,min,max],j)=>{const l=document.createElement('label');l.textContent=title;const input=document.createElement('input');input.type='number';input.min=min;input.max=max;input.step=j===0?1:.1;input.value=value;input.onchange=()=>{if(j===0)region.page=Number(input.value);else region.box[j-1]=Number(input.value)*10;d.sheet=null;};l.append(input);fields.append(l);});details.append(fields);});
   const preview=document.createElement('button');preview.type='button';preview.textContent='Sxemani ko‘rish';const img=document.createElement('img');img.hidden=true;img.alt='Ajratilgan sxema va jadval';preview.onclick=async()=>{if(pdfBusy||busy)return;preview.disabled=true;try{d.sheet=await makeSheet(d);const url=URL.createObjectURL(d.sheet.blob);objectUrls.push(url);img.src=url;img.hidden=false;}catch(e){status(e.message);}finally{preview.disabled=false;}};details.append(preview,img);card.append(details);
   if(d.note){const p=document.createElement('p');p.className='caption';p.textContent=d.note;card.append(p);}root.append(card);
  });
 }
 async function locked(task){if(busy||pdfBusy)return;pdfBusy=true;busy=true;const controls=[...$('uploadForm').querySelectorAll('input,select,button')],disabled=controls.map(n=>n.disabled);controls.forEach(n=>n.disabled=true);try{await task();}catch(e){status(e.message);}finally{pdfBusy=false;busy=false;controls.forEach((n,i)=>n.disabled=disabled[i]);}}
 $('pdfFile').onchange=async()=>{release();if(documentTask)await documentTask.destroy();pdf=null;documentTask=null;file=$('pdfFile').files[0]||null;diagrams=[];renderResults();status(file?`${file.name} tanlandi. “Sxemalarni topish”ni bosing.`:'PDF fayl tanlang.');};
 $('pdfDetect').onclick=()=>locked(async()=>{if(!aiReady)throw Error('PDF ichidagi sxemalarni ajratish uchun AI ulanishi kerak.');await openPDF();const result=await requestLayout();diagrams=result.diagrams.map(d=>({...d,selected:true,imported:uploadQueue.some(item=>item.pdfSource?.documentKey===lastKey&&JSON.stringify(item.pdfSource.regions)===JSON.stringify(d.regions))}));renderResults();status(`${pdf.numPages} sahifadan ${diagrams.length} ta sxema topildi. ${result.warnings.join(' ')} ${diagrams.length?'Nom va hududlarni tekshiring, keyin tanlanganlarini skanerlang.':'Kerakli hududni qo‘lda qo‘shishingiz mumkin.'}`);});
 $('pdfAdd').onclick=()=>locked(async()=>{await openPDF();const page=Number($('pdfPage').value);if(!Number.isInteger(page)||page<1||page>pdf.numPages)throw Error('Mavjud sahifa raqamini kiriting.');diagrams.push({name:`${file.name.replace(/\.pdf$/i,'')} — sxema ${diagrams.length+1}`.slice(0,150),regions:[{page,box:[0,0,1000,1000],kind:'diagram'}],note:'Qo‘lda qo‘shilgan hudud. Agar sahifada bir nechta sxema bo‘lsa, har birining hududini alohida belgilang.',selected:true});renderResults();status('Hudud qo‘shildi. Chap, tepa, kenglik va balandlik maydonlari bilan sxemani ajrating.');});
 $('pdfImport').onclick=async()=>{
  if(busy||pdfBusy)return;let ready=false;
  await locked(async()=>{const selected=diagrams.filter(d=>d.selected!==false&&!d.imported);if(!selected.length)throw Error('Yangi sxemalarni belgilang. Avval qo‘shilganlari takror qo‘shilmaydi.');if(models.length+uploadQueue.filter(i=>!i.done).length+selected.length>1000)throw Error('Katalogning 1000 ta chizma limiti oshadi.');
   for(const [i,d] of selected.entries()){if(!d.name.trim())throw Error('Sxema nomini kiriting.');status(`Sxema tayyorlanmoqda: ${i+1}/${selected.length}…`);const sheet=d.sheet||await makeSheet(d),pages=[...new Set(d.regions.map(r=>r.page))];uploadQueue.push({file:new File([sheet.blob],d.name+'.jpg',{type:'image/jpeg'}),name:d.name.trim(),view:sheet.view,pdfSource:{file:file.name,documentKey:lastKey,pages,regions:structuredClone(d.regions)},status:'PDFdan ajratildi — navbatda',done:false,model:null});d.imported=true;d.sheet=null;$('uploadFile').required=false;renderQueue();}
   $('uploadFile').required=false;renderQueue();$('scanUpload').textContent='Navbatni davom ettirish';status('Sxemalar ajratildi. Har biri tanlangan usulda alohida skanerlanadi.');ready=true;
  });
  if(ready){renderResults();await upload(true);}
 };
})();
