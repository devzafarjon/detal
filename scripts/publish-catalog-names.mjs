import fs from 'node:fs';
import assert from 'node:assert/strict';
import {mergeReviewedNames,isPlaceholderName} from './catalog-name-patch.mjs';
const base='https://detal-demo.netlify.app';
const apply=process.argv.includes('--apply');
const seed=JSON.parse(fs.readFileSync('public/catalog/data.js','utf8').replace(/^const models\s*=\s*/,'').replace(/;\s*$/,''));
const folder='.netlify/name-review';fs.mkdirSync(folder,{recursive:true});
let cookie='';
const req=async(path,method='GET',body,headers={})=>{const r=await fetch(base+path,{method,redirect:'manual',headers:{origin:base,cookie,...headers},...(body!==undefined?{body:typeof body==='string'?body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(60000)});return r;};
const read=async path=>{const r=await req(path);if(!r.ok)throw Error(`Read ${path}: HTTP ${r.status}`);return r.json();};
const list=await read('/api/catalog');
const before=[],plans=[];
for(const item of list.models){const entry=await read('/api/catalog?id='+item.id);before.push(entry);const reviewed=seed.find(m=>m.id===item.id);if(!reviewed)continue;const patch=mergeReviewedNames(entry.model,reviewed);plans.push({...patch,revision:entry.revision});}
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
fs.writeFileSync(`${folder}/${stamp}-before.json`,JSON.stringify(before,null,2));
const report={at:new Date().toISOString(),site:base,applied:apply,models:plans.map(p=>({id:p.model.id,name:p.model.name,updates:p.updates,preserved:p.preserved}))};
fs.writeFileSync(`${folder}/${stamp}-plan.json`,JSON.stringify(report,null,2));
console.log('Reviewed',plans.length,'drawings;',plans.reduce((n,p)=>n+p.updates.length,0),'name records;',plans.reduce((n,p)=>n+p.preserved.length,0),'custom names preserved');
if(apply){
 const access=fs.readFileSync(process.env.DETAL_ADMIN_ACCESS_FILE||'../detal-admin-access.txt','utf8');
 const email=access.match(/^Email: (.+)$/m)?.[1],password=access.match(/^Parol: (.+)$/m)?.[1];assert.ok(email&&password,'Admin access unavailable');
 const login=await req('/auth/login','POST',new URLSearchParams({email,password}).toString(),{'content-type':'application/x-www-form-urlencoded'});
 assert.equal(login.status,303,'Login failed');assert.equal(login.headers.get('location'),'/catalog/');cookie=login.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie);
 try{
  for(const plan of plans){if(!plan.updates.length)continue;
   // API optimistic revision check refuses concurrent edits; do not overwrite them.
   const r=await req('/api/catalog','PUT',{model:plan.model,revision:plan.revision},{'content-type':'application/json'});
   if(!r.ok)throw Error(`Save model ${plan.model.id}: HTTP ${r.status}`);
   const saved=await read('/api/catalog?id='+plan.model.id);assert.deepEqual(saved.model,plan.model,'Post-write verification mismatch');
   console.log('Saved and verified model',plan.model.id,plan.updates.length,'records');
  }
 }finally{await req('/auth/logout','POST');cookie='';}
 const after=[];for(const item of list.models)after.push(await read('/api/catalog?id='+item.id));
 fs.writeFileSync(`${folder}/${stamp}-after.json`,JSON.stringify(after,null,2));
 const parts=after.flatMap(x=>x.model.parts),counts=parts.reduce((a,p)=>(a[p.nameStatus||'custom']=(a[p.nameStatus||'custom']||0)+1,a),{});
 assert.equal(parts.filter(p=>isPlaceholderName(p.name)).length,0);
 console.log('PUBLIC VERIFIED',JSON.stringify({models:after.length,parts:parts.length,statuses:counts,placeholders:0}));
}
