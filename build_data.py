import json
from pathlib import Path
base=Path('/Users/uzmacbook/Desktop/parts-prototype/dist')
common=['Dasta vinti 4×20','Ko‘tarish dastasi','Model yorlig‘i','Yoqish / o‘chirish tugmasi','Yuqori qopqoq','Elektr kabeli','Kabel qisqichi','O‘rta qopqoq','O‘rta qopqoq vinti 4×20','O‘rta qopqoq filtri','Motor yuqori zichlagichi','P25 elektr motor','Motor pastki zichlagichi','Pastki qopqoq','Pastki qopqoq zichlagichi','Xavfsizlik klapani','Filtr savati','Gubkali filtr']
n1=common+['Motor filtri','Chang baki','Bak qulfi','Qulf vinti M5×60','Qulf tayanchi','Qulf ilgagi','Suv chiqarish qopqog‘i','Suv chiqarish qopqog‘i vinti','Havo kirish adapteri','Adapter vinti 4×12','Katta taglik','Orqa g‘ildirak qopqog‘i','Orqa g‘ildirak','Orqa o‘q qisqichi','Orqa g‘ildirak o‘qi','Suv chiqarish shlangi','Buriluvchi g‘ildirak','Antistatik zanjir','1,5 m egiluvchan shlang','Plastik uzatma quvuri','Universal pol cho‘tkasi','Tor joylar uchun uchlik','Foydalanish yo‘riqnomasi','Ø32 yumaloq cho‘tka','Taglik vinti 5×20','Vint 4×14','Kondensator','Qog‘oz chang qopi','Gubkali filtr g‘ilofi']
p1=[(59,126),(59,139),(184,158),(59,165),(59,179),(59,192),(59,217),(59,229),(185,207),(194,277),(59,242),(59,265),(59,289),(59,313),(59,336),(59,355),(59,367),(59,387),(184,253),(195,181),(346,181),(346,205),(346,217),(346,163),(195,213),(347,193),(235,337),(251,337),(270,337),(217,337),(203,337),(290,337),(190,337),(326,158),(270,320),(165,374),(166,357),(165,397),(165,421),(343,417),(344,391),(258,415),(309,358),(184,132),(59,151),(258,443),(134,448)]
n2=common+['Motor filtri','Chang baki','Bak qulfi va ilgagi','Havo kirish adapteri','Adapter vinti 4×12','Taglik','Ø40 buriluvchi g‘ildirak','Antistatik zanjir','Ø32, 1,5 m shlang','Plastik uzatma quvuri','Foydalanish yo‘riqnomasi','Tor joylar uchun uchlik','Universal pol cho‘tkasi','Qog‘oz chang qopi','Kondensator']
p2=[(59,175),(59,213),(413,265),(59,286),(59,328),(59,362),(59,437),(59,468),(413,402),(411,499),(59,503),(59,567),(59,637),(59,705),(59,755),(59,788),(59,844),(59,934),(411,560),(454,375),(792,364),(767,262),(824,302),(454,514),(454,567),(790,552),(454,670),(416,772),(482,907),(605,967),(735,869),(385,834),(59,249)]
n3=['Patron mahkamlash vinti M5×20','10 mm kalitsiz patron','Chiqish vali yig‘masi','Reduktor qopqog‘i','609-2RS podshipnik','Rotor yig‘masi','607-ZZ podshipnik','Stator yig‘masi','Korpus vinti ST3,5×16','O‘ng korpus','Cho‘tka qopqog‘i','Ko‘mir cho‘tka 5×8×10','Cho‘tka tutqichi','Ishga tushirish tugmasi','EMC kontakt plastinasi','0,22 µF kondensator','Uzoq sim','Qisqa sim','Kabel himoya g‘ilofi','Elektr kabeli 2×0,75 mm²','Rejim almashtirish tugmasi','Tugma prujinasi','Revers tugmasi','Chap korpus']
p3=[(164,126),(222,150),(210,291),(292,324),(335,342),(420,373),(513,412),(620,450),(416,66),(409,165),(410,231),(406,270),(406,314),(468,521),(468,555),(468,598),(468,640),(468,682),(468,722),(468,762),(172,390),(172,412),(172,436),(172,458)]
a3=['GB/T819.2-1997','GB6087-2003','813102200','430102200','GB/T276-94 · 609-2RS','112102200','GB/T276-94 · 607-ZZ','111102200','GB845-85','401102210','122810100','106113500','123810100','101022200',None,'104001200','105120900','105120910','410000100',None,'412102200','208501100','432113700','401102200']
n1[14]='Katta filtr qopqog‘i'
n1[15]='Pastki qopqoq zichlagichi'
n1[16]='Xavfsizlik klapani'
n1[17]='Filtr savati'
models=[]
for idx,(name,names,points,size,view) in enumerate([('JN-201-60L',n1,p1,[686,468],[45,75,315,393]),('Changyutgich · P25 1200W',n2,p2,[1574,1001],[17,100,830,900]),('KK22-10 · Elektr drel',n3,p3,[1280,904],[88,44,610,835])],1):
 parts=[]
 for i,(n,p) in enumerate(zip(names,points),1):
  art=a3[i-1] if idx==3 else None
  parts.append(dict(id=i,name=n,x=p[0],y=p[1],article=art or f'DEMO-M{idx}-{i:03}',demoArticle=not bool(art),price=([15000,45000,22000,65000,85000,55000,12000,75000,8000,25000,18000,320000,18000,68000,12000,30000,45000,35000][(i-1)%18]),qty=1))
 models.append(dict(id=idx,name=name,image=f'assets/model-{idx}.jpg',size=size,view=view,parts=parts))
(base/'data.js').write_text('const models = '+json.dumps(models,ensure_ascii=False)+';')
assert [len(m['parts']) for m in models]==[47,33,24]
