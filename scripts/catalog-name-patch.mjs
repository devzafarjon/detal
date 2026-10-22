// Names only: preserve edited names and every price, article and diagram coordinate.
export const isPlaceholderName=name=>/^Detal\s+[\p{L}\p{N}][\p{L}\p{N}.\-]*(?:\s*[—-]\s*nomini kiriting)?$/u.test(name);
export const nameFields=['name','nameStatus','nameEvidence','nameSource','needsReview'];
export function mergeReviewedNames(model,reviewed){
 if(model.id!==reviewed.id||model.image!==reviewed.image)throw Error('Drawing identity mismatch');
 const result=structuredClone(model),updates=[],preserved=[];
 for(const part of result.parts){
  const candidate=reviewed.parts.find(p=>p.id===part.id);
  if(!candidate)continue;
  if(part.nameStatus==='user'||(!isPlaceholderName(part.name)&&part.name!==candidate.name)){preserved.push(part.id);continue;}
  if(!candidate.name?.trim()||isPlaceholderName(candidate.name))throw Error('Unresolved candidate');
  const before=structuredClone(part);
  for(const key of nameFields)if(candidate[key]!==undefined)part[key]=candidate[key];
  if(JSON.stringify(before)!==JSON.stringify(part))updates.push({id:part.id,before:Object.fromEntries(nameFields.map(k=>[k,before[k]])),after:Object.fromEntries(nameFields.map(k=>[k,part[k]]))});
 }
 return {model:result,updates,preserved};
}
