import pdfplumber,json,pathlib,re
out={}
for f in sorted(pathlib.Path('public/catalog/documents/medical').glob('*.pdf')):
 pages=[]
 with pdfplumber.open(f) as pdf:
  for p in pdf.pages:
   pages.append({'lines':p.extract_text_lines(return_chars=False),'words':p.extract_words(),'images':[{'x0':i['x0'],'top':i['top'],'x1':i['x1'],'bottom':i['bottom']} for i in p.images]})
 out[f.stem]=pages;print(f.stem,flush=True)
json.dump(out,open('.netlify/batch-medical/geometry.json','w'),ensure_ascii=False)
