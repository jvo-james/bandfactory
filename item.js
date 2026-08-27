let currentItem=null,currentSettings={},selectedSize='',qty=1,allItems=[];
const $id=id=>document.getElementById(id);
function showError(msg=''){const el=$id('itemError');if(!el)return;el.textContent=msg;el.hidden=!msg}
function itemStock(){return BFCatalog.stock(currentItem,selectedSize)}
function updateBuy(){const price=BFCatalog.price(currentItem,currentSettings),btn=$id('itemAdd');$id('qtyValue').textContent=qty;if(!btn)return;btn.textContent=currentItem?.sizes&&!selectedSize?'Choose a size':price?`Add to Bag · ${BF.money(price*qty)}`:'Add to Bag';btn.disabled=currentItem?.available===false||!!currentItem?.sizes&&!selectedSize}
function sizeGuideRows(item){
  const saved=item?.sizeGuide||{};
  return Object.keys(item?.sizes||{}).map(size=>({size,width:saved[size]?.width||'Confirm',length:saved[size]?.length||'Confirm'}));
}
function openSizeGuide(){const modal=$id('sizeModal');if(!modal)return;$id('sizeModalTitle').textContent=`${currentItem.name} Size Guide`;$id('sizeModalIntro').textContent=currentItem.sizeDescription||'Use this guide to compare the garment measurements with a piece you already own.';$id('sizeModalBody').innerHTML=sizeGuideRows(currentItem).map(r=>`<tr><td><strong>${r.size}</strong></td><td>${r.width}</td><td>${r.length}</td></tr>`).join('');modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden'}
function closeSizeGuide(){const modal=$id('sizeModal');if(!modal)return;modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.style.overflow=''}
async function initItem(){
  const id=new URLSearchParams(location.search).get('id');[allItems,currentSettings]=await Promise.all([BFCatalog.load(),BFStore.getDoc('settings/store',{})]);currentItem=allItems.find(x=>x.id===id);if(!currentItem){location.href='shop.html';return}
  document.title=`${currentItem.name} | Band Factory`;$id('itemName').textContent=currentItem.name;$id('itemCrumb').textContent=currentItem.name;$id('itemDescription').textContent=currentItem.description||'';$id('itemDetailsAccordion').textContent=currentItem.description||'';$id('itemImage').src=BFCatalog.image(currentItem);$id('itemImage').alt=currentItem.name;$id('itemShadeTab').textContent=currentItem.subtitle||currentItem.color||currentItem.name;$id('itemCategory').textContent=currentItem.category==='ribbed'?'Ribbed Hairband':currentItem.category==='tops'?'Band Factory Top':'Band Factory Set';
  const p=BFCatalog.price(currentItem,currentSettings);$id('itemPrice').textContent=p?BF.money(p):'Price available soon';
  const features=(currentItem.subtitle||currentItem.color||'').split('·').map(x=>x.trim()).filter(Boolean).slice(0,4);$id('itemFeatureRow').innerHTML=features.map(x=>`<span>${x}</span>`).join('');
  $id('itemPackNote').innerHTML=currentItem.packSize?`<i class="fa-solid fa-layer-group"></i> ${currentItem.packSize}-piece purchase.`:'';
  if(currentItem.sizes){
    $id('itemSizeArea').hidden=false;$id('itemSizes').innerHTML=Object.entries(currentItem.sizes).map(([size,d])=>`<button class="tube-size-btn" data-size="${size}" ${d.available===false||Number(d.stock)<=0?'disabled':''}>${size}</button>`).join('');
    $id('itemSizes').querySelectorAll('[data-size]').forEach(b=>b.onclick=()=>{selectedSize=b.dataset.size;qty=1;showError();$id('selectedSizeLabel').textContent=`Selected: ${selectedSize}`;$id('itemSizes').querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));updateBuy()});
    $id('sizeGuideToggle')?.addEventListener('click',openSizeGuide);
  }
  $id('qtyMinus').onclick=()=>{qty=Math.max(1,qty-1);showError();updateBuy()};$id('qtyPlus').onclick=()=>{if(currentItem.sizes&&!selectedSize)return showError('Choose a size first.');const stock=itemStock();if(stock&&qty>=stock)return showError(`Only ${stock} ${stock===1?'piece is':'pieces are'} available right now.`);qty++;showError();updateBuy()};
  $id('itemAdd').onclick=()=>{if(currentItem.sizes&&!selectedSize)return showError('Choose a size first.');const stock=itemStock();if(stock<=0)return showError('This option is currently sold out.');if(qty>stock)return showError(`Only ${stock} ${stock===1?'piece is':'pieces are'} available right now.`);BF.addCatalogProduct(currentItem,selectedSize,p,BFCatalog.image(currentItem),qty);qty=1;updateBuy()};
  const related=allItems.filter(x=>x.category===currentItem.category&&x.id!==currentItem.id).slice(0,4);$id('itemRelated').innerHTML=related.map(item=>`<a class="catalog-tile" href="${item.id==='spandex-tube-top'?'tube-top.html':`item.html?id=${encodeURIComponent(item.id)}`}" ><div class="catalog-tile-media"><img src="${BFCatalog.image(item)}" alt="${item.name}" loading="lazy"></div><div class="catalog-tile-copy"><h3>${item.name}</h3><p>${item.subtitle||item.color||''}</p><strong>${BF.money(BFCatalog.price(item,currentSettings))}</strong></div></a>`).join('');
  document.querySelectorAll('[data-size-close]').forEach(x=>x.onclick=closeSizeGuide);document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSizeGuide()});updateBuy();
}
document.addEventListener('DOMContentLoaded',initItem);
