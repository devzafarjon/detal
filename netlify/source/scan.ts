import { randomUUID } from 'node:crypto';
import { DB } from './database';
import { ownerGuard } from './auth';
import { validateScan } from '../../lib/diagram-ai';
import { aiRequest, readAIResult, providerError } from '../../lib/background-ai';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function scan(req:Request) {
 const denied=await ownerGuard(req.method==='POST'?req:undefined);if(denied)return denied;
 const key=process.env.OPENAI_API_KEY;
 if(!key)return reply({error:'AI kaliti sozlanmagan.'},503);
 const headers={Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
 if(req.method==='GET'){
  const id=new URL(req.url).searchParams.get('id');if(!id||!/^[a-f0-9-]{36}$/.test(id))return reply({error:'ID noto‘g‘ri.'},400);
  const row=await DB.prepare('SELECT * FROM scan_requests WHERE id=?').bind(id).first<any>();if(!row)return reply({error:'Tahlil topilmadi.'},404);
  if(row.result)return reply(JSON.parse(row.result));
  const r=await fetch('https://api.openai.com/v1/responses/'+encodeURIComponent(row.response_id),{headers,signal:AbortSignal.timeout(25000)});
  if(!r.ok)return reply({error:providerError(r.status,await r.json())},502);
  const data=await r.json() as any;
  if(['queued','in_progress'].includes(data.status))return reply({id,status:data.status},202);
  if(data.status!=='completed')return reply({error:'AI tahlili tugallanmadi. Qayta urinib ko‘ring.'},502);
  const result={...readAIResult(data,JSON.parse(row.tiles)),engine:'ai',requiresReview:true};
  await DB.prepare("UPDATE scan_requests SET result=?,status='ready' WHERE id=?").bind(JSON.stringify(result),id).run();return reply(result);
 }
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const raw=await req.text();if(raw.length>5500000)return reply({error:'AI uchun rasm hajmi katta. Kichikroq rasm tanlang.'},413);
 const body=validateScan(JSON.parse(raw));
 const bucket=Math.floor(Date.now()/3600000);
 const limit=await DB.prepare('INSERT INTO ai_scan_usage(bucket,count) VALUES(?,1) ON CONFLICT(bucket) DO UPDATE SET count=count+1 WHERE count<10 RETURNING count').bind(bucket).first();
 if(!limit)return reply({error:'Soatlik 10 ta AI tahlil limiti tugadi.'},429);
 const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers,body:JSON.stringify(aiRequest(body,process.env.OPENAI_VISION_MODEL||'gpt-4.1')),signal:AbortSignal.timeout(25000)});
 if(!r.ok)return reply({error:providerError(r.status,await r.json())},502);
 const data=await r.json() as any;if(typeof data.id!=='string'||!data.id.startsWith('resp_'))throw Error('Invalid AI response');
 const id=randomUUID();await DB.prepare('INSERT INTO scan_requests(id,response_id,tiles,status,created_at) VALUES(?,?,?,?,?)').bind(id,data.id,JSON.stringify(body.tiles.map(t=>({rect:t.rect}))),'queued',Date.now()).run();
 return reply({id,status:'queued'},202);
}
