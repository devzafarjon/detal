import copy,json,pathlib,sqlite3
root=pathlib.Path(__file__).resolve().parents[1]
raw=(root/'public/catalog/data.js').read_text()
seed=json.loads(raw[len('const models = '):].strip().rstrip(';'))
report=json.loads((root/'research/web-part-review.json').read_text())
patches=report['updates']
assert len(patches)==50
base=copy.deepcopy(seed)
def find(data,patch):
 return next(p for m in data if m['image']==patch['image'] for p in m['parts'] if p['id']==patch['id'])
for patch in patches:
 part=find(base,patch)
 for key,oldkey in [('name','oldName'),('nameStatus','oldStatus'),('nameEvidence','oldEvidence'),('nameSource','oldSource'),('needsReview','oldNeedsReview')]:part[key]=patch[oldkey]
custom=copy.deepcopy(base)
a=find(custom,patches[0]);a['name']='Mijoz yozgan nom';a['price']=456789;a['article']='MY-ARTICLE';a['x']=123.45
b=find(custom,patches[1]);b['nameStatus']='user'
c=find(custom,patches[2]);c['price']=998877;c['article']='CUSTOM-ART'
db=sqlite3.connect(':memory:')
db.execute('create table catalogs(id text,data text,revision integer)')
db.execute('insert into catalogs values(?,?,?)',('main',json.dumps(custom),20))
sql=(root/'drizzle/0006_web_part_names.sql').read_text()
db.executescript(sql)
out,revision=db.execute('select data,revision from catalogs').fetchone();out=json.loads(out)
assert revision==21
assert find(out,patches[0])==a
assert find(out,patches[1])==b
assert len(out)==len(custom)
allowed={'name','nameStatus','nameEvidence','nameSource','needsReview'}
for old,new in zip(custom,out):
 assert {k:v for k,v in old.items() if k!='parts'}=={k:v for k,v in new.items() if k!='parts'}
 assert len(old['parts'])==len(new['parts'])
 for p,q in zip(old['parts'],new['parts']):
  assert {k:v for k,v in p.items() if k not in allowed}=={k:v for k,v in q.items() if k not in allowed}
for patch in patches[2:]:
 part=find(out,patch)
 for k in allowed:assert part[k]==patch[k],(patch['id'],k)
assert find(out,patches[2])['article']=='CUSTOM-ART'
db.executescript(sql)
again,rev2=db.execute('select data,revision from catalogs').fetchone()
assert json.loads(again)==out and rev2==revision
# Uncustomized existing catalogs migrate exactly to the new seed.
db.execute('update catalogs set data=?,revision=0',(json.dumps(base),));db.executescript(sql)
assert json.loads(db.execute('select data from catalogs').fetchone()[0])==seed
print('PASS: 50 verified names; custom names/status, prices, articles, coordinates and model data preserved; migration fully idempotent')
