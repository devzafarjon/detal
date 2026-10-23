// Revision-checked, resumable coordinate update. Keeps current names, prices and variants.
// Default is read-only. Deploy versioned assets and the validator before using --apply.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {isDeepStrictEqual as equal} from 'node:util';
const base=process.env.CATALOG_ORIGIN||'https://detal-demo.netlify.app';
const baseline=JSON.parse(fs.readFileSync(process.env.CATALOG_BASELINE||'.netlify/catalog-audit/models.json','utf8'));
const targets=[...JSON.parse(fs.readFileSync('research/medical/catalog.json','utf8')),...JSON.parse(fs.readFileSync('research/a7/catalog.json','utf8')),...JSON.parse(fs.readFileSync('research/mapping/legacy-corrections.json','utf8'))];
const modelKeys=['image','size','view','crops','pageRegions','selectionKind','mappingStatus','mappingMethod','mappingEvidence','archivedImportParts'];
const partKeys=['label','x','y','locations','hitWidth','hitHeight','tableOnly'];
const get=async path=>{const r=await fetch(base+path,{signal:AbortSignal.timeout(60000)});assert.equal(r.status,200,path);return r.json()};
const fresh=new Map();let next=0;
await Promise.all(Array.from({length:6},async()=>{while(next<targets.length){const t=targets[next++];fresh.set(t.id,await get('/api/catalog?id='+t.id))}}));
const stamp=new Date().toISOString().replace(/[:.]/g,'-'),dir='.netlify/mapping-publish';fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(`${dir}/before-${stamp}.json`,JSON.stringify([...fresh.values()],null,2));
const changes=[];
for(const target of targets){
 const old=baseline.find(m=>m.id===target.id);assert.ok(old,`Missing baseline ${target.id}`);
 const current=fresh.get(target.id);const merged=structuredClone(current.model);
 const currentIds=new Set(current.model.parts.map(p=>p.id));
 const targetIds=new Set(target.parts.map(p=>p.id));
 const baselineIds=new Set(old.parts.map(p=>p.id));
 assert.ok([...targetIds].every(id=>currentIds.has(id))&&[...currentIds].every(id=>baselineIds.has(id)&&(targetIds.has(id)||target.archivedImportParts?.some(a=>a.part.id===id))),`Parts changed ${target.id}; review required`);
 function mergeFields(destination,original,desired,keys,label){for(const key of keys){if(equal(original[key],desired[key]))continue;assert.ok(equal(destination[key],original[key])||equal(destination[key],desired[key]),`Concurrent mapping edit ${label}.${key}; refusing overwrite`);if(desired[key]===undefined)delete destination[key];else destination[key]=structuredClone(desired[key]);}}
 mergeFields(merged,old,target,modelKeys,String(target.id));
 const retained=new Set(target.parts.map(p=>p.id));
 for(const p of merged.parts.filter(p=>!retained.has(p.id))){const archived=target.archivedImportParts?.find(a=>a.part.id===p.id);assert.ok(archived&&equal(archived.part,p),`Unreviewed removal ${target.id}:${p.id}`);}
 merged.parts=merged.parts.filter(p=>retained.has(p.id));
 for(const p of merged.parts)mergeFields(p,old.parts.find(x=>x.id===p.id),target.parts.find(x=>x.id===p.id),partKeys,`${target.id}:${p.id}`);
 if(!equal(merged,current.model))changes.push({model:merged,revision:current.revision});
}
fs.writeFileSync(`${dir}/plan-${stamp}.json`,JSON.stringify(changes,null,2));console.log('PLAN',changes.length,'section updates; current descriptive fields preserved; backup saved.');
if(process.argv.includes('--apply')){
 for(const path of new Set(changes.map(c=>c.model.image).filter(p=>p.endsWith('-v2.jpg')))){const r=await fetch(base+'/catalog/'+path,{method:'HEAD'});assert.equal(r.status,200,`Deploy asset first: ${path}`)}
 const access=fs.readFileSync(process.env.CATALOG_ACCESS_FILE||'../detal-admin-access.txt','utf8');
 const email=access.match(/^Email:\s*(.+)$/m)?.[1]?.trim(),password=access.match(/^Parol:\s*(.+)$/m)?.[1]?.trim();assert.ok(email&&password,'Admin access missing');
 const login=await fetch(base+'/auth/login',{method:'POST',redirect:'manual',headers:{'content-type':'application/x-www-form-urlencoded',origin:base},body:new URLSearchParams({email,password})});assert.equal(login.headers.get('location'),'/catalog/','Login failed');
 const cookie=login.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');let done=0;
 try{for(const change of changes){const r=await fetch(base+'/api/catalog',{method:'PUT',headers:{cookie,origin:base,'content-type':'application/json'},body:JSON.stringify(change),signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error(`Update ${change.model.id}: ${r.status} ${await r.text()}`);const check=await get('/api/catalog?id='+change.model.id);assert.deepEqual(check.model,change.model,`Verification failed ${change.model.id}`);if(++done%10===0||done===changes.length)console.log('VERIFIED',done+'/'+changes.length);}
 fs.writeFileSync(`${dir}/verified-${stamp}.json`,JSON.stringify({at:new Date().toISOString(),ids:changes.map(c=>c.model.id)}));
 }finally{await fetch(base+'/auth/logout',{method:'POST',headers:{cookie,origin:base}})}
}
