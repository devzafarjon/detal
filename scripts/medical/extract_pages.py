import pdfplumber,json,pathlib,re
out={}
for f in sorted(pathlib.Path('public/catalog/documents/medical').glob('*.pdf')):
 pages=[]
 with pdfplumber.open(f) as pdf:
  for n,p in enumerate(pdf.pages):
   text=p.extract_text() or ''; tables=p.find_tables();pages.append({'page':n+1,'width':p.width,'height':p.height,'text':text,'tables':[{'bbox':t.bbox,'rows':t.extract()} for t in tables]})
 print('\n',f.stem,len(pages),'pages')
 for p in pages:
  heads=[l for l in p['text'].splitlines() if re.match(r'^\d+(?:\.\d+)+\s',l)]
  print(p['page'],' | '.join(heads)[:260], 'tables',len(p['tables']))
 out[f.stem]=pages
json.dump(out,open('.netlify/batch-medical/pages.json','w'),ensure_ascii=False,indent=2)
