import fs from 'node:fs';import assert from 'node:assert/strict';import {build} from 'esbuild';
const {outputFiles}=await build({entryPoints:['lib/catalog-validation.ts'],bundle:true,write:false,format:'esm',platform:'node'});const {validate}=await import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].text).toString('base64'));
const sections=JSON.parse(fs.readFileSync('research/a7/catalog.json'));const expected=[28,19,13,12,16,5,4,2,4,5,2,1,2,4,3,4,3,43];
assert.equal(sections.length,18);
for(const [i,m] of sections.entries()){
 validate([m]);assert.equal(m.parts.length,expected[i]);assert.ok(fs.existsSync('public/catalog/'+m.image));
 assert.deepEqual(m.parts.map(p=>p.id),Array.from({length:expected[i]},(_,n)=>n+1));
 for(const p of m.parts){assert.ok(p.variants.every(v=>v.article&&v.name&&v.sourcePage>=3&&v.sourcePage<=27));assert.equal(Boolean(p.tableOnly),false);assert.ok(p.locations.length);for(const loc of p.locations)assert.ok(loc.x>0&&loc.y>0&&loc.x<m.size[0]&&loc.y<m.size[1]);}
}
assert.equal(sections[0].parts[27].variants.length,4);
assert.equal(sections[14].parts[2].variants[1].name,'proportional valve module(0635/O2/AIR)');
assert.match(sections[0].parts[27].variants[2].remarks,/monitoring of gas supply/);
console.log('A7: all sections, sequential positions, configuration variants, page continuations and hotspot bounds verified.');
