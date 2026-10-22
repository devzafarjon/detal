// Run locally after linking a Netlify site. Never log secret values.
import fs from 'node:fs';
import { parseEnv } from 'node:util';
import { randomBytes,scryptSync } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { neon } from '@neondatabase/serverless';
const local=parseEnv(fs.readFileSync('.env.local','utf8'));
const settings=parseEnv(fs.readFileSync('.env.netlify.local','utf8'));
if(!settings.DATABASE_URL)throw Error('Missing DATABASE_URL');
if(!settings.ADMIN_PASSWORD_HASH){
 const password=randomBytes(24).toString('base64url'),salt=randomBytes(16).toString('hex');
 settings.ADMIN_EMAIL='developerzafarjon@gmail.com';
 settings.ADMIN_PASSWORD_HASH=salt+':'+scryptSync(password,salt,64).toString('hex');
 settings.SESSION_SECRET=randomBytes(48).toString('base64url');
 fs.writeFileSync('../detal-admin-access.txt',`Detal admin\nURL: https://detal-devzafarjon.netlify.app/admin/\nEmail: ${settings.ADMIN_EMAIL}\nParol: ${password}\n`,{mode:0o600});
}
settings.OPENAI_API_KEY=local.OPENAI_API_KEY;
if(local.OPENAI_VISION_MODEL)settings.OPENAI_VISION_MODEL=local.OPENAI_VISION_MODEL;
if(!settings.OPENAI_API_KEY)throw Error('Missing approved OpenAI key');
fs.writeFileSync('.env.netlify.local',Object.entries(settings).map(([k,v])=>k+'='+JSON.stringify(v)).join('\n')+'\n',{mode:0o600});
const sql=neon(settings.DATABASE_URL);
for(const statement of fs.readFileSync('netlify/migrations/001_catalog.sql','utf8').split(';').filter(s=>s.trim()))await sql.query(statement);
const seed=fs.readFileSync('.netlify/catalog-migration.json','utf8');
await sql.query("INSERT INTO catalogs(id,data,revision) VALUES('main',$1,1) ON CONFLICT(id) DO NOTHING",[seed]);
console.log('Database schema and catalog imported.');
for(const [key,value] of Object.entries(settings)){
 const r=spawnSync('npx',['--yes','netlify-cli','env:set',key,value,'--secret','--context','production','deploy-preview','--force'],{encoding:'utf8'});
 if(r.status!==0){console.error('Failed to set '+key+'; secret output suppressed.');process.exit(1);}
 console.log('Configured '+key);
}
console.log('Admin credentials saved to ../detal-admin-access.txt');
