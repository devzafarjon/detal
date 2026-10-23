import json,re,math,pathlib
P=json.load(open('.netlify/batch-medical/pages.json'));G=json.load(open('.netlify/batch-medical/geometry.json'))
names={5:'BeneFusion SP5',6:'BeneFusion VP5',7:'BeneHeart D3 / D2',8:'BeneHeart D6 / D5',9:'BeneView T1',10:'BeneView T5',11:'BeneView T6 / T8 / T9',12:'BeneVision N17 / N15 / N12',13:'BeneVision N1',14:'BeneVision N22 / N19',15:'SV300 / SV350',16:'SV600 / SV650 / SV800 / SV850',18:'SynoVent E3 / E5',19:'WATO EX-35 (KG)',20:'WATO EX-20 / EX-30 (DW / DY)',21:'WATO EX-55 / EX-65 (KU / KT)',22:'WATO EX-55Pro / EX-65Pro (F1 / KY)'}
clean=lambda s:re.sub(r'\s+',' ',s or '').strip()
def row5(r):
 if len(r)==15:return [' '.join(v for v in r[i:i+3] if v is not None) if any(v is not None for v in r[i:i+3]) else None for i in range(0,15,3)]
 if len(r)==7 and (re.search(r'Order',r[1] or '') or re.match(r'^[A-Z0-9]+-',r[1] or '')):return r[:2]+[' '.join(v for v in r[2:5] if v)]+r[5:]
 if len(r)==7:return [' '.join(v for v in r[:3] if v is not None) if any(v is not None for v in r[:3]) else None]+r[3:]
 return r
out=[];issues=[]
for key,pages in P.items():
 num=int(key[-2:]);device=names[num];sections=[];active=None;part=None
 for page,geo in zip(pages,G[key]):
  headings=[]
  for line in geo['lines']:
   m=re.match(r'^(1\.\d+(?:\.\d+)*)\s+(.+)',line['text'])
   if m and not re.search(r'\.{3}|Exploded View|Parts List',m[2],re.I):
    headings.append((line['top'],line,m))
  events=[(y,'heading',(l,m)) for y,l,m in headings]+[(t['bbox'][1],'table',t) for t in page['tables']]
  segments=[];segstart=70
  for y,kind,obj in sorted(events,key=lambda e:e[0]):
   if kind=='heading':
    if active:segments.append((segstart,y,active))
    line,m=obj;title=clean(m[2]);code=m[1]
    active={'id':800000+num*100+len(sections)+1,'name':(device+' · '+code+' '+title)[:150],'deviceId':key,'deviceName':device,'sectionCode':code,'sectionName':title,'parts':[],'crops':[],'sourcePages':[],'sourceDocument':'/catalog/documents/medical/'+key+'.pdf','sourceTables':[]}
    sections.append(active);part=None;segstart=line['bottom']+4
   elif active:
    t=obj;active['sourceTables'].append({'page':page['page'],'bbox':t['bbox']});active['sourcePages'].append(page['page'])
    for raw in t['rows']:
     r=row5(raw)
     if len(r)!=5:issues.append([key,page['page'],'columns',r]);continue
     ident,article,name,qty,remark=r
     if key=='catalog-21' and clean(article)=='115-033004-00':ident='17'
     if clean(ident).endswith(' Part') and not any(clean(v) for v in r[1:]):continue
     if clean(qty)=='y' and not any(clean(v) for v in [ident,article,name,remark]):continue
     if re.search(r'Order\s*Number',article or '',re.I) or (clean(name)=='Part Description'):continue
     if clean(ident).lower() in ['no.','no','item','no. item','item no.','.'] and not article:continue
     if not any(clean(v) for v in r):continue
     ident=clean(ident)
     previousPart=part
     if ident and re.fullmatch(r'\d+',ident):
      id=int(ident)
      part=next((p for p in active['parts'] if p['id']==id),None)
      if part is None:part={'id':id,'variants':[]};active['parts'].append(part)
     elif ident and ident not in ['/', '-', '\\']:
      issues.append([key,page['page'],'label',ident])
     if part is None:
      issues.append([key,page['page'],'orphan',r]);continue
     if article is None and name is None and not part['variants'] and previousPart and previousPart['variants']:
      inherited=dict(previousPart['variants'][-1]);inherited['sourcePage']=page['page'];inherited['quantity']='2 (5–6 uchun jami)' if key=='catalog-06' and part['id']==6 else inherited['quantity'];part['variants'].append(inherited);continue
     if clean(article) or (clean(name) and not part['variants']):
      prev=part['variants'][-1] if part['variants'] else {}
      v={'article':clean(article),'name':clean(name),'quantity':clean(qty if qty is not None else prev.get('quantity')),'remarks':clean(remark if remark is not None else prev.get('remarks')),'sourcePage':page['page']}
      part['variants'].append(v)
     elif part['variants']:
      v=part['variants'][-1]
      for field,value in [('name',name),('quantity',qty),('remarks',remark)]:
       if clean(value):v[field]+=' '+clean(value)
  if active:segments.append((segstart,page['height']-60,active))
  for top,bottom,sec in segments:
   if bottom<=top:continue
   # Split the section's page area at table boundaries; retain illustrated gaps.
   ts=[t['bbox'] for t in page['tables'] if t['bbox'][1]<bottom and t['bbox'][3]>top]
   cursor=top;gaps=[]
   for box in sorted(ts,key=lambda b:b[1]):
    if box[1]>cursor:gaps.append((cursor,min(bottom,box[1]-2)))
    cursor=max(cursor,box[3]+2)
   if cursor<bottom:gaps.append((cursor,bottom))
   for a,b in gaps:
    if b-a<25:continue
    imgs=[im for im in geo['images'] if im['top']<b and im['bottom']>a and im['top']>80]
    if sum((im['x1']-im['x0'])*(min(b,im['bottom'])-max(a,im['top'])) for im in imgs)<900:imgs=[]
    nums=[w for w in geo['words'] if a<w['top'] and w['bottom']<b and re.fullmatch(r'[○◯]?\d{1,3}',w['text'])]
    if not imgs and len(nums)<2:continue
    # Exclude heading/footer whitespace while retaining numbered callouts around images.
    viewHeads=[l for l in geo['lines'] if 'Exploded View' in l['text'] and a<=l['top']<b]
    listHeads=[l for l in geo['lines'] if 'Parts List' in l['text'] and a<=l['top']<b]
    y0=max([a]+[l['bottom']+3 for l in viewHeads])
    y1=min([b]+[l['top']-3 for l in listHeads])
    sec['crops'].append({'page':page['page'],'box':[55,max(a,y0),page['width']-45,min(b,y1)]});sec['sourcePages'].append(page['page'])
 for s in sections:
  if not s['parts'] and not s['crops']:continue
  s['sourcePages']=sorted(set(s['sourcePages']))
  if not s['crops']:
   if s['sourceTables']:
    t=s['sourceTables'][0];s['crops']=[{'page':t['page'],'box':t['bbox'],'table':True}]
   else:issues.append([key,s['sectionCode'],'NO IMAGE']);continue
  for p in s['parts']:
   if not p['variants']:
    p['variants']=[{'article':'','name':str(p['id'])+'-pozitsiya — nomi katalogda berilmagan','quantity':'','remarks':'Asl jadvalda nom va artikul bo‘sh.','sourcePage':s['sourcePages'][0]}];p['missingSourceData']=True
   vs=p['variants']
   for j in range(len(vs)-1,0,-1):
    if vs[j-1]['article'].endswith('-') and len(re.sub(r'\s','',vs[j]['article']))<=8 and vs[j]['sourcePage']>vs[j-1]['sourcePage']:
     vs[j-1]['article']+=vs[j]['article'];vs[j-1]['name']+=' '+vs[j]['name'];vs[j-1]['remarks']+=' '+vs[j]['remarks'];vs[j-1]['continuationPage']=vs[j]['sourcePage'];vs.pop(j)
   for v in vs:
    if re.fullmatch(r'[A-Z0-9\s-]+',v['article']) and '-' in v['article']:v['article']=re.sub(r'\s','',v['article'])
   v=p['variants'][0];p.update(name=v['name'] or 'Katalogdagi '+str(p['id'])+'-pozitsiya',article=v['article'] if len(p['variants'])==1 and v['article'] not in ['/','N/A','-'] else '',price=None,demoPrice=False,demoArticle=False,nameStatus='provided_catalog',nameEvidence=device+' · '+s['sectionCode']+' · asl katalogdan.',needsReview=bool(p.get('missingSourceData')),x=0,y=0,tableOnly=True)
  s['note']=device+' · '+s['sectionName']+' · Asl nomlar, artikullar va komplektatsiya izohlari katalogdan olingan.'
  out.append(s)
 print(key,len([s for s in out if s['deviceId']==key]),sum(len(s['parts']) for s in out if s['deviceId']==key),'positions')
json.dump(out,open('research/medical/sections.json','w'),ensure_ascii=False,indent=2)
json.dump(issues,open('.netlify/batch-medical/issues.json','w'),ensure_ascii=False,indent=2)
print('TOTAL',len(out),'sections',sum(len(s['parts']) for s in out),'parts',len(issues),'issues')
