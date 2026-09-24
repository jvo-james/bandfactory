(async function(){
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const category=window.BF_CATEGORY;
  const [items,settings,categories]=await Promise.all([BFCatalog.load(),BFStore.getDoc('settings/store',{}),BFCatalog.loadCategories()]);
  if(!categories.some(c=>c.id===category&&c.visible!==false)){location.href='shop.html';return;}
  document.querySelector(`[data-cat="${category}"]`)?.classList.add('active');
  const hero=document.querySelector('[data-category-hero]');
  if(hero){const path=hero.dataset.categoryHero.split('.').reduce((o,k)=>o?.[k],window.BF_IMAGES);if(path)hero.style.backgroundImage=`url("${path}")`;}
  const list=items.filter(x=>x.category===category).sort((a,b)=>(a.featuredOrder??99)-(b.featuredOrder??99));
  const grid=document.getElementById('categoryGrid');if(!grid)return;
  const ribbedHex={'Black':'#111111','White':'#ffffff','Yellow':'#f2cf37','Baby Pink':'#f7c9d8','Hot Pink':'#f2388a','Chartreuse':'#8fb339','Green':'#2e7d32','Teal':'#017f7c','Royal Blue':'#2852af','Orange':'#ed7b2f','Burgundy':'#7f2037','Caramel':'#c68642','Flamingo':'#f26f82'};
  let ribbedStyle=new URLSearchParams(location.search).get('style')==='twisted'?'twisted':'flat';
  const ribbedVariant=item=>BFCatalog.variant(item,ribbedStyle);
  function masterSwatches(product){
    return BFCatalog.variants(product).map(v=>`<button class="bf-card-swatch${v.id===(product.featuredVariantId||BFCatalog.featuredVariant(product)?.id)?' is-active':''}" type="button" data-card-variant="${esc(v.id)}" title="${esc(v.color)}" aria-label="${esc(v.color)}" aria-pressed="${v.id===(product.featuredVariantId||BFCatalog.featuredVariant(product)?.id)?'true':'false'}"><span style="--swatch:${esc(v.hex||'#ddd')}"></span><small>${esc(v.color)}</small></button>`).join('');
  }
  const render=()=>{
    if(category==='ribbed'){
      document.querySelectorAll('[data-ribbed-style]').forEach(b=>b.classList.toggle('active',b.dataset.ribbedStyle===ribbedStyle));
      const intro=document.getElementById('ribbedStyleIntro');if(intro)intro.textContent=ribbedStyle==='flat'?'Classic flat ribbed bands in every available shade.':'Twisted-front ribbed bands with texture and a sculpted centre.';
      grid.innerHTML=list.map(item=>{
        const variant=ribbedVariant(item),pre=BFCatalog.isPreorder(item),available=pre?variant.available!==false:variant.available!==false&&Number(variant.stock??0)>0,price=BFCatalog.price(item,settings),compare=BFCatalog.compareAtPrice(item,settings),url=`item.html?id=${encodeURIComponent(item.id)}&style=${ribbedStyle}`,image=BFCatalog.image(item,ribbedStyle),swatch=ribbedHex[item.color]?`<i class="ribbed-swatch" style="background:${ribbedHex[item.color]}" aria-hidden="true"></i>`:'';
        const badges=[item.featuredOrder<=3?'Print Collection':'',pre?'Pre-order':''].filter(Boolean).map(t=>`<span class="catalog-tile-badge${t==='Pre-order'?' preorder':''}">${t}</span>`).join('');
        return `<article class="catalog-tile"><a href="${url}" data-card-link><div class="catalog-tile-media"><img data-card-image src="${esc(image)}" alt="${esc(item.name)}" loading="lazy">${badges}<span class="catalog-status ${pre?'preorder':''}">${pre?'Pre-order':available?'Available':'Sold out'}</span></div><div class="catalog-tile-copy"><h3>${esc(item.name)}</h3><p>${esc(item.color||item.subtitle||'')}${swatch}</p><strong>${available&&price?BFCatalog.priceHtml(price,compare):pre?'Pre-order':available?'Price available soon':'Sold out'}</strong>${pre&&BFCatalog.preorderDate(item)?`<small class="catalog-fulfilment-date">Fulfilment from ${esc(window.BFFulfilment?.shortDate?.(BFCatalog.preorderDate(item))||BFCatalog.preorderDate(item))}</small>`:''}</div></a></article>`;
      }).join('')||'<p>No products are available in this collection yet.</p>';
      return;
    }
    let masters=list.slice();
    grid.innerHTML=masters.map(product=>{
      const v=BFCatalog.featuredVariant(product),pre=BFCatalog.isPreorder(product),available=BFCatalog.purchasable(product,v?.id||''),price=BFCatalog.price(product,settings),compare=BFCatalog.compareAtPrice(product,settings),img=BFCatalog.variantImage(product,v?.id||'',list,categories),url=`item.html?id=${encodeURIComponent(product.id)}${v?.id?`&variant=${encodeURIComponent(v.id)}`:''}`;
      return `<article class="catalog-tile bf-variant-card" data-bf-variant-card data-product-id="${esc(product.id)}"><a href="${url}" data-card-link><div class="catalog-tile-media"><img data-card-image src="${esc(img)}" alt="${esc(product.name)}${v?.color?' in '+esc(v.color):''}" loading="lazy">${pre?'<span class="catalog-tile-badge preorder">Pre-order</span>':''}<span class="catalog-status ${pre?'preorder':''}">${pre?'Pre-order':available?'Available':'Sold out'}</span></div><div class="catalog-tile-copy"><h3>${esc(product.name)}</h3><p class="bf-card-colour" data-card-colour>${esc(v?.color||product.subtitle||'')}</p>${BFCatalog.variants(product).length>1?`<div class="bf-card-swatches" aria-label="Choose colour">${masterSwatches(product)}</div>`:''}<strong>${available||pre?BFCatalog.priceHtml(price,compare):available?'Price available soon':'Sold out'}</strong>${pre&&BFCatalog.preorderDate(product)?`<small class="catalog-fulfilment-date">Fulfilment from ${esc(window.BFFulfilment?.shortDate?.(BFCatalog.preorderDate(product))||BFCatalog.preorderDate(product))}</small>`:''}</div></a></article>`;
    }).join('')||'<p>No products are available in this collection yet.</p>';
    BFCatalog.bindVariantCards(grid,id=>masters.find(x=>x.id===id));
  };
  if(category==='ribbed')document.querySelectorAll('[data-ribbed-style]').forEach(btn=>btn.onclick=()=>{ribbedStyle=btn.dataset.ribbedStyle==='twisted'?'twisted':'flat';history.replaceState(null,'',`${location.pathname}?style=${ribbedStyle}`);render();});
  render();
})();