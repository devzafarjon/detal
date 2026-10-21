import {env} from 'cloudflare:workers';
export async function POST(req:Request){
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Manba ruxsat etilmagan.'},{status:403});
 if(Number(req.headers.get('content-length'))>12*1024*1024)return Response.json({error:'Rasm 12 MB dan kichik bo‘lsin.'},{status:413});
 try{const bytes=new Uint8Array(await req.arrayBuffer());if(bytes.length>12*1024*1024)throw Error('Rasm 12 MB dan kichik bo‘lsin.');
 let type='';if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)type='image/jpeg';if(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71)type='image/png';if(new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP')type='image/webp';if(!type)throw Error('JPG, PNG yoki WebP rasm yuklang.');
 const key=crypto.randomUUID();await env.BUCKET!.put(key,bytes,{httpMetadata:{contentType:type}});return Response.json({url:'/api/image/'+key});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Yuklash amalga oshmadi.'},{status:400})}
}
