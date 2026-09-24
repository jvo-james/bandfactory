(function(){
  const qs=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const money=v=>window.BF?.money?BF.money(v):`GHS ${Number(v||0).toLocaleString('en-GH',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const params=new URLSearchParams(location.search);
  const productId=params.get('id')||'';
  let master=null,items=[],categories=[],settings={};
  let selectedVariantId=params.get('variant')||'';
  let selectedSize='';
  let galleryImages=[];

  function variants(){return master&&BFCatalog.hasVariants(master)?BFCatalog.variants(master):[];}
  function selectedVariant(){return selectedVariantId?BFCatalog.variant(master,selectedVariantId):variants()[0]||null;}
  function currentView(){return master&&selectedVariant()?.id?BFCatalog.variantView(master,selectedVariant().id):master;}
  function wholesale(){return BFCatalog.wholesale(master||{});}
  function quantity(){return Math.max(wholesale().minQty||1,Math.floor(Number(qs('#wholesaleProductQty')?.value||1))||1);}
  function unitPrice(qty){return Number(BFCatalog.wholesalePriceForQty(master,qty)||0);}
  function currentStock(){
    const view=currentView()||{};
    if(BFCatalog.isPreorder(master))return Infinity;
    if(view.sizes&&Object.keys(view.sizes).length){const d=view.sizes[selectedSize]||{};return d.available===false?0:Math.max(0,Number(d.stock||0));}
    return view.available===false?0:Math.max(0,Number(view.stock||master?.stock||0));
  }
  function productAvailable(){
    if(!master||master.deleted===true||master.available===false)return false;
    const w=wholesale();if(!w.enabled||!w.tiers.length)return false;
    const view=currentView()||{};
    if(view.sizes&&Object.keys(view.sizes).length){return !!selectedSize&&view.sizes[selectedSize]?.available!==false;}
    return view.available!==false;
  }
  function renderGallery(){
    const view=currentView()||master||{};
    const seen=new Set();galleryImages=[];
    const add=img=>{if(!img||seen.has(img))return;seen.add(img);galleryImages.push(img)};
    add(view.image);(view.images||[]).forEach(add);(master?.images||[]).forEach(add);
    if(!galleryImages.length)add(BFCatalog.fallbackImage(master,items,categories));
    const main=qs('#wholesaleProductMainImage');main.src=galleryImages[0]||'images/second-skin-tee.jpg';main.alt=master?.name||'Band Factory wholesale product';
    qs('#wholesaleProductThumbs').innerHTML=galleryImages.map((img,index)=>`<button class="wholesale-product-thumb ${index===0?'is-active':''}" type="button" data-thumb="${index}" aria-label="Show product image ${index+1}"><img src="${esc(img)}" alt=""></button>`).join('');
    qs('#wholesaleProductThumbs').querySelectorAll('[data-thumb]').forEach(btn=>btn.addEventListener('click',()=>{const index=Number(btn.dataset.thumb||0);main.src=galleryImages[index]||main.src;qs('#wholesaleProductThumbs').querySelectorAll('[data-thumb]').forEach(x=>x.classList.toggle('is-active',x===btn));}));
  }
  function renderVariantPicker(){
    const area=qs('#wholesaleProductVariantArea'),list=variants();
    if(!list.length){area.hidden=true;return;}
    if(!selectedVariantId||!list.some(v=>v.id===selectedVariantId))selectedVariantId=list[0].id;
    area.hidden=false;area.innerHTML=`<span>Colour</span><div class="wholesale-variant-grid">${list.map(v=>`<button class="wholesale-variant-button ${v.id===selectedVariantId?'is-active':''}" type="button" data-variant="${esc(v.id)}"><strong>${esc(v.color)}</strong><small>${v.available===false?'Currently unavailable':'Available'}</small></button>`).join('')}</div>`;
    area.querySelectorAll('[data-variant]').forEach(btn=>btn.addEventListener('click',()=>{selectedVariantId=btn.dataset.variant||'';selectedSize='';const url=new URL(location.href);url.searchParams.set('variant',selectedVariantId);history.replaceState(null,'',url.toString());renderAll();}));
  }
  function renderSizePicker(){
    const area=qs('#wholesaleProductSizeArea'),view=currentView()||master||{},entries=Object.entries(view.sizes||{});
    if(!entries.length){selectedSize='';area.hidden=true;return;}
    if(!selectedSize||!entries.some(([s])=>s===selectedSize))selectedSize=entries.find(([,d])=>d?.available!==false)?.[0]||entries[0][0];
    area.hidden=false;area.innerHTML=`<span>Size</span><div class="wholesale-size-grid">${entries.map(([size,d])=>`<button class="wholesale-size-button ${size===selectedSize?'is-active':''}" type="button" data-size="${esc(size)}" ${d?.available===false?'disabled':''}>${esc(size)}</button>`).join('')}</div>`;
    area.querySelectorAll('[data-size]').forEach(btn=>btn.addEventListener('click',()=>{selectedSize=btn.dataset.size||'';renderSizePicker();renderBuyBox();}));
  }
  function renderPricing(){
    const w=wholesale(),tiers=w.tiers,from=tiers[0]?.price||0;
    qs('#wholesaleProductWholesaleFrom').textContent=from?`From ${money(from)}`:'Pricing not set';
    qs('#wholesaleProductMin').textContent=`Minimum order: ${w.minQty} ${w.minQty===1?'unit':'units'}`;
    qs('#wholesaleProductTiers').innerHTML=tiers.map((tier,index)=>{const next=tiers[index+1]?.minQty;const range=next?`${tier.minQty}–${Math.max(tier.minQty,next-1)} units`:`${tier.minQty}+ units`;return `<div class="wholesale-tier-row" data-tier-min="${tier.minQty}"><span>${range}</span><strong>${money(tier.price)} each</strong></div>`}).join('');
  }
  function renderBuyBox(){
    const w=wholesale(),min=w.minQty||1,input=qs('#wholesaleProductQty');
    let value=Math.max(min,Math.floor(Number(input.value||min))||min);
    const max=currentStock();if(Number.isFinite(max))value=Math.min(value,Math.max(min,max));
    input.min=String(min);input.value=String(value);input.setAttribute('aria-label',`Wholesale quantity, minimum ${min}`);
    const price=unitPrice(value),total=price*value;
    qs('#wholesaleProductTotal').textContent=price?money(total):'Pricing not set';
    qs('#wholesaleProductUnit').textContent=price?`${money(price)} per piece`:'Set wholesale pricing in admin';
    qs('#wholesaleProductAdd').disabled=!productAvailable()||price<=0||(Number.isFinite(max)&&value>max);
    qs('#wholesaleProductTiers').querySelectorAll('[data-tier-min]').forEach(row=>row.classList.toggle('is-active',Number(row.dataset.tierMin||0)<=value&&[...qs('#wholesaleProductTiers').querySelectorAll('[data-tier-min]')].filter(x=>Number(x.dataset.tierMin||0)<=value).at(-1)===row));
  }
  function renderProductCopy(){
    const view=currentView()||master||{},pre=BFCatalog.isPreorder(master),preDate=BFCatalog.preorderDate(master);
    qs('#wholesaleProductName').textContent=master.name||'Product';
    qs('#wholesaleProductBreadcrumb').textContent=master.name||'Product';
    qs('#wholesaleProductCategory').textContent=categories.find(c=>c.id===master.category)?.name||master.category||'Wholesale';
    qs('#wholesaleProductSubtitle').textContent=view.color||master.subtitle||'';
    const retail=BFCatalog.price(master,settings),compare=BFCatalog.compareAtPrice(master,settings),priceRow=qs('#wholesaleProductPriceRow');
    priceRow.innerHTML=compare>retail?`<del>${money(compare)}</del><span class="retail-current">${money(retail)}</span><span class="sale-pill">Sale</span>`:`<span class="retail-current">${retail?money(retail):'Price available soon'}</span>`;
    const wholesaleFrom=wholesale().tiers[0]?.price||0,pct=BFCatalog.discountPercent?BFCatalog.discountPercent(retail,wholesaleFrom):BFCatalog.wholesaleCompare(master,wholesale().minQty||1);
    qs('#wholesaleProductSaving').textContent=pct?`Wholesale is ${pct}% below the current retail price at the starting tier.`:'';
    const desc=String(master.description||master.shortDescription||'').trim();qs('#wholesaleProductDescription').innerHTML=desc?desc.split(/\n\s*\n|\n/).filter(Boolean).map(p=>`<p>${esc(p)}</p>`).join(''):`<p>View the product details, choose the colour and size you need, then add your wholesale quantity to the Bag.</p>`;
    const badge=qs('#wholesaleProductBadge');badge.hidden=!pre;
    const preBox=qs('#wholesaleProductPreorder');preBox.hidden=!pre;
    if(pre){const dateText=BFFulfilment.formatDate(preDate);preBox.innerHTML=`<div><strong>Pre-order</strong><p>This item is available to order now even though it is not part of the current ready stock. Payment is made at checkout and this product is planned for fulfilment from <strong>${esc(dateText)}</strong>. If you add ready products to the same Bag, checkout will let you choose whether to receive everything together or use separate deliveries.</p></div>`;}
    renderGallery();
  }
  function renderAll(){renderProductCopy();renderVariantPicker();renderSizePicker();renderPricing();renderBuyBox();}
  function updateQty(delta){const input=qs('#wholesaleProductQty'),w=wholesale(),min=w.minQty||1,max=currentStock();let next=Math.max(min,Math.floor(Number(input.value||min))+delta);if(Number.isFinite(max))next=Math.min(next,max);input.value=String(next);renderBuyBox();}
  async function init(){
    try{
      [items,settings,categories]=await Promise.all([BFCatalog.load(),BFStore.getDoc('settings/store',{}),BFCatalog.loadCategories()]);
      master=items.find(item=>item.id===productId)||null;
      if(!master||master.deleted===true||!BFCatalog.isWholesale(master)){qs('#wholesaleProductLoading').hidden=true;qs('#wholesaleProductError').hidden=false;return;}
      qs('#wholesaleProductLoading').hidden=true;qs('#wholesaleProductShell').hidden=false;renderAll();document.title=`${master.name} Wholesale | Band Factory Ghana`;
    }catch(error){console.error(error);qs('#wholesaleProductLoading').hidden=true;qs('#wholesaleProductError').hidden=false;}
  }
  qs('#wholesaleProductQty')?.addEventListener('input',()=>{qs('#wholesaleProductQty').value=qs('#wholesaleProductQty').value.replace(/[^0-9]/g,'');renderBuyBox();});
  qs('#wholesaleQtyMinus')?.addEventListener('click',()=>updateQty(-1));
  qs('#wholesaleQtyPlus')?.addEventListener('click',()=>updateQty(1));
  qs('#wholesaleProductAdd')?.addEventListener('click',()=>{const qty=quantity();if(!productAvailable()){BF.toast('Choose an available option before adding this product.');return;}if(Number.isFinite(currentStock())&&qty>currentStock()){BF.toast(`Only ${currentStock()} are available for this option.`);return;}BF.addWholesaleProduct(master,selectedSize,qty,selectedVariantId);});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
