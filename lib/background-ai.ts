import {normalizeScan,scanSchema,scanInstructions,researchInstructions,responseSourceUrls} from './diagram-ai';
export function aiRequest(body:any,model:string){
 const content:any[]=[{type:'input_text',text:JSON.stringify({modelName:body.modelName})}];
 body.tiles.forEach((t:any,i:number)=>content.push({type:'input_text',text:`Image ${i}: ${i===0?'whole sheet':'diagram crop '+i}.`},{type:'input_image',image_url:t.image,detail:'high'}));
 return {model,background:true,store:true,instructions:scanInstructions+researchInstructions,tools:[{type:'web_search'}],tool_choice:'required',include:['web_search_call.action.sources'],input:[{role:'user',content}],max_output_tokens:14000,text:{format:{type:'json_schema',name:'diagram_parts',strict:true,schema:scanSchema}}};
}
export function readAIResult(data:any,tiles:any[]){
 if(data.status!=='completed')throw Error('AI natijani to‘liq tugatmadi.');
 const output=(data.output||[]).flatMap((o:any)=>o.content||[]);
 if(output.some((c:any)=>c.type==='refusal'))throw Error('AI bu rasmni tahlil qila olmadi.');
 const text=output.filter((c:any)=>c.type==='output_text').map((c:any)=>c.text).join('');
 return normalizeScan(JSON.parse(text),tiles,responseSourceUrls(data));
}
export function providerError(status:number,data:any){
 const code=data?.error?.code;
 if(['insufficient_quota','credit_balance_exhausted'].includes(code))return 'OpenAI balansida mablag‘ yetarli emas. Balansni to‘ldirib qayta yuboring.';
 return status===401?'OpenAI kalitini tekshirish kerak.':status===429?'OpenAI limiti: keyinroq qayta urinib ko‘ring.':'OpenAI so‘rovni bajarmadi. Keyinroq qayta urinib ko‘ring.';
}
