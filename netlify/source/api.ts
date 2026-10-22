import * as catalog from '../../app/api/catalog/route';
import * as jobs from '../../app/api/ai-jobs/route';
import * as ai from '../../app/api/scan-ai/route';
import * as session from '../../app/api/session/route';
import * as upload from '../../app/api/upload/route';
import * as image from '../../app/api/image/[key]/route';
import { requestContext, authRoute } from './auth';
import { chunkUpload } from './upload';
import { scan } from './scan';
export default async function handler(req:Request,context:any={}) {
 return requestContext.run({request:req,ip:context.ip||'unknown'},async()=>{
  try {
   const url=new URL(req.url),path=url.pathname;
   if(path.startsWith('/auth/'))return await authRoute(req);
   if(path.startsWith('/api/upload/'))return await chunkUpload(req);
   if(path==='/api/scan-ai'&&(req.method==='POST'||url.searchParams.has('id')))return await scan(req);
   const routes:any={'/api/catalog':catalog,'/api/session':session,'/api/upload':upload,'/api/ai-jobs':jobs,'/api/scan-ai':ai};
   if(path.startsWith('/api/image/')&&req.method==='GET')return await image.GET(req,{params:Promise.resolve({key:path.slice(11)})});
   const route=routes[path];if(!route)return new Response('Not found',{status:404});
   const fn=route[req.method];if(!fn)return new Response('Method not allowed',{status:405});
   const response=await fn(req);response.headers.set('Cache-Control','no-store');return response;
  }catch(error){console.error('API request failed',error instanceof Error?error.name:'Error');return Response.json({error:'So‘rov bajarilmadi. Qayta urinib ko‘ring.'},{status:500,headers:{'Cache-Control':'no-store'}});}
 });
}
export const config={path:['/api/*','/auth/*']};
