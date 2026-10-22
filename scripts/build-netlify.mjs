import { build } from 'esbuild';
import { mkdir, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
const output='.netlify-build';
await rm(output,{recursive:true,force:true});
await mkdir(output+'/public/admin',{recursive:true});
await cp('public/catalog',output+'/public/catalog',{recursive:true});
await mkdir(output+'/public/catalog/vendor',{recursive:true});
for(const name of ['pdf.min.mjs','pdf.worker.min.mjs'])await cp('node_modules/pdfjs-dist/build/'+name,output+'/public/catalog/vendor/'+name);
for(const name of ['cmaps','standard_fonts','wasm'])await cp('node_modules/pdfjs-dist/'+name,output+'/public/catalog/vendor/'+name,{recursive:true});
await cp('netlify/client.js',output+'/public/catalog/netlify.js');
await cp('netlify/admin.html',output+'/public/admin/index.html');
await cp('netlify/login.js',output+'/public/admin/login.js');
let html=await readFile(output+'/public/catalog/index.html','utf8');
html=html.replace('/signin-with-chatgpt?return_to=%2Fcatalog%2F','/admin/').replace('<script>const models=[];</script>','<script src="netlify.js"></script><script>const models=[];</script>');
await writeFile(output+'/public/catalog/index.html',html);
let ai=await readFile(output+'/public/catalog/ai.js','utf8');
await writeFile(output+'/public/catalog/ai.js',ai.replace('AbortSignal.timeout(120000)','AbortSignal.timeout(600000)'));
await build({entryPoints:['netlify/source/api.ts'],outfile:output+'/functions/api.mjs',bundle:true,platform:'node',format:'esm',target:'node22',packages:'external',plugins:[{
 name:'netlify-runtime',setup(b){
  b.onResolve({filter:/^cloudflare:workers$/},()=>({path:resolve('netlify/source/runtime.ts')}));
  b.onResolve({filter:/catalog-access$/},()=>({path:resolve('netlify/source/auth.ts')}));
 }
}]});
console.log('Netlify frontend and API built.');
