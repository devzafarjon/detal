import {env} from 'cloudflare:workers';
import {ownerGuard} from '../../../lib/catalog-access';
import {validate} from '../../../lib/catalog-validation';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
// Legacy data stays intact; individual edits override it without rewriting the catalog.
const listSQL=`SELECT id,name,part_count AS partCount,revision FROM drawings WHERE deleted=0 UNION ALL SELECT json_extract(j.value,'$.id') AS id,json_extract(j.value,'$.name') AS name,json_array_length(j.value,'$.parts') AS partCount,0 AS revision FROM catalogs c,json_each(c.data) j WHERE c.id='main' AND NOT EXISTS(SELECT 1 FROM drawings d WHERE d.id=json_extract(j.value,'$.id'))`;
export async function GET(req:Request){try{
 const id=new URL(req.url).searchParams.get('id');
 if(id!==null){if(!/^[1-9][0-9]*$/.test(id))return reply({error:'ID noto‘g‘ri.'},400);
 const row=await env.DB!.prepare(`SELECT data,revision,deleted FROM drawings WHERE id=? UNION ALL SELECT j.value AS data,0 AS revision,0 AS deleted FROM catalogs c,json_each(c.data) j WHERE c.id='main' AND json_extract(j.value,'$.id')=? AND NOT EXISTS(SELECT 1 FROM drawings WHERE id=?) LIMIT 1`).bind(+id,+id,+id).first<any>();
 return row&&!row.deleted?reply({model:JSON.parse(row.data),revision:row.revision}):reply({error:'Chizma topilmadi.'},404);}
 const rows=await env.DB!.prepare(listSQL+' ORDER BY id').all();return reply({models:rows.results});
 }catch{return reply({error:'Katalog bazasini yuklab bo‘lmadi. Qayta urinib ko‘ring.'},503)}}
export async function PUT(req:Request){const denied=await ownerGuard(req);if(denied)return denied;
 try{const raw=await req.text();if(raw.length>1000000)return reply({error:'Bitta chizma ma’lumotlari juda katta.'},413);
 const {model,revision}=JSON.parse(raw);validate([model]);if(!Number.isSafeInteger(revision)||revision<0)throw Error('Versiya noto‘g‘ri.');
 const data=JSON.stringify(model);let row;
 if(revision===0){row=await env.DB!.prepare(`INSERT INTO drawings(id,name,data,part_count,revision,deleted) SELECT ?,?,?,?,1,0 WHERE EXISTS(SELECT 1 FROM catalogs c,json_each(c.data) j WHERE c.id='main' AND json_extract(j.value,'$.id')=?) OR (SELECT count(*) FROM (${listSQL}))<1000 ON CONFLICT(id) DO NOTHING RETURNING revision`).bind(model.id,model.name,data,model.parts.length,model.id).first();}
 else row=await env.DB!.prepare('UPDATE drawings SET name=?,data=?,part_count=?,revision=revision+1 WHERE id=? AND revision=? AND deleted=0 RETURNING revision').bind(model.name,data,model.parts.length,model.id,revision).first();
 if(!row)return reply({error:'Chizma boshqa oynada o‘zgargan yoki 1 000 chizma limiti to‘lgan. Sahifani yangilang.'},409);return reply(row);
 }catch(e){return reply({error:e instanceof Error?e.message:'Saqlash amalga oshmadi.'},400)}}
export async function DELETE(req:Request){const denied=await ownerGuard(req);if(denied)return denied;
 try{const {id,revision}=await req.json() as any;if(!Number.isSafeInteger(id)||!Number.isSafeInteger(revision)||id<1||revision<0)return reply({error:'ID yoki versiya noto‘g‘ri.'},400);
 const row=revision===0?await env.DB!.prepare(`INSERT INTO drawings(id,name,data,part_count,revision,deleted) SELECT ?,'','{}',0,1,1 WHERE EXISTS(SELECT 1 FROM catalogs c,json_each(c.data) j WHERE c.id='main' AND json_extract(j.value,'$.id')=?) AND (SELECT count(*) FROM (${listSQL}))>1 ON CONFLICT(id) DO NOTHING RETURNING revision`).bind(id,id).first():await env.DB!.prepare(`UPDATE drawings SET deleted=1,revision=revision+1 WHERE id=? AND revision=? AND deleted=0 AND (SELECT count(*) FROM (${listSQL}))>1 RETURNING revision`).bind(id,revision).first();
 return row?reply(row):reply({error:'O‘chirish amalga oshmadi: versiya o‘zgargan yoki oxirgi chizma.'},409);
 }catch{return reply({error:'Yaroqsiz so‘rov.'},400)}}
