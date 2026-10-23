// Create-only, resumable import; never overwrite an existing differing model.
import fs from 'node:fs';import assert from 'node:assert/strict';
const base=process.env.CATALOG_ORIGIN||'https://detal-demo.netlify.app';
const data=JSON.parse(fs.readFileSync('research/medical/catalog.json','utf8'));
const access=fs.readFileSync(process.env.CATALOG_ACCESS_FILE||'../detal-admin-access.txt','utf8');
const email=access.match(/^Email:\s*(.+)$/m)?.[1]?.trim(),password=access.match(/^Parol:\s*(.+)$/m)?.[1]?.trim();assert.ok(email&&password,'Local admin access missing');
const login=await fetch(base+'/auth/login',{method:'POST',redirect:'manual',headers:{'content-type':'application/x-www-form-urlencoded',origin:base},body:new URLSearchParams({email,password})});assert.equal(login.headers.get('location'),'/catalog/','Login failed');
const cookie=login.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
const get=async path=>{const r=await fetch(base+path,{signal:AbortSignal.timeout(60000)});assert.equal(r.status,200,path);return r.json();};
const before=await get('/api/catalog');const stamp=new Date().toISOString().replace(/[:.]/g,'-');fs.mkdirSync('.netlify/batch-medical',{recursive:true});fs.writeFileSync('.netlify/batch-medical/before-'+stamp+'.json',JSON.stringify(before,null,2));let done=0;
try{for(const model of data){
 if(before.models.some(x=>x.id===model.id)){assert.deepEqual((await get('/api/catalog?id='+model.id)).model,model,'Existing model differs; refusing to overwrite.');}
 else{const r=await fetch(base+'/api/catalog',{method:'PUT',headers:{cookie,origin:base,'content-type':'application/json'},body:JSON.stringify({model,revision:0}),signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error('Import '+model.id+': '+r.status+' '+await r.text());assert.deepEqual((await get('/api/catalog?id='+model.id)).model,model,'Post-write mismatch');}
 console.log(++done+'/'+data.length,model.deviceName,model.sectionCode,model.parts.length+' positions');
}
const after=await get('/api/catalog');for(const original of before.models)assert.deepEqual(after.models.find(x=>x.id===original.id),original,'Pre-existing record changed');assert.equal(after.models.length,before.models.length+data.filter(m=>!before.models.some(x=>x.id===m.id)).length);
fs.writeFileSync('.netlify/batch-medical/verified-'+stamp+'.json',JSON.stringify({after,imported:data.map(m=>m.id)},null,2));console.log('VERIFIED',data.length,'sections;',data.flatMap(m=>m.parts).length,'positions;',data.flatMap(m=>m.parts).flatMap(p=>p.variants).length,'article entries; previous catalog unchanged');
}finally{await fetch(base+'/auth/logout',{method:'POST',headers:{cookie,origin:base}});}
