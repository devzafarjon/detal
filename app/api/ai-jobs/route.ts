import {env} from 'cloudflare:workers';
import {ownerGuard} from '../../../lib/catalog-access';
import {validate} from '../../../lib/catalog-validation';
import {validateScan} from '../../../lib/diagram-ai';
import {aiRequest,readAIResult,providerError} from '../../../lib/background-ai';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const config=()=>env as typeof env & {OPENAI_API_KEY?:string;OPENAI_VISION_MODEL?:string};
const db=()=>env.DB!;
async function job(id:number){return db().prepare('SELECT * FROM ai_jobs WHERE id=?').bind(id).first<any>();}
async function update(id:number,status:string,error:string|null=null){await db().prepare('UPDATE ai_jobs SET status=?,error=?,updated_at=? WHERE id=?').bind(status,error,Date.now(),id).run();}
async function sync(row:any){
 if(!row.response_id||!['queued','in_progress'].includes(row.status))return;
 const r=await fetch('https://api.openai.com/v1/responses/'+encodeURIComponent(row.response_id),{headers:{Authorization:`Bearer ${config().OPENAI_API_KEY}`},signal:AbortSignal.timeout(20000)});
 if(!r.ok){if(r.status===404)await update(row.id,'failed','AI natijasini olish muddati tugagan yoki natija topilmadi. Qayta yuboring.');return;}
 const data=await r.json() as any;
 if(data.status==='completed'){
  try{const result=readAIResult(data,JSON.parse(row.tiles));const model={...JSON.parse(row.model),parts:result.parts};validate([model]);
   await db().prepare("UPDATE ai_jobs SET result=?,status='ready',error=NULL,updated_at=? WHERE id=? AND response_id=?").bind(JSON.stringify({model,warnings:result.warnings}),Date.now(),row.id,row.response_id).run();
  }catch{await update(row.id,'failed','AI javobi to‘liq yoki yaroqli emas. Qayta yuborish mumkin.');}
 }else if(['failed','cancelled','incomplete'].includes(data.status))await update(row.id,'failed',data.status==='incomplete'?'AI javobi tugallanmagan. Qayta yuboring.':providerError(502,data));
 else if(['queued','in_progress'].includes(data.status))await update(row.id,data.status);
}
export async function GET(req:Request){const denied=await ownerGuard();if(denied)return denied;
 const url=new URL(req.url),id=Number(url.searchParams.get('id'));
 if(id){const row=await job(id);if(!row)return reply({error:'Topilmadi.'},404);return reply({id:row.id,status:row.status,...(row.result?JSON.parse(row.result):{model:JSON.parse(row.model)})});}
 const before=Number(url.searchParams.get('before'))||Number.MAX_SAFE_INTEGER;
 const rows=await db().prepare(`SELECT j.id,j.name,j.status,j.error,j.created_at,j.updated_at,EXISTS(SELECT 1 FROM drawings d WHERE d.id=j.id AND d.deleted=0) AS saved FROM ai_jobs j WHERE j.id<? ORDER BY j.id DESC LIMIT 50`).bind(before).all();return reply({jobs:rows.results,next:rows.results.length===50?(rows.results.at(-1) as any).id:null});
}
export async function POST(req:Request){const denied=await ownerGuard(req);if(denied)return denied;
 const key=config().OPENAI_API_KEY;if(!key)return reply({error:'AI kaliti sozlanmagan.'},503);
 try{
 if(Number(req.headers.get('content-length'))>8000000)return reply({error:'So‘rov katta.'},413);
 const raw=await req.text();if(raw.length>8000000)return reply({error:'So‘rov katta.'},413);const body=JSON.parse(raw);
 if(body.action==='refresh'){
  if(!Array.isArray(body.ids)||body.ids.length>10||body.ids.some((id:any)=>!Number.isSafeInteger(id)))return reply({error:'ID ro‘yxati yaroqsiz.'},400);
  for(const id of body.ids){const row=await job(id);if(row)await sync(row);}return reply({ok:true});
 }
 let row,model,scan;
 if(body.action==='retry'){
  row=await job(body.id);if(!row||row.status!=='failed')return reply({error:'Faqat xato bilan tugagan tahlilni qayta yuborish mumkin.'},409);
  const payload=await env.BUCKET!.get('ai-input/'+row.id);if(!payload)return reply({error:'Qayta yuborish uchun rasmni yana tanlang.'},410);
  scan=validateScan(await payload.json());model=JSON.parse(row.model);
  const lock=await db().prepare("UPDATE ai_jobs SET status='preparing',response_id=NULL,error=NULL,updated_at=? WHERE id=? AND status='failed' RETURNING id").bind(Date.now(),row.id).first();if(!lock)return reply({error:'Tahlil boshqa oynada yuborilgan.'},409);
 }else{
  model=body.model;validate([model]);if(model.id<1||model.parts.length||!model.image.startsWith('/api/image/'))throw Error('Yangi yuklangan chizma kerak.');
  // Client-supplied identities cannot replace an existing job or catalog entry.
  row=await job(model.id);if(row)return reply({id:row.id,status:row.status});
  scan=validateScan(body.scan);if(JSON.stringify(model.size)!==JSON.stringify(scan.size)||model.name!==scan.modelName)throw Error('Chizma ma’lumotlari mos emas.');
  if(!await env.BUCKET!.head(model.image.split('/').pop()!))throw Error('Rasm serverda topilmadi.');
  const count=await db().prepare('SELECT count(*) AS n FROM ai_jobs').first<any>();if(count.n>=1000)return reply({error:'1 000 ta fon tahlili limiti to‘lgan.'},409);
  await env.BUCKET!.put('ai-input/'+model.id,JSON.stringify(scan),{httpMetadata:{contentType:'application/json'}});
  const inserted=await db().prepare("INSERT INTO ai_jobs(id,name,model,tiles,status,created_at,updated_at) VALUES(?,?,?,?,'preparing',?,?) ON CONFLICT(id) DO NOTHING RETURNING id").bind(model.id,model.name,JSON.stringify(model),JSON.stringify(scan.tiles.map(t=>({rect:t.rect}))),Date.now(),Date.now()).first();
  if(!inserted)return reply({id:model.id,status:(await job(model.id)).status});
 }
 const bucket=Math.floor(Date.now()/3600000);
 const limit=await db().prepare('INSERT INTO ai_scan_usage(bucket,count) VALUES(?,1) ON CONFLICT(bucket) DO UPDATE SET count=count+1 WHERE count<10 RETURNING count').bind(bucket).first();
 if(!limit){await update(model.id,'failed','Soatlik 10 ta AI tahlil limiti tugagan. Keyingi soatda qayta yuboring.');return reply({error:'Soatlik 10 ta AI tahlil limiti tugagan.',id:model.id},429);}
 // Once submission begins, ambiguous failures are never automatically resubmitted (avoid duplicate charges).
 await update(model.id,'submitting');
 try{
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(aiRequest(scan,config().OPENAI_VISION_MODEL||'gpt-4.1')),signal:AbortSignal.timeout(25000)});
  if(!r.ok){const data=await r.json() as any;await update(model.id,r.status>=500?'unknown':'failed',providerError(r.status,data));return reply({error:providerError(r.status,data),id:model.id},502);}
  const data=await r.json() as any;if(typeof data.id!=='string'||!data.id.startsWith('resp_'))throw Error('Missing response');
  await db().prepare("UPDATE ai_jobs SET response_id=?,status='queued',updated_at=? WHERE id=?").bind(data.id,Date.now(),model.id).run();
  return reply({id:model.id,status:'queued',accepted:true});
 }catch{await update(model.id,'unknown','Yuborish javobi olinmadi. Takror to‘lov bo‘lmasligi uchun avtomatik qayta yuborilmadi; OpenAI jurnalini tekshirish kerak.');return reply({error:'Yuborish natijasi noaniq. Admin ro‘yxatidagi holatni tekshiring.',id:model.id},502);}
 }catch(e){return reply({error:e instanceof Error?e.message:'Fon tahlili xatosi.'},400);}
}
