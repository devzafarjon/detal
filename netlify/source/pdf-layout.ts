import {randomUUID} from 'node:crypto';
import {DB} from './database';
import {ownerGuard} from './auth';
import {validatePages,layoutRequest,normalizeLayout} from '../../lib/pdf-layout';
import {providerError} from '../../lib/background-ai';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function pdfLayout(req:Request){
 const denied=await ownerGuard(req.method==='POST'?req:undefined);if(denied)return denied;
 if(!process.env.OPENAI_API_KEY)return reply({error:'PDF sxemalarini topish uchun AI ulanishi kerak.'},503);
 const headers={Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'};
 try{
  if(req.method==='POST'){
   const raw=await req.text();if(raw.length>4000000)return reply({error:'PDF tahlili hajmi katta. Kichikroq PDF tanlang.'},413);
   const body=validatePages(JSON.parse(raw));
   // Share the existing hourly budget; no hidden expansion of paid API usage.
   const bucket=Math.floor(Date.now()/3600000);
   const allowed=await DB.prepare('INSERT INTO ai_scan_usage(bucket,count) VALUES(?,1) ON CONFLICT(bucket) DO UPDATE SET count=count+1 WHERE count<10 RETURNING count').bind(bucket).first();
   if(!allowed)return reply({error:'Soatlik AI limiti tugadi. Keyingi soatda davom ettiring.'},429);
   const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers,body:JSON.stringify(layoutRequest(body,process.env.OPENAI_VISION_MODEL||'gpt-4.1')),signal:AbortSignal.timeout(25000)});
   if(!r.ok)return reply({error:providerError(r.status,await r.json())},502);
   const data=await r.json() as any;if(typeof data.id!=='string'||!data.id.startsWith('resp_'))throw Error('AI javobi yaroqsiz.');
   const id=randomUUID();await DB.prepare('INSERT INTO scan_requests(id,response_id,tiles,status,created_at) VALUES(?,?,?,?,?)').bind(id,data.id,JSON.stringify({kind:'pdf-layout',pages:body.pages.length}),'queued',Date.now()).run();
   return reply({id,status:'queued'},202);
  }
  if(req.method!=='GET')return reply({error:'Usul qo‘llanmaydi.'},405);
  const id=new URL(req.url).searchParams.get('id');if(!id||!/^[a-f0-9-]{36}$/.test(id))return reply({error:'ID noto‘g‘ri.'},400);
  const row=await DB.prepare('SELECT * FROM scan_requests WHERE id=?').bind(id).first<any>();if(!row)return reply({error:'Tahlil topilmadi.'},404);
  const meta=JSON.parse(row.tiles);if(meta.kind!=='pdf-layout')return reply({error:'PDF tahlili topilmadi.'},404);
  if(row.result)return reply(JSON.parse(row.result));
  const r=await fetch('https://api.openai.com/v1/responses/'+encodeURIComponent(row.response_id),{headers,signal:AbortSignal.timeout(25000)});
  if(!r.ok)return reply({error:providerError(r.status,await r.json())},502);
  const data=await r.json() as any;if(['queued','in_progress'].includes(data.status))return reply({id,status:data.status},202);
  if(data.status!=='completed')return reply({error:data.error?providerError(502,data):'PDF tahlili tugallanmadi. Natija qabul qilinmadi.',terminal:true},422);
  const content=(data.output||[]).flatMap((o:any)=>o.content||[]);if(content.some((c:any)=>c.type==='refusal'))return reply({error:'AI PDFni tahlil qila olmadi.',terminal:true},422);
  let result;try{result=normalizeLayout(JSON.parse(content.filter((c:any)=>c.type==='output_text').map((c:any)=>c.text).join('')),meta.pages);}catch{return reply({error:'AI sxema hududlarini to‘liq qaytarmadi. Qayta topish yoki qo‘lda qo‘shish mumkin.',terminal:true},422);}
  await DB.prepare("UPDATE scan_requests SET result=?,status='ready' WHERE id=?").bind(JSON.stringify(result),id).run();return reply(result);
 }catch(e){return reply({error:e instanceof Error?e.message:'PDF tahlili bajarilmadi.'},400);}
}
