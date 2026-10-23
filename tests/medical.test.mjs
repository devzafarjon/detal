import fs from 'node:fs';import assert from 'node:assert/strict';import {build} from 'esbuild';
const {outputFiles}=await build({entryPoints:['lib/catalog-validation.ts'],bundle:true,write:false,format:'esm',platform:'node'});const {validate}=await import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].text).toString('base64'));
const sections=JSON.parse(fs.readFileSync('research/medical/catalog.json'));assert.equal(sections.length,197);assert.equal(new Set(sections.map(m=>m.id)).size,197);assert.equal(new Set(sections.map(m=>m.deviceId)).size,17);
for(const m of sections){validate([m]);assert.ok(fs.existsSync('public/catalog/'+m.image));assert.ok(fs.existsSync('public'+m.sourceDocument));assert.ok(m.parts.length);for(const p of m.parts){assert.ok(p.name);assert.ok(p.variants.length);for(const v of p.variants){assert.ok(v.name);assert.ok(m.sourcePages.includes(v.sourcePage));}if(!p.tableOnly){assert.ok(p.locations.length);for(const loc of p.locations)assert.ok(loc.x>=0&&loc.x<=m.size[0]&&loc.y>=0&&loc.y<=m.size[1]);}}}
const section=(key,code)=>sections.find(s=>s.deviceId===key&&s.sectionCode===code);
assert.equal(section('catalog-21','1.5').parts.find(p=>p.id===8).variants[0].article,'051-000768-00');
assert.equal(section('catalog-21','1.8').parts.find(p=>p.id===17).variants.length,5);
assert.equal(section('catalog-06','1.4').parts.find(p=>p.id===6).variants[0].article,'115-041354-00');
assert.ok(section('catalog-12','1.6').size[1]>800,'Entire vector diagram must remain visible');
console.log('Medical catalog: 17 device groups, 197 sections, schemas, source links, variants and corrected page continuations verified.');
