// Preview by default. --apply updates only currently unpriced parts via revision-checked admin API.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fillMissingDemoPrices} from './demo-price-rules.mjs';
const origin=process.env.CATALOG_ORIGIN||'https://detal-demo.netlify.app',apply=process.argv.includes('--apply');
const folder='.netlify/demo-prices';fs.mkdirSync(folder,{recursive:true});
const manifest=JSON.parse(fs.readFileSync('research/demo-price-manifest.json','utf8'));
assert.equal(manifest.currency,'UZS');
const overrides=new Map(manifest.parts.map(([modelId,partId,price])=>[`${modelId}:${partId}`,price]));
let cookie='';
async function request(path,method='GET',body,headers={}){return fetch(origin+path,{method,redirect:'manual',headers:{origin,cookie,...headers},...(body!==undefined?{body:typeof body==='string'?body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(60000)})}
async function json(path){const response=await request(path);if(!response.ok)throw Error(`Read ${path}: HTTP ${response.status}`);return response.json()}
async function pool(items,task){let next=0;return Promise.all(Array.from({length:4},async()=>{while(next<items.length){const index=next++;await task(items[index],index)}}))}
const listed=await json('/api/catalog');const before=[];
await pool(listed.models,async(item,index)=>{before[index]=await json(`/api/catalog?id=${item.id}`)});
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
fs.writeFileSync(`${folder}/${stamp}-before.json`,JSON.stringify(before));
const plan=before.map(entry=>({...fillMissingDemoPrices(entry.model,overrides),revision:entry.revision}));
const categories={};for(const entry of plan)for(const [category,count] of Object.entries(entry.categories))categories[category]=(categories[category]||0)+count;
const expected=plan.reduce((sum,item)=>sum+item.added,0);
console.log(JSON.stringify({mode:apply?'apply':'preview',models:before.length,parts:before.reduce((n,x)=>n+x.model.parts.length,0),missing:expected,categories,backup:`${folder}/${stamp}-before.json`},null,2));
if(!apply||!expected)process.exit(0);
const access=fs.readFileSync(process.env.DETAL_ADMIN_ACCESS_FILE||'../detal-admin-access.txt','utf8');
const email=access.match(/^Email: (.+)$/m)?.[1],password=access.match(/^Parol: (.+)$/m)?.[1];assert.ok(email&&password,'Admin access unavailable');
const login=await request('/auth/login','POST',new URLSearchParams({email,password}).toString(),{'content-type':'application/x-www-form-urlencoded'});
assert.equal(login.status,303,'Admin login failed');cookie=login.headers.get('set-cookie')?.split(';')[0]||'';assert.ok(cookie);
let changed=0;
try{
 for(const entry of plan){if(!entry.added)continue;
  const response=await request('/api/catalog','PUT',{model:entry.model,revision:entry.revision},{'content-type':'application/json'});
  if(!response.ok)throw Error(`Save model ${entry.model.id}: HTTP ${response.status}; ${await response.text()}`);
  changed+=entry.added;console.log(`Saved ${entry.model.id}: ${entry.added} demo prices (${changed}/${expected})`);
 }
}finally{await request('/auth/logout','POST').catch(()=>{});cookie=''}
const after=[];await pool(listed.models,async(item,index)=>{after[index]=await json(`/api/catalog?id=${item.id}`)});
fs.writeFileSync(`${folder}/${stamp}-after.json`,JSON.stringify(after));
assert.equal(after.length,before.length,'Model count changed');
let remaining=0,preserved=0,demo=0;
for(let i=0;i<before.length;i++){
 const old=before[i].model,now=after[i].model;assert.equal(now.parts.length,old.parts.length,`Part count changed in ${old.id}`);
 for(let j=0;j<old.parts.length;j++){
  const a=old.parts[j],b=now.parts[j];assert.equal(a.id,b.id,`Part order changed in ${old.id}`);
  if(a.price===null||a.price===undefined){if(b.price===null||b.price===undefined)remaining++;assert.equal(b.demoPrice,true,`Demo marker missing in ${old.id}:${a.id}`);demo++}
  else{assert.equal(b.price,a.price,`Existing price changed in ${old.id}:${a.id}`);preserved++}
 }
}
assert.equal(remaining,0,'Unpriced parts remain');assert.equal(demo,expected,'Updated part count mismatch');
console.log(JSON.stringify({verified:true,added:demo,preserved,remaining,models:after.length},null,2));
