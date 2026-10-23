import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
const models=['research/medical/catalog.json','research/a7/catalog.json','research/mapping/legacy-corrections.json'].flatMap(p=>JSON.parse(fs.readFileSync(p,'utf8')));
const {outputFiles}=await build({entryPoints:['lib/catalog-validation.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {validate}=await import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].text).toString('base64'));
test('all imported parts have valid, reachable anchors whose centers are not obscured by other parts',()=>{
 for(const m of models){validate([m]);const r=Math.max(5,Math.min(...m.size)*.013),points=[];
  for(const p of m.parts){assert.ok(!p.tableOnly,`${m.id}:${p.id} unlinked`);for(const l of p.locations||[p]){
   if(m.pageRegions)assert.ok(m.pageRegions.some(({box:[x,y,w,h]})=>l.x>=x&&l.x<=x+w&&l.y>=y&&l.y<=y+h),`${m.id}:${p.id} unreachable`);
   points.push({id:p.id,x:l.x,y:l.y,w:l.hitWidth||p.hitWidth||r*Math.max(1.65,String(p.label||p.id).length*.8),h:l.hitHeight||p.hitHeight||r*1.6});
  }}
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){const p=points[i],q=points[j];if(p.id!==q.id)assert.ok(Math.abs(p.x-q.x)>=q.w/2||Math.abs(p.y-q.y)>=q.h/2,`${m.id}:${p.id} hidden by ${q.id}`);}
 }
});
test('versioned complete tables retain all source pages and known duplicate entries remain archived',()=>{
 const tables=models.filter(m=>m.selectionKind==='table');assert.equal(tables.length,17);assert.equal(tables.reduce((n,m)=>n+m.parts.length,0),684);
 for(const m of tables){assert.match(m.image,/-v2.jpg$/);for(const p of m.parts)for(const point of p.locations)assert.ok(m.pageRegions.some(r=>r.page===point.sourcePage));}
 for(const [id,part] of [[15,81],[17,9],[17,48]]){const m=models.find(m=>m.id===id);assert.ok(!m.parts.some(p=>p.id===part));assert.ok(m.archivedImportParts.some(a=>a.part.id===part&&a.reason));}
});
test('server rejects malformed secondary coordinates, hit dimensions and page regions',()=>{
 for(const mutate of [m=>m.parts[0].locations=[{x:NaN,y:2}],m=>m.parts[0].locations=[{x:m.size[0]+1,y:2}],m=>m.parts[0].hitWidth=-2,m=>m.pageRegions=[{box:[0,0,0,100]}]]){const m=structuredClone(models[0]);mutate(m);assert.throws(()=>validate([m]));}
});
