import sqlite3,json,pathlib
root=pathlib.Path('/tmp/detal-scale-state/v3/d1');db=next(p for p in root.rglob('*.sqlite') if p.name!='metadata.sqlite');con=sqlite3.connect(db)
for p in sorted(pathlib.Path('drizzle').glob('*.sql')):con.executescript(p.read_text())
source=pathlib.Path('public/catalog/data.js').read_text();models=json.loads(source[source.index('['):].strip().removesuffix(';'));sample=models[0]
con.execute('insert into catalogs values(?,?,1)',('main',json.dumps(models)))
for i in range(10000,10000+1000-len(models)):
 m=dict(sample,id=i,name=f'Sinov chizmasi {i}')
 con.execute('insert into drawings values(?,?,?,?,?,?)',(i,m['name'],json.dumps(m),len(m['parts']),1,0))
con.execute("insert into site_owner values(1,'local-owner-test')");con.commit();print('Prepared 1000 drawings in isolated LOCAL database')
