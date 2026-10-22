import assert from 'node:assert/strict';
const base='http://127.0.0.1:8787';
const owner={'oai-authenticated-user-id':'local-owner-test','oai-authenticated-user-email':'officealisher12@gmail.com',Origin:base,'Content-Type':'application/json'};
let localRestarts=0;
const call=async(path,method='GET',body,headers={})=>{for(let attempt=0;attempt<4;attempt++){const r=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});const bytes=await r.arrayBuffer();if(r.status===503&&new TextDecoder().decode(bytes).includes('worker restarted mid-request')){localRestarts++;await new Promise(r=>setTimeout(r,200));continue;}return new Response(bytes,{status:r.status,headers:r.headers});}throw Error('Local Worker kept restarting');};

assert.equal((await (await call('/api/session')).json()).admin,false);
assert.equal((await (await call('/api/session','GET',undefined,owner)).json()).admin,true);
assert.equal((await (await call('/api/session','GET',undefined,{...owner,'oai-authenticated-user-id':'another-user'})).json()).admin,false);
for(const [path,method] of [['/api/catalog','PUT'],['/api/catalog','DELETE'],['/api/upload','POST'],['/api/scan-ai','POST'],['/api/scan-ai','GET']])assert.equal((await call(path,method,method==='GET'?undefined:{}, {Origin:base})).status,403,path);
const list=await(await call('/api/catalog')).json();assert.equal(list.models.length,1000);assert.ok(list.models.every(m=>!m.parts));
let d=await(await call('/api/catalog?id=1')).json();assert.ok(d.model.parts.length>0);const original=structuredClone(d.model);
assert.equal((await call('/api/catalog','PUT',d, {...owner,Origin:'https://wrong.example'})).status,403);
const invalid=structuredClone(d);invalid.model.parts[0].price=-1;assert.equal((await call('/api/catalog','PUT',invalid,owner)).status,400);
d.model.parts[0].name='Sinov nomi';let saved=await call('/api/catalog','PUT',d,owner);assert.equal(saved.status,200);const revision=(await saved.json()).revision;
assert.equal((await call('/api/catalog','PUT',d,owner)).status,409);
assert.equal((await(await call('/api/catalog?id=1')).json()).model.parts[0].name,'Sinov nomi');
assert.equal((await call('/api/catalog','PUT',{model:{...original,id:9999999},revision:0},owner)).status,409);
assert.equal((await call('/api/catalog','PUT',{model:original,revision},owner)).status,200);
// 500 simulated visitors, each fetching the list and one drawing, with 25 simultaneous visitors.
const times=[];let next=0,failed=0;const started=performance.now();
await Promise.all(Array.from({length:25},async()=>{while(next<500){const i=next++;const start=performance.now();for(const path of ['/api/catalog','/api/catalog?id='+list.models[i%1000].id]){const r=await call(path);if(!r.ok)failed++;await r.arrayBuffer();}times.push(performance.now()-start);}}));
times.sort((a,b)=>a-b);assert.equal(failed,0);console.log(JSON.stringify({passed:true,drawings:1000,visitors:500,concurrent:25,requests:1000,errors:failed,localDevRestarts:localRestarts,seconds:+((performance.now()-started)/1000).toFixed(2),visitorP95ms:+times[Math.floor(times.length*.95)].toFixed(1)},null,2));
