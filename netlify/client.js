(() => {
 const nativeFetch=window.fetch.bind(window);
 const pause=(ms,signal)=>new Promise((resolve,reject)=>{const timer=setTimeout(resolve,ms);signal?.addEventListener('abort',()=>{clearTimeout(timer);reject(signal.reason);},{once:true});});
 window.fetch=async function(input,options={}) {
  const path=typeof input==='string'?input:'';
  if(path==='/api/upload'&&options.body instanceof Blob&&options.body.size>4*1024*1024){
   const file=options.body;if(file.size>12*1024*1024)return new Response(JSON.stringify({error:'Rasm 12 MB dan kichik bo‘lsin.'}),{status:413});
   const start=await nativeFetch('/api/upload/start',{method:'POST'});if(!start.ok)return start;
   const {token}=await start.json(),chunkSize=3*1024*1024,count=Math.ceil(file.size/chunkSize);
   for(let i=0;i<count;i++){
    const r=await nativeFetch(`/api/upload/chunk?token=${encodeURIComponent(token)}&index=${i}`,{method:'POST',body:file.slice(i*chunkSize,(i+1)*chunkSize)});if(!r.ok)return r;
   }
   return nativeFetch(`/api/upload/finish?token=${encodeURIComponent(token)}&count=${count}`,{method:'POST'});
  }
  if(path==='/api/ai-jobs'&&options.method==='POST'&&typeof options.body==='string'){
   const payload=JSON.parse(options.body);
   if(payload.action==='refresh'&&payload.ids?.length>2){
    let response;
    for(let i=0;i<payload.ids.length;i+=2){response=await nativeFetch(input,{...options,body:JSON.stringify({...payload,ids:payload.ids.slice(i,i+2)})});if(!response.ok)return response;}
    return response;
   }
  }
  if(['/api/scan-ai','/api/ai-jobs'].includes(path)&&options.method==='POST'&&typeof options.body==='string'&&options.body.length>5000000){
   const payload=JSON.parse(options.body),scan=payload.scan||payload;
   if(scan.tiles){
    for(const quality of [.8,.65,.5]){
     for(const tile of scan.tiles){const img=new Image();img.src=tile.image;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;canvas.getContext('2d').drawImage(img,0,0);tile.image=canvas.toDataURL('image/jpeg',quality);}
     options={...options,body:JSON.stringify(payload)};if(options.body.length<=5000000)break;
    }
    if(options.body.length>5000000)return new Response(JSON.stringify({error:'AI uchun rasm juda katta. Kichikroq rasm bilan qayta urining.'}),{status:413});
   }
  }
  let result=await nativeFetch(input,options);
  if(path==='/api/scan-ai'&&options.method==='POST'&&result.status===202){
   const {id}=await result.json();
   for(let i=0;i<150;i++){
    await pause(2500,options.signal);
    result=await nativeFetch('/api/scan-ai?id='+encodeURIComponent(id),{signal:options.signal});
    if(result.status!==202)return result;
   }
   return new Response(JSON.stringify({error:'AI hali tahlil qilmoqda. Keyinroq qayta tekshiring.'}),{status:504});
  }
  return result;
 };
 document.addEventListener('DOMContentLoaded',async()=>{
  const r=await nativeFetch('/api/session');if(!r.ok)return;const {admin}=await r.json();
  if(admin){const form=document.createElement('form');form.method='POST';form.action='/auth/logout';const button=document.createElement('button');button.textContent='Chiqish';form.append(button);document.querySelector('.header-actions').append(form);}
 });
})();
