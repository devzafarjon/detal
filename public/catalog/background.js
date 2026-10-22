let refreshingJobs=false,jobCursor=null;
window.submitBackground=async(model,img)=>{
 const [x,y,w,h]=model.view,tiles=[imageTile(img,[0,0,...model.size])];
 for(const row of [0,1])for(const col of [0,1])tiles.push(imageTile(img,[x+col*w*.44,y+row*h*.44,w*.56,h*.56]));
 const {_dirty,_revision,...clean}=model;
 const r=await fetch('/api/ai-jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:clean,scan:{size:model.size,modelName:model.name,tiles}})});
 let d=await r.json();if(!r.ok)throw Object.assign(Error(d.error),{status:r.status});
 if(d.status==='failed'){const retry=await fetch('/api/ai-jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'retry',id:model.id})});d=await retry.json();if(!retry.ok)throw Object.assign(Error(d.error),{status:retry.status});}
 if(!['queued','in_progress','ready'].includes(d.status))throw Error('Tahlil hali qabul qilinmagan. Fon tahlillari bo‘limidagi holatni tekshiring.');
};
const jobLabels={preparing:'Tayyorlanmoqda',submitting:'Yuborilmoqda',queued:'AI navbatida',in_progress:'AI tekshirmoqda',ready:'Tayyor — tekshirish kerak',failed:'Xatolik',unknown:'Yuborish holati noaniq'};
async function jobAction(body){const r=await fetch('/api/ai-jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error);return d;}
async function openJob(id){if(busy)return;try{
 if(current._dirty&&current.parts.length&&!applyFields())return;
 let m=models.find(m=>m.id===id);if(!m){const r=await fetch('/api/ai-jobs?id='+id);const d=await r.json();if(!r.ok)throw Error(d.error);m={...d.model,_revision:0,_dirty:true};models.push(m);dirty=true;}
 await chooseModel(id);$('syncStatus').textContent=dirty?'Saqlanmagan o‘zgarishlar':'✓ Katalog';hint('AI takliflarini tekshiring va o‘zgartiring. Katalogga chiqarish uchun “O‘zgarishlarni saqlash”ni bosing.');$('modelTitle').scrollIntoView({behavior:'smooth',block:'start'});
 }catch(e){$('jobsStatus').textContent=e.message;}}
function renderJobs(rows,append=false){const root=$('backgroundJobs');if(!append)root.replaceChildren();for(const j of rows){const row=document.createElement('article');row.className='background-job';const title=document.createElement('strong');title.textContent=j.name;const status=document.createElement('p');status.textContent=(j.saved?'Katalogga saqlangan':jobLabels[j.status]||j.status)+' · '+new Date(j.created_at).toLocaleString('uz-UZ');row.append(title,status);
 if(j.error){const err=document.createElement('p');err.textContent=j.error;row.append(err);}
 if(['submitting','preparing'].includes(j.status)&&Date.now()-j.updated_at>120000){const note=document.createElement('p');note.textContent='Yuborish uzilgan bo‘lishi mumkin. Takror xarajat bo‘lmasligi uchun holatni tekshirtiring.';row.append(note);}
 if(j.status==='ready'||j.saved){const open=document.createElement('button');open.textContent='Ko‘rish va tahrirlash';open.onclick=()=>openJob(j.id);row.append(open);}
 if(j.status==='failed'){const retry=document.createElement('button');retry.textContent='AI ga qayta yuborish';retry.onclick=async()=>{if(!confirm('AI qayta tahlili uchun API xarajati hisoblanadi. Yuborilsinmi?'))return;retry.disabled=true;try{await jobAction({action:'retry',id:j.id});await refreshBackgroundJobs();}catch(e){$('jobsStatus').textContent=e.message;}finally{retry.disabled=false;}};row.append(retry);}
 root.append(row);
 }}
window.refreshBackgroundJobs=async(older=false)=>{
 if(!window.canAdmin||refreshingJobs)return;refreshingJobs=true;$('refreshJobs').disabled=true;
 try{const cursor=older?jobCursor:null;const url='/api/ai-jobs'+(cursor?'?before='+cursor:'');let r=await fetch(url,{cache:'no-store'}),d=await r.json();if(!r.ok)throw Error(d.error);
 const active=d.jobs.filter(j=>['queued','in_progress'].includes(j.status));for(let i=0;i<active.length;i+=10)await jobAction({action:'refresh',ids:active.slice(i,i+10).map(j=>j.id)});
 if(active.length){r=await fetch(url,{cache:'no-store'});d=await r.json();if(!r.ok)throw Error(d.error);}
 renderJobs(d.jobs,older);jobCursor=d.next;$('olderJobs').hidden=!jobCursor;$('jobsStatus').textContent=d.jobs.length?'Holatlar yangilandi.':'Hozircha fon tahlillari yo‘q.';
 }catch(e){$('jobsStatus').textContent='Holatni yangilab bo‘lmadi: '+e.message;}finally{refreshingJobs=false;$('refreshJobs').disabled=false;}
};
$('refreshJobs').onclick=()=>refreshBackgroundJobs();$('olderJobs').onclick=()=>refreshBackgroundJobs(true);
setInterval(()=>{if(admin&&!busy&&!document.hidden)refreshBackgroundJobs();},30000);
