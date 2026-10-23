// Read-only production audit. Never changes catalog records.
import fs from 'node:fs/promises';
const origin=process.env.CATALOG_ORIGIN||'https://detal-demo.netlify.app';
const out='.netlify/catalog-audit';
await fs.mkdir(out,{recursive:true});
async function get(path){const r=await fetch(origin+path,{signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error(`${path}: HTTP ${r.status}`);return r.json();}
async function pool(items,fn){let next=0;return Promise.all(Array.from({length:6},async()=>{while(next<items.length){const i=next++;await fn(items[i],i);}}));}
const before=await get('/api/catalog');const models=[];
await pool(before.models,async(summary,i)=>{const d=await get('/api/catalog?id='+summary.id);models[i]={...d.model,_revision:d.revision};});
await fs.writeFile(out+'/models.json',JSON.stringify(models,null,2));
const assets=[...new Set(models.flatMap(m=>[m.image.startsWith('/')?m.image:'/catalog/'+m.image,m.sourceDocument].filter(Boolean)))];const assetResults=[];
await pool(assets,async(path)=>{const r=await fetch(origin+path,{method:'HEAD',signal:AbortSignal.timeout(60000)});assetResults.push({path,status:r.status,type:r.headers.get('content-type')});});
const sections=models.map(m=>{const linked=m.parts.filter(p=>!p.tableOnly);const invalid=linked.filter(p=>(p.locations||[{x:p.x,y:p.y}]).some(l=>!Number.isFinite(l.x)||!Number.isFinite(l.y)||l.x<0||l.y<0||l.x>m.size[0]||l.y>m.size[1]));return {id:m.id,name:m.name,device:m.deviceName||m.name,parts:m.parts.length,linked:linked.length,unlinked:m.parts.length-linked.length,invalid:invalid.map(p=>p.id),image:m.image,note:m.note||''};});
const after=await get('/api/catalog');
const result={at:new Date().toISOString(),origin,counts:{sections:models.length,parts:sections.reduce((n,m)=>n+m.parts,0),linked:sections.reduce((n,m)=>n+m.linked,0),unlinked:sections.reduce((n,m)=>n+m.unlinked,0),fullyLinked:sections.filter(m=>m.linked===m.parts).length,partlyLinked:sections.filter(m=>m.linked>0&&m.linked<m.parts).length,noLinked:sections.filter(m=>!m.linked).length},sections,assets:assetResults,unchanged:JSON.stringify(before)===JSON.stringify(after)};
await fs.writeFile(out+'/audit.json',JSON.stringify(result,null,2));console.log(JSON.stringify({counts:result.counts,badAssets:assetResults.filter(a=>a.status!==200),invalid:sections.filter(s=>s.invalid.length),unchanged:result.unchanged},null,2));
