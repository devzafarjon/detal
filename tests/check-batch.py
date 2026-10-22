import json,sqlite3,pathlib,hashlib
r=pathlib.Path(__file__).resolve().parents[1]
models=json.loads((r/'public/catalog/data.js').read_text().removeprefix('const models = ').rstrip(';'))
assert len(models)==22
for m in models:
 assert (r/'public/catalog'/m['image']).exists()
 assert len({p['id'] for p in m['parts']})==len(m['parts'])
 for p in m['parts']:
  for loc in p.get('locations',[p]):assert 0<=loc['x']<=m['size'][0] and 0<=loc['y']<=m['size'][1]
for i in range(1,4):
 original=pathlib.Path(f'/Users/uzmacbook/Downloads/Telegram Desktop/photo_{i}_2026-10-21_17-29-23.jpg')
 assert hashlib.sha256(original.read_bytes()).digest()==hashlib.sha256((r/f'public/catalog/assets/model-{i}.jpg').read_bytes()).digest()
db=sqlite3.connect(':memory:');db.execute('CREATE TABLE catalogs(id TEXT,data TEXT,revision INTEGER)')
# Custom IDs and edits must survive, and repeated deployment must not duplicate models.
original=[dict(id=100,name='Saved user model',parts=[dict(id=1,name='Edited',price=123,article='USER')],image='assets/model-1.jpg')]
db.execute('INSERT INTO catalogs VALUES(?,?,?)',('main',json.dumps(original),20))
sql=(r/'drizzle/0004_batch_diagrams.sql').read_text();db.executescript(sql)
data,rev=db.execute('SELECT data,revision FROM catalogs').fetchone();saved=json.loads(data)
assert len(saved)==19 and saved[0]==original[0]
assert len({m['id'] for m in saved})==19
assert all(m['id']>100 for m in saved[1:])
db.executescript(sql);assert db.execute('SELECT data,revision FROM catalogs').fetchone()==(data,rev)
print('PASS: 18 new models, 3 exact duplicates skipped, assets and coordinates valid, user edits retained, ID collisions avoided, migration idempotent')
