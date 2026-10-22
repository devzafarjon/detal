import pathlib,json,sqlite3,copy
r=pathlib.Path(__file__).resolve().parents[1]
base=json.loads((r/'tests/name-review-before.json').read_text());review=json.loads((r/'research/part-name-review.json').read_text())
# The production migration must preserve customized names and all commercial fields.
custom=copy.deepcopy(base);custom[4]['parts'][0]['name']='Mening maxsus nomim';custom[4]['parts'][0]['price']=654321;custom[4]['parts'][0]['article']='USER-ART';custom[4]['parts'][1]['nameStatus']='user'
db=sqlite3.connect(':memory:');db.execute('create table catalogs(id text,data text,revision integer)');db.execute('insert into catalogs values(?,?,?)',('main',json.dumps(custom),11));sql=(r/'drizzle/0005_part_name_review.sql').read_text();db.executescript(sql);data,rev=db.execute('select data,revision from catalogs').fetchone();out=json.loads(data)
assert len(out)==22
assert out[4]['parts'][0]['name']=='Mening maxsus nomim'
assert out[4]['parts'][1]['name']==custom[4]['parts'][1]['name']
for old,new in zip(custom,out):
 assert old['id']==new['id'] and old['image']==new['image'] and len(old['parts'])==len(new['parts'])
 for a,b in zip(old['parts'],new['parts']):
  for key in ['id','article','price','x','y','locations','label']:
   assert a.get(key)==b.get(key),(old['id'],a['id'],key)
assert out[4]['parts'][2]['name']=='Reduktor yig‘masi'
assert out[4]['parts'][2]['nameStatus']=='visual'
db.executescript(sql);assert json.loads(db.execute('select data from catalogs').fetchone()[0])==out
assert sum(review['counts'].values())==1339
print('PASS: 22 drawings / 1339 reviews; custom edits, prices, articles and coordinates preserved; repeated migration preserves data')
