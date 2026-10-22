let aiReady=false;
async function checkAI(){try{const r=await fetch('/api/scan-ai',{cache:'no-store'});if(!r.ok)throw Error();const d=await r.json();aiReady=d.configured;$('aiStatus').textContent=d.message;$('aiOption').disabled=!aiReady;$('aiOption').textContent=aiReady?'AI — chizma, jadval va internet qidiruvi':'AI Vision — ulanish kerak';$('aiRescan').disabled=!aiReady;if(aiReady)$('scanEngine').value='ai';}catch{$('aiStatus').textContent='AI ulanishini tekshirib bo‘lmadi. Oddiy OCR ishlaydi.'}}
function imageTile(img,rect){const [x,y,w,h]=rect,scale=Math.min(2,1900/Math.max(w,h));const canvas=document.createElement('canvas');canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,x,y,w,h,0,0,canvas.width,canvas.height);return {image:canvas.toDataURL('image/jpeg',.92),rect};}
window.scanWithAI=async function(model,img){
 if(!aiReady)throw Error('AI hali ulanmagan. Oddiy OCR usulini tanlang.');
 const [x,y,w,h]=model.view;const tiles=[imageTile(img,[0,0,...model.size])];for(const row of [0,1])for(const col of [0,1])tiles.push(imageTile(img,[x+col*w*.44,y+row*h*.44,w*.56,h*.56]));
 $('scanStatus').textContent='AI raqamlarni o‘qib, detal nomlarini jadval va internetdan izlamoqda…';$('scanProgress').removeAttribute('value');
 const r=await fetch('/api/scan-ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({size:model.size,modelName:model.name,tiles}),signal:AbortSignal.timeout(120000)});const d=await r.json();if(!r.ok)throw Error(d.error||'AI so‘rovi bajarilmadi.');
 // Do not replace existing catalog data until a complete, validated response is received.
 model.parts=d.parts;return {engine:'ai',found:d.parts.length,matched:d.parts.filter(p=>p.name!==`Detal ${p.id}`).length,warnings:d.warnings||[]};
};
$('aiRescan').onclick=async()=>{
 if(busy||!aiReady)return;
 if(!confirm('Chizma OpenAI xizmatiga tahlil uchun yuboriladi. Natijalar tekshirish uchun qoralamaga qo‘shiladi. Davom etasizmi?'))return;
 busy=true;$('aiRescan').disabled=true;const target=current;const previous=structuredClone(target.parts);hint('AI chizmani tekshirmoqda. Bu bir oz vaqt olishi mumkin…');
 try{const img=new Image();img.src=target.image;await img.decode();const draft=structuredClone(target);const result=await scanWithAI(draft,img);const merged=new Map(previous.map(p=>[p.id,p]));for(const p of draft.parts){const old=merged.get(p.id);merged.set(p.id,old?{...old,x:p.x,y:p.y,aiConfidence:p.aiConfidence,needsReview:true,source:'ai',...(old.nameStatus!=='user'&&(old.needsReview||old.name===`Detal ${old.id}`)?{name:p.name,nameStatus:p.nameStatus,nameSource:p.nameSource,nameEvidence:p.nameEvidence}:{}),article:old.article||p.article,originalName:p.originalName}:p);}target.parts=[...merged.values()].sort((a,b)=>a.id-b.id);changed();if(current===target)renderModel();hint(`AI ${result.found} ta raqam nomzodini qaytardi. Mavjud narx va artikullar saqlandi. Qoralamani tekshiring, keyin saqlang. ${result.warnings.join(' ')}`);
 }catch(e){hint('AI tekshiruvi bajarilmadi: '+e.message+' Mavjud detallar o‘zgarmadi.');}finally{busy=false;$('aiRescan').disabled=!aiReady;}
};
checkAI();
