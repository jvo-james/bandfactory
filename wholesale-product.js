(function(){
  const qs=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const money=v=>window.BF?.money?BF.money(v):`GHS ${Number(v||0).toLocaleString('en-GH',{minimumFractionDigits:0,maximumFractionDigits:2})}`;
  const params=new URLSearchParams(location.search),productId=params.get('id')||'';
  const PREORDER_SIZES=['2XS','XS','S','M','L','XL','2XL'];
  let master=null,items=[],categories=[],settings={},selectedVariantId=params.get('variant')||'',selectedSize='',selectedQty='',galleryImages=[],galleryIndex=0,mix=[];

  const variants=()=>master&&BFCatalog.hasVariants(master)?BFCatalog.variants(master):[];
  const isPreorder=()=>BFCatalog.isPreorder(master);
  const selectedVariant=()=>{const list=variants();if(!list.length)return master||null;return selectedVariantId?BFCatalog.variant(master,selectedVariantId):BFCatalog.featuredVariant?.(master)||list[0]||null;};
  const currentView=()=>selectedVariant()?.id?BFCatalog.variantView(master,selectedVariant().id):master||{};
  const wholesale=()=>BFCatalog.wholesale(master||{});
  const swatchHex=name=>{const known=Object.fromEntries((BF.colors||[]).map(([label,hex])=>[String(label).toLowerCase(),hex]));const exact=String(name||'').trim().toLowerCase();const match=known[exact]||Object.keys(known).find(k=>exact.includes(k));return typeof match==='string'?match:known[match]||'#d8cbd0';};
  const viewForVariant=id=>id?BFCatalog.variant(master,id):master||{};
  const sizeOptions=()=>isPreorder()?[...PREORDER_SIZES]:Object.entries((currentView()||{}).sizes||{}).filter(([_,d])=>d?.available!==false&&Number(d?.stock||0)>0).map(([size])=>size);
  const maxForSize=(variant,size)=>{if(isPreorder())return Infinity;const d=variant?.sizes?.[size];return d?Math.max(0,Number(d.stock||0)):0;};
  const numericValue=value=>String(value||'').replace(/\D/g,'');
  const totalMix=()=>mix.reduce((sum,row)=>sum+Math.max(0,Number(row.qty||0)),0);
  const targetQty=()=>Math.max(1,Number(wholesale().minQty||1));

  function renderGallery(){
    const view=currentView(),seen=new Set(),gallery=[];const add=x=>{if(x&&!seen.has(x)){seen.add(x);gallery.push(x)}};
    add(view.image);(view.images||[]).forEach(add);(master?.images||[]).forEach(add);if(!gallery.length)add(BFCatalog.fallbackImage(master,items,categories));
    galleryImages=gallery;galleryIndex=0;
    const main=qs('#wholesaleProductMainImage'),thumbs=qs('#wholesaleProductThumbs');if(!main||!thumbs)return;
    main.src=gallery[0]||'images/second-skin-tee.jpg';main.alt=`${master?.name||'Product'}${view.color?` in ${view.color}`:''}`;
    thumbs.innerHTML=gallery.map((img,i)=>`<button class="wholesale-product-thumb${i===0?' is-active':''}" type="button" data-thumb="${i}" aria-label="Show product image ${i+1}"><img src="${esc(img)}" alt=""></button>`).join('');
    thumbs.querySelectorAll('[data-thumb]').forEach(btn=>btn.onclick=()=>{const i=Number(btn.dataset.thumb||0);galleryIndex=i;main.src=gallery[i]||main.src;thumbs.querySelectorAll('[data-thumb]').forEach(x=>x.classList.toggle('is-active',x===btn));if(window.innerWidth<=760)qs('#wholesaleProductMainMedia')?.scrollIntoView({behavior:'smooth',block:'start'});});
  }

  function renderColourPicker(){
    const root=qs('#wholesaleColourPicker'),list=(variants().length?variants():[selectedVariant()]).filter(Boolean).filter(v=>v.available!==false);
    if(!list.length){root.innerHTML='';return;}
    if(!selectedVariantId||!list.some(v=>v.id===selectedVariantId))selectedVariantId=BFCatalog.featuredVariant?.(master)?.id||list[0].id;
    root.innerHTML=list.map(v=>`<button type="button" class="wholesale-colour-swatch ${v.id===selectedVariantId?'is-selected':''}" data-colour-id="${esc(v.id)}" aria-label="${esc(v.color)}" aria-pressed="${v.id===selectedVariantId?'true':'false'}" title="${esc(v.color)}"><span style="--swatch:${esc(v.hex||swatchHex(v.color))}"></span><strong>${esc(v.color)}</strong></button>`).join('');
    root.querySelectorAll('[data-colour-id]').forEach(btn=>btn.onclick=()=>{selectedVariantId=btn.dataset.colourId||selectedVariantId;selectedSize='';selectedQty='';const url=new URL(location.href);url.searchParams.set('variant',selectedVariantId);history.replaceState(null,'',url.toString());renderAll();});
  }

  function renderSelection(){
    const v=selectedVariant()||{},sizes=sizeOptions(),pillRoot=qs('#wholesaleSizePills'),label=qs('#wholesaleCurrentColourLabel'),summary=qs('#wholesaleSelectionSummary'),input=qs('#wholesaleQtyInput'),add=qs('#wholesaleAddSelection');
    if(label)label.textContent=v.color||master?.color||'Choose a colour';
    if(!sizes.length){if(pillRoot)pillRoot.innerHTML='<span class="wholesale-empty-inline">No sizes are available for this product.</span>';if(input){input.value='';input.disabled=true;}if(add)add.disabled=true;return;}
    if(!sizes.includes(selectedSize))selectedSize=sizes[0]||'';
    if(pillRoot)pillRoot.innerHTML=sizes.map(size=>`<button class="wholesale-size-pill ${size===selectedSize?'is-selected':''}" type="button" data-size="${esc(size)}" aria-pressed="${size===selectedSize?'true':'false'}">${esc(size)}</button>`).join('');
    if(summary)summary.textContent=`${v.color||master?.color||'Colour'} · ${selectedSize||'Choose a size'}`;
    if(input){input.disabled=false;input.value=selectedQty||'';input.oninput=()=>{input.value=numericValue(input.value);selectedQty=input.value;};}
    pillRoot?.querySelectorAll('[data-size]').forEach(btn=>btn.onclick=()=>{selectedSize=btn.dataset.size||'';selectedQty='';if(input)input.value='';pillRoot.querySelectorAll('[data-size]').forEach(x=>{const active=x===btn;x.classList.toggle('is-selected',active);x.setAttribute('aria-pressed',active?'true':'false')});if(summary)summary.textContent=`${v.color||master?.color||'Colour'} · ${selectedSize}`;});
    if(add)add.disabled=!selectedSize;
  }

  function renderMix(){
    const root=qs('#wholesaleMix');if(!root)return;
    mix=mix.filter(row=>Number(row.qty||0)>0&&row.variantId&&row.size);
    if(!mix.length){root.hidden=true;root.innerHTML='';return;}
    root.hidden=false;
    root.innerHTML=`<div class="wholesale-mix-head"><div><span>Your mix</span><strong>${totalMix()} pieces</strong></div><small>Edit quantities below or add another colour.</small></div><div class="wholesale-mix-list">${mix.map((row,index)=>{const v=viewForVariant(row.variantId);return `<div class="wholesale-mix-item"><div class="wholesale-mix-colour"><span class="wholesale-mix-dot" style="--swatch:${esc(v?.hex||swatchHex(v?.color||row.color))}"></span><div><strong>${esc(v?.color||row.color||'Colour')}</strong><small>${esc(row.size)}</small></div></div><label><span>Qty</span><input type="text" inputmode="numeric" pattern="[0-9]*" data-mix-qty="${index}" value="${row.qty}" aria-label="${esc(v?.color||row.color||'Colour')} ${esc(row.size)} quantity"></label><button type="button" data-remove-mix="${index}" aria-label="Remove ${esc(v?.color||row.color||'Colour')} ${esc(row.size)}">×</button></div>`}).join('')}</div>`;
    root.querySelectorAll('[data-mix-qty]').forEach(input=>input.oninput=()=>{input.value=numericValue(input.value);const row=mix[Number(input.dataset.mixQty)];if(row)row.qty=Number(input.value||0);renderOrderSummary();});
    root.querySelectorAll('[data-remove-mix]').forEach(btn=>btn.onclick=()=>{mix.splice(Number(btn.dataset.removeMix),1);renderMix();renderOrderSummary();});
  }

  function renderPricing(){
    const w=wholesale(),tiers=w.tiers||[],root=qs('#wholesaleProductTiers');if(!root)return;
    root.innerHTML=tiers.map((tier,index)=>{const next=tiers[index+1]?.minQty,range=next?`${tier.minQty}–${Math.max(tier.minQty,next-1)} pieces`:`${tier.minQty}+ pieces`;return `<div class="wholesale-tier-row"><span>${range}</span><strong>${money(tier.price)} each</strong></div>`}).join('')||'<p>No wholesale pricing is set yet.</p>';
  }

  function renderOrderSummary(){
    const total=totalMix(),min=targetQty(),price=total>=min?Number(BFCatalog.wholesalePriceForQty(master,total)||0):Number(BFCatalog.wholesalePriceForQty(master,min)||0),remaining=Math.max(0,min-total),payable=total>=min&&price>0,grand=total*price;
    qs('#wholesaleTargetCount').textContent=String(min);qs('#wholesaleSelectedCount').textContent=String(total);qs('#wholesalePiecesRemaining').textContent=remaining?(total?`${remaining} more ${remaining===1?'piece':'pieces'} needed`:`Add ${min} pieces to start`):'Minimum reached';qs('#wholesaleProductUnit').textContent=total===0?'Add pieces to see your price':(payable?`${money(price)} per piece`:`${money(price)} per piece from ${min} pieces`);qs('#wholesaleProductTotal').textContent=payable?money(grand):total?'Minimum not reached':'GHS 0.00';qs('#wholesaleProductAdd').disabled=!payable;
  }

  function addSelection(){
    const variant=selectedVariant(),size=String(selectedSize||''),qty=Math.max(0,Math.floor(Number(numericValue(selectedQty)||0)));if(!variant||!size)return BF.toast('Choose a colour and size first.');if(qty<=0)return BF.toast('Enter a quantity first.');
    const max=maxForSize(variant,size);if(Number.isFinite(max)&&qty>max)return BF.toast(`Only ${max} available in ${variant.color||'this colour'}, size ${size}.`);
    const found=mix.find(row=>row.variantId===variant.id&&row.size===size);if(found)found.qty+=qty;else mix.push({variantId:variant.id,color:variant.color||'',size,qty});selectedQty='';const input=qs('#wholesaleQtyInput');if(input)input.value='';renderMix();renderOrderSummary();
  }

  function renderProductCopy(){
    const view=currentView(),pre=isPreorder(),preDate=BFCatalog.preorderDate(master),retail=BFCatalog.price(master,settings),compare=BFCatalog.compareAtPrice(master,settings),w=wholesale();
    qs('#wholesaleProductName').textContent=master.name||'Product';qs('#wholesaleProductBreadcrumb').textContent=master.name||'Product';qs('#wholesaleProductCategory').textContent=categories.find(c=>c.id===master.category)?.name||master.category||'Wholesale';qs('#wholesaleProductSubtitle').textContent=view.color||master.subtitle||'';
    const priceRow=qs('#wholesaleProductPriceRow');priceRow.innerHTML=compare>retail?`<del>${money(compare)}</del><span class="retail-current">${money(retail)}</span><span class="sale-pill">Sale</span>`:`<span class="retail-current">${retail?money(retail):'Price available soon'}</span>`;
    const desc=String(master.description||master.shortDescription||'').trim();qs('#wholesaleProductDescription').innerHTML=desc?desc.split(/\n\s*\n|\n/).filter(Boolean).map(p=>`<p>${esc(p)}</p>`).join(''):'<p>Choose the colours, sizes and quantities you need. You can mix them together to reach the wholesale minimum.</p>';
    const badge=qs('#wholesaleProductBadge'),preBox=qs('#wholesaleProductPreorder');badge.hidden=!pre;preBox.hidden=!pre;if(pre){const dateText=BFFulfilment.formatDate(preDate);preBox.innerHTML=`<div><strong>Pre-order</strong><p>This item is available to order before it arrives. You will pay at checkout and it is planned for fulfilment from <strong>${esc(dateText)}</strong>.</p><small>Ready-to-ship and pre-order items can still be checked out together. Checkout will ask how you want the delivery to be handled.</small></div>`;}
    qs('#wholesaleProductNote').textContent=`Minimum ${w.minQty} pieces. Mix colours and sizes in one wholesale order.`;renderGallery();
  }
  function renderAll(){renderProductCopy();renderColourPicker();renderSelection();renderMix();renderPricing();renderOrderSummary();}
  async function init(){
    const loader=qs('#wholesaleProductLoading'),shell=qs('#wholesaleProductShell'),error=qs('#wholesaleProductError');
    try{
      if(loader){loader.hidden=false;loader.style.display='grid';}
      if(shell){shell.hidden=true;shell.style.display='none';}
      [items,settings,categories]=await Promise.all([BFCatalog.load(),BFStore.getDoc('settings/store',{}),BFCatalog.loadCategories()]);
      master=items.find(item=>item.id===productId)||null;
      if(!master||master.deleted===true||!BFCatalog.isWholesale(master)){if(loader){loader.hidden=true;loader.style.display='none';}if(error)error.hidden=false;return;}
      selectedVariantId=selectedVariantId&&variants().some(v=>v.id===selectedVariantId)?selectedVariantId:BFCatalog.featuredVariant?.(master)?.id||variants()[0]?.id||'';
      renderAll();document.title=`${master.name} Wholesale | Band Factory Ghana`;
      if(loader){loader.hidden=true;loader.style.display='none';}if(shell){shell.hidden=false;shell.style.display='';}
    }catch(err){console.error('[Band Factory] wholesale product load failed',err);if(loader){loader.hidden=true;loader.style.display='none';}if(shell)shell.style.display='none';if(error)error.hidden=false;}
  }
  qs('#wholesaleAddSelection')?.addEventListener('click',addSelection);
  qs('#wholesaleProductAdd')?.addEventListener('click',()=>{
    const total=totalMix(),min=targetQty(),price=BFCatalog.wholesalePriceForQty(master,total);if(total<min)return BF.toast(`Choose at least ${min} pieces.`);if(!price)return BF.toast('Wholesale pricing is not available for this quantity.');
    const invalid=mix.some(row=>{const max=maxForSize(viewForVariant(row.variantId),row.size);return Number.isFinite(max)&&Number(row.qty||0)>max;});if(invalid){BF.toast('One of your quantities is higher than the available stock.');return;}
    const selections=mix.map(row=>({variantId:row.variantId,size:row.size,qty:Math.max(0,Math.floor(Number(row.qty||0)))})).filter(x=>x.qty>0);BF.addWholesaleProductMix(master,total,price,selections);
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();