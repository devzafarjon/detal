/* A visitor's parts shortlist. No account or order is created. */
(() => {
 const key='detal-cart-v1',maxQuantity=999,maxLines=500;
 const dialog=document.getElementById('cartDialog'),itemsNode=document.getElementById('cartItems');
 let entries=[],persistent=true;
 const validId=value=>Number.isSafeInteger(value)&&value>0;
 function read(value){
  try{
   const parsed=JSON.parse(value||'[]');if(!Array.isArray(parsed))return [];
   const seen=new Set();return parsed.filter(item=>{
    if(!item||!validId(item.modelId)||!validId(item.partId)||!Number.isSafeInteger(item.qty)||item.qty<1||item.qty>maxQuantity)return false;
    const identity=`${item.modelId}:${item.partId}`;if(seen.has(identity))return false;seen.add(identity);return true;
   }).slice(0,maxLines).map(item=>({modelId:item.modelId,partId:item.partId,modelName:String(item.modelName||'Qurilma').slice(0,150),name:String(item.name||'Detal').slice(0,300),label:String(item.label||item.partId).slice(0,20),article:String(item.article||'').slice(0,150),qty:item.qty}));
  }catch{return []}
 }
 try{entries=read(localStorage.getItem(key))}catch{persistent=false}
 function persist(){try{localStorage.setItem(key,JSON.stringify(entries));persistent=true}catch{persistent=false}render()}
 const find=(modelId,partId)=>entries.find(item=>item.modelId===modelId&&item.partId===partId);
 function quantity(modelId,partId){return find(modelId,partId)?.qty||0}
 function refreshSelection(){
  if(!current.id)return;
  document.querySelectorAll('.hotspot').forEach(node=>{const part=current.parts.find(item=>item.id===Number(node.dataset.id)),qty=quantity(current.id,Number(node.dataset.id));node.classList.toggle('in-cart',qty>0);if(part)node.setAttribute('aria-label',`${part.label||part.id}: ${part.name}${qty?`. Karzinkada ${qty} ta`:''}`)});
  document.querySelectorAll('.part').forEach(node=>{const qty=quantity(current.id,Number(node.dataset.part));node.classList.toggle('in-cart',qty>0);const badge=node.querySelector('.part-cart-count');if(badge){badge.hidden=!qty;badge.textContent=qty?`✓ ${qty}`:'';badge.setAttribute('aria-label',`Karzinkada ${qty} ta`)}else if(qty){const mark=document.createElement('span');mark.className='part-cart-count';mark.setAttribute('aria-label',`Karzinkada ${qty} ta`);mark.textContent=`✓ ${qty}`;node.querySelector('.part-chevron')?.before(mark)}});
  const status=document.getElementById('cartPartStatus'),button=document.getElementById('cartAdd');
  if(status&&button){const qty=quantity(current.id,selected);status.textContent=qty?`Karzinkada: ${qty} ta`:'';button.textContent=qty?'Yana qo‘shish':'Karzinkaga qo‘shish';}
 }
 function render(){
  const active=dialog.open&&dialog.contains(document.activeElement)?document.activeElement:null;
  const activeRow=active?.closest('.cart-item');
  const focusTarget=activeRow?{modelId:activeRow.dataset.modelId,partId:activeRow.dataset.partId,action:active.matches('input')?'input':active.dataset.cartPlus?'plus':active.dataset.cartMinus?'minus':active.dataset.cartRemove?'remove':active.dataset.cartGo?'go':null}:null;
  const total=entries.reduce((sum,item)=>sum+item.qty,0);
  document.getElementById('cartCount').textContent=String(total);
  document.getElementById('cartOpen').setAttribute('aria-label',`Karzinkani ochish, ${total} ta detal`);
  document.getElementById('cartSummary').textContent=entries.length?`${entries.length} xil detal · jami ${total} dona`:'Hozircha detal qo‘shilmagan';
  document.querySelector('.cart-note').textContent=persistent?'Tanlangan detallar shu brauzerda saqlanadi. Bu ro‘yxat buyurtma emas; narx va mavjudlik alohida tasdiqlanadi.':'Brauzer saqlashga ruxsat bermadi. Tanlov faqat shu ochiq sahifada turadi.';
  itemsNode.innerHTML=entries.length?entries.map(item=>`<article class="cart-item" data-model-id="${item.modelId}" data-part-id="${item.partId}"><div class="cart-item-main"><span class="cart-item-label">${esc(item.label)}</span><div><span class="cart-item-model">${esc(item.modelName)}</span><h3>${esc(item.name)}</h3><p>${item.article?`Artikul: ${esc(item.article)}`:'Artikul kiritilmagan'}</p></div></div><div class="cart-item-actions"><button type="button" data-cart-go="1">Chizmada ko‘rish</button><div class="cart-stepper"><button type="button" data-cart-minus="1" aria-label="${esc(item.name)} sonini kamaytirish" ${item.qty===1?'disabled':''}>−</button><input type="number" min="1" max="${maxQuantity}" step="1" value="${item.qty}" aria-label="${esc(item.name)} soni"><button type="button" data-cart-plus="1" aria-label="${esc(item.name)} sonini oshirish" ${item.qty===maxQuantity?'disabled':''}>+</button></div><button type="button" class="cart-remove" data-cart-remove="1" aria-label="${esc(item.name)}ni karzinkadan olib tashlash">Olib tashlash</button></div></article>`).join(''):'<div class="cart-empty"><strong>Karzinka bo‘sh</strong><p>Chizmadan detalni tanlang va “Karzinkaga qo‘shish” tugmasini bosing.</p></div>';
  if(focusTarget){const row=[...itemsNode.querySelectorAll('.cart-item')].find(node=>node.dataset.modelId===focusTarget.modelId&&node.dataset.partId===focusTarget.partId);const selector={input:'.cart-stepper input',plus:'[data-cart-plus]',minus:'[data-cart-minus]',remove:'[data-cart-remove]',go:'[data-cart-go]'}[focusTarget.action];const next=selector&&row?.querySelector(selector);(next&&!next.disabled?next:document.getElementById('cartClose')).focus({preventScroll:true})}
  refreshSelection();
 }
 function update(modelId,partId,qty){const item=find(modelId,partId);if(!item)return;const next=Number(qty);if(!Number.isSafeInteger(next)||next<0||next>maxQuantity){render();return}if(next===0)entries=entries.filter(line=>line!==item);else item.qty=next;persist()}
 function addCurrent(){const part=current.parts.find(item=>item.id===selected);if(!part)return;const previous=find(current.id,part.id);
  if(previous){if(previous.qty===maxQuantity)return;previous.qty++;Object.assign(previous,{modelName:current.name,name:part.name,label:part.label||String(part.id),article:part.article||''});}
  else{if(entries.length>=maxLines)return;entries.push({modelId:current.id,partId:part.id,modelName:current.name,name:part.name,label:part.label||String(part.id),article:part.article||'',qty:1});}
  persist();
 }
 document.getElementById('detail').addEventListener('click',event=>{if(event.target.closest('#cartAdd'))addCurrent()});
 document.getElementById('cartOpen').onclick=()=>{render();dialog.showModal()};
 document.getElementById('cartClose').onclick=()=>dialog.close();
 itemsNode.addEventListener('click',async event=>{const row=event.target.closest('.cart-item');if(!row)return;const modelId=Number(row.dataset.modelId),partId=Number(row.dataset.partId),item=find(modelId,partId);if(!item)return;
  if(event.target.closest('[data-cart-plus]'))update(modelId,partId,item.qty+1);
  else if(event.target.closest('[data-cart-minus]'))update(modelId,partId,item.qty-1);
  else if(event.target.closest('[data-cart-remove]'))update(modelId,partId,0);
  else if(event.target.closest('[data-cart-go]')){await chooseModel(modelId);if(current.id!==modelId)return;const part=current.parts.find(part=>part.id===partId);if(!part){document.getElementById('cartSummary').textContent='Bu detal katalogda topilmadi. Uni karzinkadan olib tashlashingiz mumkin.';return}select(partId);dialog.close();if(!part.tableOnly)focusPart();else document.getElementById('detail').scrollIntoView({behavior:'smooth',block:'center'});}
 });
 itemsNode.addEventListener('change',event=>{const input=event.target.closest('.cart-stepper input');if(!input)return;const row=input.closest('.cart-item');if(!/^[1-9]\d*$/.test(input.value)){render();return}update(Number(row.dataset.modelId),Number(row.dataset.partId),Number(input.value))});
 window.addEventListener('storage',event=>{if(event.key!==key)return;entries=read(event.newValue);render()});
 window.cart={quantity,refreshSelection};render();
})();
