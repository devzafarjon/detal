import {build} from 'esbuild';import {resolve} from 'node:path';
await build({entryPoints:['tests/pdf/cases.ts'],outfile:'.netlify/pdf-tests.mjs',bundle:true,platform:'node',format:'esm',target:'node22',packages:'external'});
await import(resolve('.netlify/pdf-tests.mjs'));
