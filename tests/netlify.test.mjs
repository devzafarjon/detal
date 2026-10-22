import {build} from 'esbuild';
import {resolve} from 'node:path';
await build({entryPoints:['tests/netlify/cases.ts'],outfile:'.netlify/netlify-tests.mjs',bundle:true,platform:'node',format:'esm',target:'node22',packages:'external',plugins:[{name:'test-runtime',setup(b){
 b.onResolve({filter:/^cloudflare:workers$/},()=>({path:resolve('netlify/source/runtime.ts')}));
 b.onResolve({filter:/catalog-access$/},()=>({path:resolve('netlify/source/auth.ts')}));
 b.onResolve({filter:/^@neondatabase\/serverless$/},()=>({path:resolve('tests/netlify/neon.ts')}));
 b.onResolve({filter:/^@netlify\/blobs$/},()=>({path:resolve('tests/netlify/blobs.ts')}));
}}]});
await import(resolve('.netlify/netlify-tests.mjs')+'?'+Date.now());
