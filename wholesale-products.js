(async function(){
  const grid=document.getElementById('wholesaleProductsGrid');
  const empty=document.getElementById('wholesaleProductsEmpty');
  if(!grid)return;
  const esc=v=>String(v??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
  const money=v=>window.BF?.money?BF.money(v):`GHS ${Number(v||0).toLocaleString('en-GH',{maximumFractionDigits:2})}`;
  const formatDate=v=>window.BFFulfilment?.formatDate?.(v)||v||'to be confirmed';
  const isPreorder=item=>window.BFCatalog?.isPreorder?.(item)||false;
  const productAvailable=(item,size='')=>{
    if(item?.available===false)return false;
    if(isPreorder(item)){
      if(item.sizes&&Object.keys(item.sizes).length){const d=item.sizes?.[size]||{};return d.available!==false;}
      return true;
    }
    if(item.sizes&&Object.keys(item.sizes).length){
      if(size){const d=item.sizes?.[size]||{};return d.available!==false&&Number(d.stock||0)>0;}
      return Object.values(item.sizes).some(d=>d?.available!==false&&Number(d.stock||0)>0);
    }
    return Number(item.stock||0)>0;
  };
  const getUnitPrice=(item,qty)=>Number(BFCatalog.wholesalePriceForQty(item,qty)||0);
  const maxStock=(item,size)=>{
    if(isPreorder(item))return Infinity;
    if(item.sizes&&Object.keys(item.sizes).length)return Number(item.sizes?.[size]?.stock||0);
    return Number(item.stock||0);
  };
  const tierText=(tier)=>`${Number(tier.minQty)}+`;
  function render(items){
    grid.innerHTML=items.map((item,index)=>{
      const wholesale=BFCatalog.wholesale(item),preorder=isPreorder(item),tiers=wholesale.tiers;
      const sizes=Object.keys(item.sizes||{});
      const defaultSize=sizes.find(s=>productAvailable(item,s))||sizes[0]||'';
      const initialQty=Math.max(wholesale.minQty,Number(tiers[0]?.minQty||wholesale.minQty||1));
      const id=`wholesaleCard${index}`;
      return `<article class="wholesale-product-card" data-wholesale-card data-product-id="${esc(item.id)}" data-min-qty="${initialQty}">
        <div class="wholesale-product-image"><img src="${esc(BFCatalog.image(item))}" alt="${esc(item.name)}" loading="lazy"><span class="wholesale-product-badge ${preorder?'preorder':''}">${preorder?'pre-order':'wholesale'}</span></div>
        <div class="wholesale-product-body">
          <div class="wholesale-product-top"><div><h3>${esc(item.name)}</h3><p class="wholesale-product-subtitle">${esc(item.subtitle||item.color||'')}</p></div><div class="wholesale-product-retail">retail from<strong>${esc(money(BFCatalog.price(item,{})))}</strong></div></div>
          ${preorder?`<div class="wholesale-product-note"><strong>pre-order · ${esc(formatDate(BFCatalog.preorderDate(item)))}</strong><br>you can pay now and this product will be fulfilled from the date above.</div>`:''}
          <div class="wholesale-product-unit-label"><span>wholesale price</span><strong data-unit-price>${esc(money(getUnitPrice(item,initialQty)))}/unit</strong></div>
          <div class="wholesale-tier-list">${tiers.map(t=>`<div class="wholesale-tier"><small>${esc(tierText(t))} units</small><strong>${esc(money(t.price))}</strong></div>`).join('')}</div>
          ${sizes.length?`<div class="wholesale-size-area"><div class="wholesale-size-label">choose size</div><div class="wholesale-size-options">${sizes.map(size=>`<button type="button" class="wholesale-size-button ${size===defaultSize?'active':''}" data-size="${esc(size)}" ${productAvailable(item,size)?'':'disabled'}>${esc(size)}</button>`).join('')}</div></div>`:''}
          <div class="wholesale-product-actions"><div class="wholesale-product-qty" aria-label="Quantity"><button type="button" data-minus aria-label="Decrease quantity">−</button><span data-qty>${initialQty}</span><button type="button" data-plus aria-label="Increase quantity">+</button></div><button type="button" class="wholesale-add" data-add>Add to wholesale bag</button></div>
          <div class="wholesale-product-unit-label"><span>minimum order</span><strong>${esc(String(wholesale.minQty))} ${wholesale.minQty===1?'unit':'units'}</strong></div><div class="wholesale-stock-hint" data-stock-hint hidden></div>
        </div>
      </article>`;
    }).join('');
    grid.querySelectorAll('[data-wholesale-card]').forEach(card=>setupCard(card));
  }
  function setupCard(card){
    const itemId=card.dataset.productId, item=window.__BFWholesaleItems.find(x=>x.id===itemId);if(!item)return;
    const wholesale=BFCatalog.wholesale(item),qtyEl=card.querySelector('[data-qty]'),priceEl=card.querySelector('[data-unit-price]'),add=card.querySelector('[data-add]');
    let qty=Math.max(wholesale.minQty,Number(qtyEl.textContent||wholesale.minQty)),size=card.querySelector('.wholesale-size-button.active')?.dataset.size||'';
    const update=()=>{qty=Math.max(wholesale.minQty,Math.floor(qty));const unit=getUnitPrice(item,qty),available=productAvailable(item,size),max=maxStock(item,size),stockOkay=isPreorder(item)||!Number.isFinite(max)||qty<=max;qtyEl.textContent=qty;priceEl.textContent=unit?`${money(unit)}/unit`:'Price unavailable';const hint=card.querySelector('[data-stock-hint]');if(hint){hint.hidden=stockOkay;hint.textContent=Number.isFinite(max)?`Only ${Math.max(0,max)} unit${Math.max(0,max)===1?' is':'s are'} available for this size.`:'';}add.disabled=!unit||!available||qty<wholesale.minQty||!stockOkay;if(!isPreorder(item)){card.querySelector('[data-plus]').disabled=Number.isFinite(max)&&qty>=max;}else card.querySelector('[data-plus]').disabled=false;};
    card.querySelector('[data-minus]').onclick=()=>{qty=Math.max(wholesale.minQty,qty-1);update()};
    card.querySelector('[data-plus]').onclick=()=>{qty+=1;update()};
    card.querySelectorAll('[data-size]').forEach(button=>button.onclick=()=>{size=button.dataset.size||'';card.querySelectorAll('[data-size]').forEach(x=>x.classList.toggle('active',x===button));update()});
    add.onclick=()=>{if(add.disabled)return;BF.addWholesaleProduct(item,size,qty);};
    update();
  }
  try{
    const items=await BFCatalog.load();
    const eligible=items.filter(item=>item&&item.deleted!==true&&item.category!=='ribbed'&&item.category!=='smooth'&&BFCatalog.isWholesale(item)&&item.available!==false&&BFCatalog.wholesale(item).tiers.length&&Number(BFCatalog.wholesalePriceForQty(item,BFCatalog.wholesale(item).minQty)||0)>0);
    window.__BFWholesaleItems=eligible;
    if(!eligible.length){grid.hidden=true;empty.hidden=false;return;}
    grid.hidden=false;empty.hidden=true;render(eligible);
  }catch(error){console.error('[Band Factory] Other-products wholesale could not load',error);grid.innerHTML='<div class="wholesale-products-empty"><div class="empty-mark"><i class="fa-solid fa-triangle-exclamation"></i></div><h2>we could not load wholesale products</h2><p>Please refresh the page and try again.</p></div>'}
})();
