import { AsyncLocalStorage } from 'node:async_hooks';
import { createHmac, timingSafeEqual, scryptSync, randomBytes } from 'node:crypto';
import { DB } from './database';
export const requestContext = new AsyncLocalStorage<{ request: Request; ip: string }>();
const cookieName = '__Host-detal_session';
function sign(value: string) { if (!process.env.SESSION_SECRET) throw Error('Session secret missing'); return createHmac('sha256', process.env.SESSION_SECRET).update(value).digest('base64url'); }
function equal(a: string, b: string) { const x=Buffer.from(a),y=Buffer.from(b); return x.length===y.length && timingSafeEqual(x,y); }
export function signedToken(payload: object) { const raw=Buffer.from(JSON.stringify(payload)).toString('base64url');return `${raw}.${sign(raw)}`; }
export function readToken(token: string, purpose: string): any {
  try { const [raw,sig,...rest]=token.split('.');if(rest.length||!raw||!sig||!equal(sig,sign(raw)))return null;
    const data=JSON.parse(Buffer.from(raw,'base64url').toString());return data.purpose===purpose&&data.exp>Date.now()?data:null;
  } catch { return null; }
}
export async function isOwner() {
  const cookie=requestContext.getStore()?.request.headers.get('cookie')||'';
  const token=cookie.split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='))?.slice(cookieName.length+1);
  const session=token&&readToken(token,'session');
  return !!session && session.email===process.env.ADMIN_EMAIL;
}
export async function ownerGuard(req?: Request) {
  if(!await isOwner())return Response.json({error:'Admin sifatida kiring.'},{status:403});
  if(req&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Manba ruxsat etilmagan.'},{status:403});
  return null;
}
const redirect=(path: string,cookie?: string)=>new Response(null,{status:303,headers:{Location:path,'Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});
export async function authRoute(req: Request) {
  if(req.method!=='POST')return new Response('Method not allowed',{status:405});
  if(req.headers.get('origin')!==new URL(req.url).origin)return new Response('Forbidden',{status:403});
  if(new URL(req.url).pathname==='/auth/logout')return redirect('/catalog/',`${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
  const body=await req.text();if(body.length>4096)return new Response('Too large',{status:413});
  const fields=new URLSearchParams(body),password=fields.get('password')||'',email=(fields.get('email')||'').trim().toLowerCase();
  const ip=requestContext.getStore()?.ip||'unknown';
  const bucket=createHmac('sha256',process.env.SESSION_SECRET!).update(ip+':'+Math.floor(Date.now()/900000)).digest('hex');
  const attempt=await DB.prepare('INSERT INTO login_attempts(bucket,count) VALUES(?,1) ON CONFLICT(bucket) DO UPDATE SET count=login_attempts.count+1 WHERE login_attempts.count<10 RETURNING count').bind(bucket).first();
  if(!attempt)return redirect('/admin/?error=limit');
  const [salt,expected]=String(process.env.ADMIN_PASSWORD_HASH||'').split(':');
  if(!salt||!expected)return new Response('Admin login is not configured',{status:503});
  const computed=scryptSync(password,salt,64).toString('hex');
  if(email!==process.env.ADMIN_EMAIL||!equal(computed,expected))return redirect('/admin/?error=login');
  const token=signedToken({purpose:'session',email,exp:Date.now()+8*3600000,nonce:randomBytes(16).toString('hex')});
  return redirect('/catalog/',`${cookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`);
}
