import {createHmac,randomUUID} from 'node:crypto';
import {DB} from './database';
import {ownerGuard,requestContext} from './auth';
import {GET as getCatalog} from '../../app/api/catalog/route';

const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const validId=(value:unknown)=>Number.isSafeInteger(value)&&Number(value)>0;

export async function orders(req:Request){
 if(req.method==='GET'){
  const denied=await ownerGuard();if(denied)return denied;
  const rows=await DB.prepare('SELECT id,customer_name,phone,note,items,subtotal_cents,missing_price_count,demo_price_count,status,created_at FROM order_requests ORDER BY created_at DESC LIMIT 100').all();
  return reply({orders:rows.results.map((row:any)=>({...row,items:JSON.parse(row.items)}))});
 }
 if(req.method==='PATCH'){
  const denied=await ownerGuard(req);if(denied)return denied;
  let body:any;try{body=await req.json()}catch{return reply({error:'So‘rov noto‘g‘ri.'},400)}
  if(typeof body?.id!=='string'||!/^[a-f0-9-]{36}$/.test(body.id)||!['new','contacted','closed'].includes(body.status))return reply({error:'Holat noto‘g‘ri.'},400);
  const row=await DB.prepare('UPDATE order_requests SET status=? WHERE id=? RETURNING id,status').bind(body.status,body.id).first();
  return row?reply(row):reply({error:'So‘rov topilmadi.'},404);
 }
 if(req.method!=='POST')return reply({error:'Usul qo‘llanmaydi.'},405);
 if(req.headers.get('origin')!==new URL(req.url).origin)return reply({error:'Manba ruxsat etilmagan.'},403);
 const raw=await req.text();if(raw.length>12000)return reply({error:'So‘rov juda katta. Karzinkani qisqartiring.'},413);
 let body:any;try{body=JSON.parse(raw)}catch{return reply({error:'So‘rov noto‘g‘ri.'},400)}
 const name=String(body?.name||'').trim(),phone=String(body?.phone||'').trim(),note=String(body?.note||'').trim();
 if(body?.website)return reply({error:'So‘rov qabul qilinmadi.'},400);
 if(name.length<2||name.length>100||phone.length>24||!/^[+\d()\s-]{7,24}$/.test(phone)||phone.replace(/\D/g,'').length<7||note.length>1000)return reply({error:'Ism, telefon yoki izohni tekshiring.'},400);
 if(!Array.isArray(body.items)||body.items.length<1||body.items.length>30)return reply({error:'Bir so‘rovga 1–30 xil detal kiriting.'},400);
 const seen=new Set<string>();for(const item of body.items){
  if(!validId(item?.modelId)||!validId(item?.partId)||!Number.isSafeInteger(item?.qty)||item.qty<1||item.qty>999)return reply({error:'Detal yoki son noto‘g‘ri.'},400);
  const key=`${item.modelId}:${item.partId}`;if(seen.has(key))return reply({error:'Takroriy detal bor.'},400);seen.add(key);
 }
 const ip=requestContext.getStore()?.ip||'unknown';
 if(ip!=='unknown'){
  const bucket=createHmac('sha256',process.env.SESSION_SECRET!).update(ip+':'+Math.floor(Date.now()/3600000)).digest('hex');
  const allowed=await DB.prepare('INSERT INTO order_request_attempts(bucket,count) VALUES(?,1) ON CONFLICT(bucket) DO UPDATE SET count=order_request_attempts.count+1 WHERE order_request_attempts.count<5 RETURNING count').bind(bucket).first();
  if(!allowed)return reply({error:'So‘rovlar soni cheklangan. Keyinroq qayta urinib ko‘ring.'},429);
 }
 const ids=[...new Set<number>(body.items.map((item:any)=>item.modelId))],catalog=new Map<number,any>();let next=0;
 await Promise.all(Array.from({length:Math.min(4,ids.length)},async()=>{while(next<ids.length){const id=ids[next++],response=await getCatalog(new Request(new URL('/api/catalog?id='+id,req.url)));if(response.ok)catalog.set(id,(await response.json() as {model:any}).model)}}));
 let subtotal=BigInt(0),missing=0,demo=0;
 const items=[];
 for(const requested of body.items){
  const model=catalog.get(requested.modelId),part=model?.parts?.find((p:any)=>p.id===requested.partId);
  if(!part)return reply({error:'Karzinkadagi detal katalogda topilmadi. Sahifani yangilang.'},409);
  const price=typeof part.price==='number'&&Number.isFinite(part.price)&&part.price>=0?part.price:null;
  const lineCents=price===null?null:BigInt(Math.round(price*100))*BigInt(requested.qty);
  if(lineCents===null)missing++;else subtotal+=lineCents;
  if(price!==null&&part.demoPrice!==false)demo++;
  items.push({modelId:model.id,modelName:model.name,partId:part.id,label:part.label||String(part.id),name:part.name,article:part.article||'',qty:requested.qty,unitPrice:price,demoPrice:price!==null&&part.demoPrice!==false,variantRequired:Array.isArray(part.variants)&&part.variants.length>1,lineCents:lineCents?.toString()??null});
 }
 const id=randomUUID(),createdAt=Date.now(),ipHash=createHmac('sha256',process.env.SESSION_SECRET!).update(ip).digest('hex');
 await DB.prepare('INSERT INTO order_requests(id,customer_name,phone,note,items,subtotal_cents,missing_price_count,demo_price_count,status,ip_hash,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(id,name,phone,note,JSON.stringify(items),subtotal.toString(),missing,demo,'new',ipHash,createdAt).run();
 return reply({id,subtotalCents:subtotal.toString(),missingPriceCount:missing,demoPriceCount:demo,status:'new'},201);
}
