// Explicit, create-only import. Existing records are never overwritten.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base=process.env.CATALOG_ORIGIN||'https://detal-demo.netlify.app';
const data=JSON.parse(fs.readFileSync('research/a7/catalog.json','utf8'));
if(!process.env.CATALOG_ACCESS_FILE)throw Error('Set CATALOG_ACCESS_FILE to the local admin access file.');
const access=fs.readFileSync(process.env.CATALOG_ACCESS_FILE,'utf8');
const email=access.match(/^Email:\s*(.+)$/m)?.[1]?.trim(),password=access.match(/^Parol:\s*(.+)$/m)?.[1]?.trim();
if(!email||!password)throw Error('Admin credentials missing.');
const login=await fetch(base+'/auth/login',{method:'POST',redirect:'manual',headers:{'content-type':'application/x-www-form-urlencoded',origin:base},body:new URLSearchParams({email,password})});
assert.equal(login.headers.get('location'),'/catalog/','Login failed');
const cookie=login.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
const get=async path=>{const r=await fetch(base+path);assert.equal(r.status,200);return r.json();};
const before=await get('/api/catalog');
fs.mkdirSync('.netlify/a7',{recursive:true});
fs.writeFileSync('.netlify/a7/pre-import.json',JSON.stringify(before,null,2));
for(const model of data){
 if(before.models.some(x=>x.id===model.id)){
  const existing=await get('/api/catalog?id='+model.id);
  assert.deepEqual(existing.model,model,'Existing A7 section differs; refusing to overwrite.');
  console.log('Already imported',model.sectionCode);continue;
 }
 const r=await fetch(base+'/api/catalog',{method:'PUT',headers:{cookie,origin:base,'content-type':'application/json'},body:JSON.stringify({model,revision:0})});
 if(!r.ok)throw Error('Import '+model.sectionCode+': '+r.status+' '+await r.text());
 assert.deepEqual((await get('/api/catalog?id='+model.id)).model,model);
 console.log('Imported',model.sectionCode,model.parts.length,'positions');
}
const after=await get('/api/catalog');
for(const original of before.models)assert.deepEqual(after.models.find(x=>x.id===original.id),original,'Pre-existing record changed');
console.log('Verified:',data.length,'sections;',data.reduce((n,m)=>n+m.parts.length,0),'positions;',data.reduce((n,m)=>n+m.parts.reduce((n,p)=>n+p.variants.length,0),0),'article entries');
