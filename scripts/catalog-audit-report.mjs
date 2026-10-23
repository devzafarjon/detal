import fs from 'node:fs/promises';
const audit=JSON.parse(await fs.readFile('.netlify/catalog-audit/audit.json','utf8'));
const models=JSON.parse(await fs.readFile('.netlify/catalog-audit/models.json','utf8'));
const interactions=JSON.parse(await fs.readFile('.netlify/catalog-audit/interactions.json','utf8'));
const sections=models.map(m=>{
 const table=m.selectionKind==='table'||m.id===710018||Boolean(m.crops?.length&&m.crops.every(c=>c.table===true));
 const linked=m.parts.filter(p=>!p.tableOnly).length;
 const device=m.deviceName||(m.id>=710001&&m.id<=710018?'A7':m.name);
 return {id:m.id,name:m.name,device,parts:m.parts.length,linked,unlinked:m.parts.length-linked,
  status:table?'table':linked===m.parts.length?'linked':linked?'partial':'missing',
  missingIds:m.parts.filter(p=>p.tableOnly).map(p=>p.label||p.id),
  image:new URL(m.image.startsWith('/')?m.image:'/catalog/'+m.image,audit.origin).href,
  source:m.sourceDocument?new URL(m.sourceDocument,audit.origin).href:'',
  sourcePages:m.sourcePages||[],size:m.size};
});
const parts=models.flatMap(m=>m.parts);
const report={at:audit.at,origin:audit.origin,scope:'Read-only production data; local JSDOM interactions with the updated frontend.',
 quality:{tentativeNames:parts.filter(p=>p.nameStatus==='visual').length,needsReview:parts.filter(p=>p.needsReview).length,
  demoArticles:parts.filter(p=>p.demoArticle).length,unpriced:parts.filter(p=>p.price==null).length,
  demoPrices:parts.filter(p=>p.price!=null&&p.demoPrice!==false).length},
 counts:{...audit.counts,illustrated:sections.filter(s=>s.status!=='table').length,
  missingDiagrams:sections.filter(s=>['missing','partial'].includes(s.status)).length,
  missingDiagramParts:sections.filter(s=>s.status!=='table').reduce((n,s)=>n+s.unlinked,0),
  tableSections:sections.filter(s=>s.status==='table').length,
  tableParts:sections.filter(s=>s.status==='table').reduce((n,s)=>n+s.parts,0),
  assets:audit.assets.length,badAssets:audit.assets.filter(a=>a.status!==200).length,
  invalidSections:audit.sections.filter(s=>s.invalid.length).length},
 unchanged:audit.unchanged,interactions,sections,
 limitations:['Browser automation unavailable: no connected browsers; native pipe startup failed.',
  'JSDOM dispatches DOM events. It does not test physical pointer hit detection, layout, touch behavior or whether every coordinate visually matches its printed number.',
  'All 237 local image files were decoded and dimension-checked during mapping verification. Live asset checks use HTTP HEAD.',
  'Live paid AI, real supplier prices/stock and every possible document extension were not tested.',
  'The 1,007 new illustrated anchors were visually checked against original-image number crops; 684 table anchors use source-PDF text positions. All 1,648 older anchor crops were also visually reviewed and misplaced points corrected. Low-resolution source labels remain limited by original image quality.']};
const output='research/audit-'+audit.at.slice(0,10);
await fs.mkdir(output,{recursive:true});
await fs.writeFile(output+'/report.json',JSON.stringify(report,null,2));
let html=await fs.readFile('research/catalog-audit-template.html','utf8');
html=html.replace('__AUDIT_DATA__',JSON.stringify(report).replaceAll('<','\\u003c'));
await fs.writeFile(output+'/report.html',html);
console.log(JSON.stringify({output,counts:report.counts}));
