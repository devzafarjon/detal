import {env} from 'cloudflare:workers';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
// This shared catalog is protected by the confirmed owner-private Sites access policy.
export async function GET(){try{const row=await env.DB!.prepare('SELECT data,revision FROM catalogs WHERE id=?').bind('main').first<{data:string;revision:number}>();return reply(row?{models:JSON.parse(row.data),revision:row.revision}:{models:null,revision:0});}catch{return reply({error:'Katalog bazasini yuklab bo‘lmadi. Qayta urinib ko‘ring.'},503)}}
function validate(models:any){
 if(!Array.isArray(models)||models.length<1||models.length>100)throw Error('1–100 ta model bo‘lishi kerak.');
 const ids=new Set();
 for(const m of models){
  if(!Number.isSafeInteger(m.id)||ids.has(m.id))throw Error('Model ID noto‘g‘ri.');ids.add(m.id);
  if(typeof m.name!=='string'||!m.name.trim()||m.name.length>150)throw Error('Model nomi noto‘g‘ri.');
  if(typeof m.image!=='string'||!(/^(assets\/(?:model-(?:[123]\.jpg|4(?:-v2)?\.png)|batch-20261022-(?:[1-9]|1[0-8])\.jpg)|\/api\/image\/[a-f0-9-]{36})$/).test(m.image))throw Error('Rasm manzili noto‘g‘ri.');
  if(!Array.isArray(m.size)||m.size.length!==2||m.size.some((n:number)=>!Number.isFinite(n)||n<1||n>16000))throw Error('Rasm o‘lchami noto‘g‘ri.');
  if(!Array.isArray(m.view)||m.view.length!==4||m.view.some((n:number)=>!Number.isFinite(n))||m.view[0]<0||m.view[1]<0||m.view[2]<=0||m.view[3]<=0||m.view[0]+m.view[2]>m.size[0]+1||m.view[1]+m.view[3]>m.size[1]+1)throw Error('Chizma hududi noto‘g‘ri.');
  if(!Array.isArray(m.parts)||m.parts.length>1000)throw Error('Detallar soni noto‘g‘ri.');const ps=new Set();
  for(const p of m.parts){if(!Number.isSafeInteger(p.id)||p.id<1||p.id>9999||ps.has(p.id))throw Error('Pozitsiya takrorlangan yoki noto‘g‘ri.');ps.add(p.id);
   if(p.label!==undefined&&(typeof p.label!=='string'||!p.label.trim()||p.label.length>20))throw Error('Chizma belgisi noto‘g‘ri.');
   if(typeof p.name!=='string'||!p.name.trim()||p.name.length>300||typeof p.article!=='string'||p.article.length>150)throw Error('Detal nomi yoki artikuli noto‘g‘ri.');
   if(p.price!==null&&(!Number.isFinite(p.price)||p.price<0||p.price>1e12))throw Error('Narx manfiy bo‘lishi mumkin emas.');
   if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.y<0||p.x>m.size[0]||p.y>m.size[1])throw Error('Belgi rasm tashqarisida.');
  }
 }
}
export async function PUT(req:Request){
 if(req.headers.get('origin')!==new URL(req.url).origin)return reply({error:'Manba ruxsat etilmagan.'},403);
 try{const raw=await req.text();if(raw.length>5e6)return reply({error:'Katalog juda katta.'},413);const {models,revision}=JSON.parse(raw);validate(models);if(!Number.isSafeInteger(revision)||revision<0)throw Error('Versiya noto‘g‘ri.');
 const result=revision===0?await env.DB!.prepare('INSERT INTO catalogs(id,data,revision) VALUES(?,?,1) ON CONFLICT(id) DO NOTHING RETURNING revision').bind('main',JSON.stringify(models)).first():await env.DB!.prepare('UPDATE catalogs SET data=?,revision=revision+1 WHERE id=? AND revision=? RETURNING revision').bind(JSON.stringify(models),'main',revision).first();
 if(!result)return reply({error:'Katalog boshqa oynada o‘zgartirilgan. Nusxani yuklab oling, so‘ng sahifani yangilang.'},409);return reply(result);
 }catch(e){return reply({error:e instanceof Error?e.message:'Saqlash amalga oshmadi.'},400)}
}
