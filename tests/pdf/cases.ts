import assert from 'node:assert/strict';
import {validatePages,normalizeLayout,layoutRequest} from '../../lib/pdf-layout';
import {sheetPlan} from '../../public/catalog/pdf-geometry.mjs';
import {fixturePDF} from './fixture.mjs';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createCanvas} from '@napi-rs/canvas';
import {resolve} from 'node:path';
const result={diagrams:[{name:'Model Alpha',note:'',regions:[{page:2,kind:'diagram',box:[0,0,480,1000]},{page:3,kind:'table',box:[0,0,1000,1000]}]},{name:'Model Beta',note:'',regions:[{page:2,kind:'diagram',box:[500,0,500,1000]}]}],warnings:[]};
assert.equal(normalizeLayout(result,3).diagrams.length,2); // Two diagrams on one page; cover skipped; table grouped.
assert.throws(()=>normalizeLayout({...result,diagrams:[{...result.diagrams[0],regions:[{page:4,kind:'diagram',box:[0,0,100,100]}]}]},3));
assert.throws(()=>normalizeLayout({...result,diagrams:[{...result.diagrams[0],regions:[{page:2,kind:'diagram',box:[950,0,100,100]}]}]},3));
assert.throws(()=>normalizeLayout({...result,diagrams:[result.diagrams[0],result.diagrams[0]]},3));
assert.deepEqual(normalizeLayout({diagrams:[],warnings:['No diagrams']},3).diagrams,[]);
assert.throws(()=>validatePages({name:'Big',pages:Array.from({length:51},(_,i)=>({page:i+1,image:'data:image/jpeg;base64,AAAA'}))}));
const body=validatePages({name:'Fixture',pages:[1,2,3].map(page=>({page,image:'data:image/jpeg;base64,AAAA'}))});assert.equal((layoutRequest(body,'gpt-4.1').input[0].content as any[]).filter(c=>c.type==='input_image').length,3);
const pdf=await getDocument({data:fixturePDF(),isEvalSupported:false,standardFontDataUrl:resolve('node_modules/pdfjs-dist/standard_fonts')+'/'}).promise;assert.equal(pdf.numPages,3);
const canvases=new Map(),dimensions:any={};
for(let n=1;n<=pdf.numPages;n++){const page=await pdf.getPage(n),viewport=page.getViewport({scale:1}),canvas=createCanvas(viewport.width,viewport.height);await page.render({canvasContext:canvas.getContext('2d') as any,viewport,canvas:canvas as any}).promise;canvases.set(n,canvas);dimensions[n]=[canvas.width,canvas.height];}
const plan=sheetPlan(result.diagrams[0].regions,dimensions);assert.equal(plan.placements.length,2);assert.ok(plan.view[2]<plan.width);assert.ok(plan.height<=12000);const output=createCanvas(plan.width,plan.height),ctx=output.getContext('2d');for(const p of plan.placements)(ctx.drawImage as any).call(ctx,canvases.get(p.page),...p.crop,...p.dest);assert.ok(output.toBuffer('image/jpeg').length>1000);
await pdf.destroy();console.log('PASS: actual PDF rendering; multiple diagrams per page; cross-page tables; invalid/duplicate regions; page limits; composite dimensions.');
