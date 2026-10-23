export function validate(models:any){
 if(!Array.isArray(models)||models.length<1||models.length>1)throw Error('Bitta model bo‘lishi kerak.');
 const ids=new Set();
 for(const m of models){
  if(!Number.isSafeInteger(m.id)||ids.has(m.id))throw Error('Model ID noto‘g‘ri.');ids.add(m.id);
  if(typeof m.name!=='string'||!m.name.trim()||m.name.length>150)throw Error('Model nomi noto‘g‘ri.');
  if(typeof m.image!=='string'||!(/^(assets\/(?:medical\/catalog-\d{2}-section-\d{1,3}(?:-v2)?\.jpg|a7\/section-(?:[1-9]|1[0-8])(?:-v2)?\.jpg|model-(?:[123]\.jpg|4(?:-v2)?\.png)|batch-20261022-(?:[1-9]|1[0-8])\.jpg)|\/api\/image\/[a-f0-9-]{36})$/).test(m.image))throw Error('Rasm manzili noto‘g‘ri.');
  if(!Array.isArray(m.size)||m.size.length!==2||m.size.some((n:number)=>!Number.isFinite(n)||n<1||n>16000))throw Error('Rasm o‘lchami noto‘g‘ri.');
  if(!Array.isArray(m.view)||m.view.length!==4||m.view.some((n:number)=>!Number.isFinite(n))||m.view[0]<0||m.view[1]<0||m.view[2]<=0||m.view[3]<=0||m.view[0]+m.view[2]>m.size[0]+1||m.view[1]+m.view[3]>m.size[1]+1)throw Error('Chizma hududi noto‘g‘ri.');
  if(m.pageRegions!==undefined&&(!Array.isArray(m.pageRegions)||!m.pageRegions.length||m.pageRegions.length>200||m.pageRegions.some((r:any)=>!Array.isArray(r.box)||r.box.length!==4||r.box.some((n:number)=>!Number.isFinite(n))||r.box[0]<0||r.box[1]<0||r.box[2]<=0||r.box[3]<=0||r.box[0]+r.box[2]>m.size[0]+1||r.box[1]+r.box[3]>m.size[1]+1)))throw Error('Chizma sahifalari noto‘g‘ri.');
  if(!Array.isArray(m.parts)||m.parts.length>1000)throw Error('Detallar soni noto‘g‘ri.');const ps=new Set();
  for(const p of m.parts){if(!Number.isSafeInteger(p.id)||p.id<1||p.id>9999||ps.has(p.id))throw Error('Pozitsiya takrorlangan yoki noto‘g‘ri.');ps.add(p.id);
   if(p.label!==undefined&&(typeof p.label!=='string'||!p.label.trim()||p.label.length>20))throw Error('Chizma belgisi noto‘g‘ri.');
   if(typeof p.name!=='string'||!p.name.trim()||p.name.length>300||typeof p.article!=='string'||p.article.length>150)throw Error('Detal nomi yoki artikuli noto‘g‘ri.');
   if(p.price!==null&&(!Number.isFinite(p.price)||p.price<0||p.price>1e12))throw Error('Narx manfiy bo‘lishi mumkin emas.');
   if(p.locations!==undefined&&(!Array.isArray(p.locations)||!p.locations.length||p.locations.length>1000||p.locations.some((l:any)=>!Number.isFinite(l.x)||!Number.isFinite(l.y)||l.x<0||l.y<0||l.x>m.size[0]||l.y>m.size[1])))throw Error('Belgi joylashuvi noto‘g‘ri.');
   for(const point of [p,...(p.locations||[])])for(const key of ['hitWidth','hitHeight'])if(point[key]!==undefined&&(!Number.isFinite(point[key])||point[key]<=0||point[key]>16000))throw Error('Bosish hududi noto‘g‘ri.');
   if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.y<0||p.x>m.size[0]||p.y>m.size[1])throw Error('Belgi rasm tashqarisida.');
  }
 }
}
