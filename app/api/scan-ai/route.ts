import {env} from 'cloudflare:workers';
import {validateScan,normalizeScan,scanSchema,scanInstructions,researchInstructions,responseSourceUrls} from '../../../lib/diagram-ai';
const settings=()=>env as typeof env & {OPENAI_API_KEY?:string;OPENAI_VISION_MODEL?:string};
const reply=(d:unknown,status=200)=>Response.json(d,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){return reply({configured:!!settings().OPENAI_API_KEY,provider:'OpenAI',message:settings().OPENAI_API_KEY?'AI sozlangan; natijalarni tekshirish kerak.':'AI hali ulanmagan. OpenAI API kalitini serverda sozlash kerak.'})}
export async function POST(req:Request){
 if(req.headers.get('origin')!==new URL(req.url).origin)return reply({error:'Manba ruxsat etilmagan.'},403);
 const config=settings();if(!config.OPENAI_API_KEY)return reply({error:'AI hali ulanmagan. Hozir oddiy OCR yoki qo‘lda belgilashdan foydalaning.',code:'AI_NOT_CONFIGURED'},503);
 if(Number(req.headers.get('content-length'))>8000000)return reply({error:'Rasm hajmi juda katta.'},413);
 let body;try{const raw=await req.text();if(raw.length>8000000)return reply({error:'Rasm hajmi juda katta.'},413);body=validateScan(JSON.parse(raw));}catch(e){return reply({error:e instanceof Error?e.message:'Yaroqsiz so‘rov.'},400)}
 // Owner-private Site boundary protects shared operations. D1 provides an atomic rate limit.
 const bucket=Math.floor(Date.now()/3600000);
 const limit=await env.DB!.prepare('INSERT INTO ai_scan_usage(bucket,count) VALUES(?,1) ON CONFLICT(bucket) DO UPDATE SET count=count+1 WHERE count<10 RETURNING count').bind(bucket).first();
 if(!limit)return reply({error:'Bir soatda 10 ta AI skan limiti tugadi. Keyingi soatda qayta urining yoki oddiy OCR tanlang.'},429);
 const content:any[]=[{type:'input_text',text:JSON.stringify({modelName:body.modelName})}];body.tiles.forEach((t,i)=>{content.push({type:'input_text',text:`Image ${i}: ${i===0?'whole sheet':'diagram crop '+i}.`},{type:'input_image',image_url:t.image,detail:'high'});});
 try{const result=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${config.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:config.OPENAI_VISION_MODEL||'gpt-4.1',store:false,instructions:scanInstructions+researchInstructions,tools:[{type:"web_search"}],tool_choice:"required",include:["web_search_call.action.sources"],input:[{role:'user',content}],max_output_tokens:14000,text:{format:{type:'json_schema',name:'diagram_parts',strict:true,schema:scanSchema}}}),signal:AbortSignal.timeout(110000)});
 if(!result.ok){const error=await result.json() as any;const quota=error?.error?.code==='insufficient_quota';return reply({error:quota?'AI hisobida mablag‘ yoki kvota yetarli emas.':result.status===401?'Serverdagi AI kaliti yaroqsiz.':result.status===429?'AI xizmati band. Keyinroq qayta urining.':'AI xizmati so‘rovni bajarmadi. Oddiy OCR bilan davom etishingiz mumkin.'},502)}
 const data=await result.json() as any;if(data.status!=='completed')return reply({error:'AI natijani to‘liq tugatmadi. Kichikroq chizma bilan qayta urining.'},502);
 const output=(data.output||[]).flatMap((o:any)=>o.content||[]);if(output.some((c:any)=>c.type==='refusal'))return reply({error:'AI bu rasmni qayta ishlay olmadi. Oddiy OCRdan foydalaning.'},422);
 const text=output.filter((c:any)=>c.type==='output_text').map((c:any)=>c.text).join('');const extracted=normalizeScan(JSON.parse(text),body.tiles,responseSourceUrls(data));return reply({...extracted,engine:'ai',requiresReview:true});
 }catch(e){return reply({error:e instanceof Error&&e.name==='TimeoutError'?'AI javobi kechikdi. Qayta urining.':'AI natijasini o‘qib bo‘lmadi. Mavjud detallar o‘zgartirilmadi.'},502)}
}
