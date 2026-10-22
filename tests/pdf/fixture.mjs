// A real 3-page PDF: cover, two independent diagrams, and a continuation table.
export function fixturePDF(){
 const text=(x,y,size,value)=>`BT /F1 ${size} Tf ${x} ${y} Td (${value}) Tj ET\n`;
 const diagram=(x,title)=>text(x,740,18,title)+text(x,710,11,'Exploded spare parts diagram')+`${x+40} 590 80 60 re S\n${x+60} 480 40 80 re S\n${x+55} 420 50 25 re S\n${x+150} 640 m ${x+110} 620 l S\n${x+150} 530 m ${x+100} 520 l S\n${x+150} 440 m ${x+105} 433 l S\n`+text(x+155,640,14,'1')+text(x+155,530,14,'2')+text(x+155,440,14,'3');
 const streams=[text(70,700,26,'DETAL TEST CATALOG')+text(70,650,14,'Contents: Model Alpha, Model Beta'),diagram(30,'MODEL ALPHA')+diagram(320,'MODEL BETA'),text(60,740,20,'MODEL ALPHA - PARTS TABLE')+text(60,680,15,'1   Motor housing')+text(60,640,15,'2   Rotor shaft')+text(60,600,15,'3   Bearing')];
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [4 0 R 6 0 R 8 0 R] /Count 3 >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
 for(let i=0;i<3;i++){objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5+i*2} 0 R >>`);objects.push(`<< /Length ${Buffer.byteLength(streams[i])} >>\nstream\n${streams[i]}endstream`);}
 let out='%PDF-1.4\n',offsets=[0];objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(out));out+=`${i+1} 0 obj\n${o}\nendobj\n`;});const xref=Buffer.byteLength(out);out+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
 return new Uint8Array(Buffer.from(out));
}
