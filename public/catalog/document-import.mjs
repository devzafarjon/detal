// Conversion is local; only rendered pages enter the existing, explicit AI workflow.
export const MAX_DOCUMENT_BYTES=40*1024*1024;
export function checkDocument(file){if(!file)throw Error('Avval fayl tanlang.');if(!file.size)throw Error('Fayl bo‘sh.');if(file.size>MAX_DOCUMENT_BYTES)throw Error('Fayl 40 MB dan kichik bo‘lsin.');}
export function isPDF(bytes){return new TextDecoder().decode(bytes.slice(0,5))==='%PDF-';}
export function isBrowserImage(file){return /\.(png|jpe?g|webp|gif|bmp|avif|svg|ico)$/i.test(file.name)||/^image\/(png|jpeg|webp|gif|bmp|avif|svg\+xml|x-icon)$/.test(file.type);}
export async function imageToJPEG(file){
 checkDocument(file);const url=URL.createObjectURL(file),img=new Image();
 try{img.src=url;await img.decode();if(!img.naturalWidth||!img.naturalHeight)throw Error('Rasm o‘lchami aniqlanmadi.');const ratio=Math.min(1,5000/Math.max(img.naturalWidth,img.naturalHeight),Math.sqrt(20000000/(img.naturalWidth*img.naturalHeight)));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);try{const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.94));if(!blob)throw Error('Rasm tayyorlanmadi.');return {blob,width:canvas.width,height:canvas.height};}finally{canvas.width=canvas.height=1;}}
 finally{URL.revokeObjectURL(url);img.src='';}
}
export async function toPDF(file,status=()=>{}){
 checkDocument(file);const bytes=new Uint8Array(await file.arrayBuffer());if(isPDF(bytes))return bytes;
 if(isBrowserImage(file)){
  status('Rasm tayyorlanmoqda…');const {blob,width,height}=await imageToJPEG(file);const {PDFDocument}=await import('./vendor/pdf-lib.mjs');const doc=await PDFDocument.create(),image=await doc.embedJpg(await blob.arrayBuffer());doc.addPage([width,height]).drawImage(image,{x:0,y:0,width,height});return doc.save();
 }
 if(!globalThis.crossOriginIsolated||typeof SharedArrayBuffer==='undefined')throw Error('Hujjat konvertatsiyasi uchun yangilangan Chrome, Edge yoki Firefox brauzerida saytni qayta oching.');
 status('Hujjat moduli yuklanmoqda. Birinchi foydalanishda taxminan 240 MB yuklanadi; oynani ochiq tuting…');
 const {WorkerBrowserConverter,createWasmPaths}=await import('./vendor/office/browser.js');
 const root=new URL('./vendor/office/',import.meta.url).href;
 const converter=new WorkerBrowserConverter({...createWasmPaths(root+'wasm/'),browserWorkerJs:root+'browser.worker.global.js'});
 let timer;try{
  const work=(async()=>{await converter.initialize();status(`${file.name}: sahifalar PDFga aylantirilmoqda…`);const result=await converter.convert(bytes,{outputFormat:'pdf'},file.name);if(!isPDF(result.data))throw Error('PDF natijasi olinmadi.');if(result.data.length>80*1024*1024)throw Error('Tayyor hujjat juda katta. Hujjatni kichikroq bo‘laklarga ajrating.');return result.data;})();
  return await Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Konvertatsiya vaqti tugadi. Kichikroq fayl bilan qayta urinib ko‘ring.')),240000);})]);
 }catch(e){if(/vaqti tugadi|juda katta/.test(e.message))throw e;throw Error('Bu faylni ochib bo‘lmadi: format qo‘llanmasligi, fayl buzilgan yoki parollangan bo‘lishi mumkin. Asl dasturidan PDF qilib saqlab, qayta yuklang.');}
 finally{clearTimeout(timer);const worker=converter.worker;let cleanupTimer;try{await Promise.race([converter.destroy(),new Promise(resolve=>{cleanupTimer=setTimeout(resolve,2000);})]);}finally{clearTimeout(cleanupTimer);worker?.terminate();}}
}
