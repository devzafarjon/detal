export function sheetPlan(regions,dimensions){
 if(!Array.isArray(regions)||!regions.some(r=>r.kind==='diagram'))throw Error('Kamida bitta sxema hududi kerak.');
 const columns=[[],[]];
 for(const r of regions){const d=dimensions[r.page];if(!d||!Array.isArray(r.box)||r.box.length!==4||r.box.some(n=>!Number.isFinite(n)))throw Error('Sahifa yoki hudud noto‘g‘ri.');const [x,y,w,h]=r.box;if(x<0||y<0||w<5||h<5||x+w>1000||y+h>1000)throw Error('Hudud sahifadan tashqarida.');const crop=[x*d[0]/1000,y*d[1]/1000,w*d[0]/1000,h*d[1]/1000];const column=r.kind==='table'?1:0,scale=Math.min(1,(column?1200:1800)/crop[2]);columns[column].push({page:r.page,crop,width:crop[2]*scale,height:crop[3]*scale});}
 const widths=columns.map(c=>Math.max(0,...c.map(r=>r.width))),heights=columns.map(c=>c.reduce((n,r)=>n+r.height+20,0));
 const width=widths[0]+(widths[1]?widths[1]+30:0),height=Math.max(...heights),scale=Math.min(1,12000/height,Math.sqrt(22000000/(width*height)));
 const placements=[];columns.forEach((c,i)=>{let y=0;for(const r of c){placements.push({...r,dest:[(i?widths[0]+30:0)*scale,y*scale,r.width*scale,r.height*scale]});y+=r.height+20;}});
 return {width:Math.ceil(width*scale),height:Math.ceil(height*scale),view:[0,0,widths[0]*scale,heights[0]*scale],placements};
}
