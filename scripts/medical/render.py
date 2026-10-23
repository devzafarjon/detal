import pypdfium2 as pdfium,json,math
from PIL import Image
ss=json.load(open('research/medical/sections.json'));geo=json.load(open('.netlify/batch-medical/geometry.json'));pdfs={};cache={};count=0
for s in ss:
 key=s['deviceId'];pdf=pdfs.setdefault(key,pdfium.PdfDocument('public/catalog/documents/medical/'+key+'.pdf'))
 width=1500;pieces=[];offset=0
 for c in s['crops']:
  n=c['page'];box=c['box'];scale=width/(box[2]-box[0]);page=pdf[n-1];im=page.render(scale=scale).to_pil();part=im.crop(tuple(round(v*scale) for v in box));im.close();pieces.append(part)
  if not c.get('table'):
   for w in geo[key][n-1]['words']:
    text=w['text'].replace('○','').replace('◯','')
    if not text.isdigit() or not(box[0]<w['x0']<box[2] and box[1]<w['top']<box[3]):continue
    if not any(c['text']=='○' and abs(c['x0']-w['x0'])<18 and abs(c['top']-w['top'])<12 for c in geo[key][n-1]['words']):continue
    p=next((p for p in s['parts'] if p['id']==int(text)),None)
    if p is None:continue
    loc={'x':((w['x0']+w['x1'])/2-box[0])*scale,'y':((w['top']+w['bottom'])/2-box[1])*scale+offset}
    p.setdefault('locations',[]).append(loc);p.update(loc);p['tableOnly']=False;p['hitWidth']=max(18,(w['x1']-w['x0']+5)*scale);p['hitHeight']=max(18,(w['bottom']-w['top']+5)*scale)
  offset+=part.height+20
 image=Image.new('RGB',(width,offset),'white');y=0
 for part in pieces:image.paste(part,(0,y));y+=part.height+20;part.close()
 if image.height>15000:
  scale=15000/image.height;image=image.resize((round(image.width*scale),15000))
  for p in s['parts']:
   p['x']*=scale;p['y']*=scale
   if p.get('locations'):
    for loc in p['locations']:loc['x']*=scale;loc['y']*=scale
 s['image']='assets/medical/'+key+'-section-'+str(s['id']%100)+'.jpg';s['size']=list(image.size);s['view']=[0,0,*image.size]
 image.save('public/catalog/'+s['image'],quality=92,optimize=True);image.close();count+=1
 if count%20==0:print(count,flush=True)
json.dump(ss,open('research/medical/catalog.json','w'),ensure_ascii=False,indent=2)
for p in pdfs.values():p.close()
print('DONE',len(ss))
