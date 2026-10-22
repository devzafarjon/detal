const {readFileSync}=require('node:fs');const vm=require('node:vm');const assert=require('node:assert/strict');
const source=readFileSync('public/catalog/admin.js','utf8');const fn=source.slice(source.indexOf('async function upload(scan)'),source.indexOf("$('uploadForm').onsubmit"));
async function scenario(failStatus){
 const nodes={};const $=id=>nodes[id]??=( {value: id==='scanEngine'?'ai':id==='diagramSide'?'full':'',disabled:false,reportValidity:()=>true,querySelectorAll:()=>[]} );
 let active=0,max=0,calls=0,uploads=0;
 const ctx={$,window:{canAdmin:true,scanWithAI:async(m)=>{active++;max=Math.max(max,active);calls++;await new Promise(r=>setTimeout(r,2));active--;if(calls===2&&failStatus)throw Object.assign(Error('Test failure'),{status:failStatus});m.parts=[{id:1,name:'Test'}];return {found:1,matched:1};}},busy:false,dirty:false,pauseRequested:false,models:[],uploadQueue:[1,2,3].map(i=>({file:{name:`Model ${i}.png`,type:'image/png',size:20},done:false})),Image:class{naturalWidth=100;naturalHeight=100;async decode(){}},URL:{createObjectURL:()=>'',revokeObjectURL:()=>{}},fetch:async()=>{uploads++;return {ok:true,json:async()=>({url:'/api/image/test'})}},renderQueue(){},renderModel(){},hint(){},console};
 vm.createContext(ctx);vm.runInContext(fn,ctx);await ctx.upload(true);assert.equal(max,1);assert.equal(ctx.busy,false);
 if(failStatus===429){assert.equal(calls,2);assert.equal(ctx.uploadQueue[2].done,false);}else {assert.equal(calls,3);assert.equal(ctx.uploadQueue[2].done,true);}
 await ctx.upload(true);assert.equal(ctx.uploadQueue.every(x=>x.done),true);assert.equal(uploads,3);assert.equal(ctx.models.length,3);assert.equal(new Set(ctx.models.map(x=>x.id)).size,3);
 await ctx.upload(true);assert.equal(uploads,3);
}
(async()=>{await scenario(0);await scenario(502);await scenario(429);console.log('PASS: sequential processing, partial failure continuation, quota pause, retry without duplicate uploads, unique IDs, completed queue guard');})();
