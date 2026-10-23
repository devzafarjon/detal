// Illustrative amounts in UZS. These are never supplier quotes.
const tiers=[
 ['display',/display|screen|lcd|touch ?panel|monitor|displey|ekran/i,2400000],
 ['vaporizer',/vaporizer|ventilator|defibrillator/i,1800000],
 ['electronics',/\bpcb\b|\bpcba\b|circuit board|main ?board|control board|power board|motherboard|controller|electron/i,1350000],
 ['sensor',/sensor|probe|transducer|detector|datchik/i,720000],
 ['pump',/pump|compressor|blower|nasos|kompressor/i,950000],
 ['power',/battery|bat ?pack|power supply|charger|transformer|batareya|akkumulyator/i,650000],
 ['motor',/motor|rotor|stator|engine|dvigatel/i,520000],
 ['flow',/flowmeter|pressure gauge|regulator|manifold|valve|klapan|vakuum/i,460000],
 ['bearing',/bearing|podshipnik/i,95000],
 ['fastener',/screw|bolt|nut|washer|spring|pin|clip|retaining ring|stopor|vint|gayka|shayba|halqa|prujina|shtift|sharcha/i,25000],
 ['seal',/gasket|seal|o-ring|diaphragm|zichlagich|prokladka/i,55000],
 ['filter',/filter|filtr|cotton|membrane/i,90000],
 ['cable',/cable|wire|cord|connector|tube|hose|tubing|kabel|shlang|trubka|adapter/i,140000],
 ['housing',/cover|housing|panel|frame|door|chassis|base|bracket|tray|qopqoq|korpus|taglik|tutqich/i,220000],
 ['assembly',/assembly|\basm\b|\bfru\b|\bunit\b|\bkit\b|yig‘ma|yig'ma/i,420000],
 ['mechanical',/wheel|handle|knob|button|switch|gear|shaft|g‘ildirak|dasta|tugma|tishli|val/i,130000],
];
function hash(value){let n=2166136261;for(const character of value){n^=character.codePointAt(0);n=Math.imul(n,16777619)}return n>>>0}
export function demoPriceFor(part){
 const name=String(part.name||'');const [category,rule,base]=tiers.find(([,pattern])=>pattern.test(name))||['other',null,180000];
 const variation=[0.92,0.96,1,1.04,1.08][hash(`${name.toLowerCase()}|${part.article||''}`)%5];
 return {category,price:Math.max(10000,Math.round(base*variation/5000)*5000)};
}
export function fillMissingDemoPrices(model,overrides=new Map()){
 const copy=structuredClone(model),categories={};let added=0;
 for(const part of copy.parts){if(part.price!==null&&part.price!==undefined)continue;const listed=overrides.get(`${model.id}:${part.id}`);const {category,price}=Number.isFinite(listed)&&listed>0?{category:'manifest',price:listed}:demoPriceFor(part);part.price=price;part.demoPrice=true;categories[category]=(categories[category]||0)+1;added++}
 return {model:copy,added,categories};
}
