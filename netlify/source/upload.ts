import { randomUUID } from 'node:crypto';
import { ownerGuard, signedToken, readToken } from './auth';
import { files } from './runtime';
import { POST as upload } from '../../app/api/upload/route';
export async function chunkUpload(req: Request) {
 const denied=await ownerGuard(req);if(denied)return denied;
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const url=new URL(req.url),store=files();
 if(url.pathname.endsWith('/start'))return Response.json({token:signedToken({purpose:'upload',id:randomUUID(),exp:Date.now()+900000})});
 const token=readToken(url.searchParams.get('token')||'','upload');if(!token)return Response.json({error:'Yuklash vaqti tugadi. Qayta urinib ko‘ring.'},{status:403});
 const prefix='upload-parts/'+token.id+'/';
 if(url.pathname.endsWith('/chunk')){
  const index=Number(url.searchParams.get('index'));if(!Number.isInteger(index)||index<0||index>3)return new Response('Invalid chunk',{status:400});
  const bytes=await req.arrayBuffer();if(bytes.byteLength>3*1024*1024)return new Response('Too large',{status:413});
  await store.set(prefix+index,bytes);return Response.json({ok:true});
 }
 if(!url.pathname.endsWith('/finish'))return new Response('Not found',{status:404});
 const count=Number(url.searchParams.get('count'));if(!Number.isInteger(count)||count<1||count>4)return new Response('Invalid count',{status:400});
 const chunks=await Promise.all(Array.from({length:count},(_,i)=>store.get(prefix+i,{type:'arrayBuffer'})));
 if(chunks.some(c=>!c))return Response.json({error:'Rasm to‘liq yuklanmagan. Qayta urinib ko‘ring.'},{status:400});
 const bytes=Buffer.concat(chunks.map(c=>Buffer.from(c!)));
 const response=await upload(new Request(url.origin+'/api/upload',{method:'POST',headers:{origin:url.origin,'content-length':String(bytes.length)},body:bytes}));
 if(response.ok)await Promise.all(chunks.map((_,i)=>store.delete(prefix+i)));
 return response;
}
