import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../app/chatgpt-auth';
// Verified owner from the Sites access policy. Identity comes only from Sites dispatch.
const OWNER_EMAIL='officealisher12@gmail.com';
export async function isOwner(){
 const user=await getChatGPTUser();if(!user)return false;
 let owner=await env.DB!.prepare('SELECT user_id FROM site_owner WHERE id=1').first<{user_id:string}>();
 // One-time enrollment while the Site is owner-private. Subsequent checks use the Site-scoped ID.
 if(!owner&&user.email.toLowerCase()===OWNER_EMAIL){await env.DB!.prepare('INSERT INTO site_owner(id,user_id) VALUES(1,?) ON CONFLICT(id) DO NOTHING').bind(user.userId).run();owner=await env.DB!.prepare('SELECT user_id FROM site_owner WHERE id=1').first<{user_id:string}>();}
 return owner?.user_id===user.userId;
}
export async function ownerGuard(req?:Request){
 if(!await isOwner())return Response.json({error:'Faqat sayt egasiga ruxsat berilgan.'},{status:403,headers:{'Cache-Control':'no-store'}});
 if(req&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Manba ruxsat etilmagan.'},{status:403});
 return null;
}
