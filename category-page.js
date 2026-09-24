async function initCategoryPage(){
  const [items,settings,categories]=await Promise.all([BFCatalog.load(),BFStore.getDoc('settings/store',{}),BFCatalog.loadCategories()]);
  const category=window.BF_CATEGORY;if(!categories.some(c=>c.id===category&&c.visible!==false)){location.href='shop.html';return}document.querySelector(`[data-cat="${category}"]`)?.classList.add('active');
  const hero=document.querySelector('[data-category-hero]');if(hero){const path=hero.dataset.categoryHero.split('.').reduce((o,k)=>o?.[k],window.BF_IMAGES);if(path)hero.style.backgroundImage=`url("${path}")`}
  const list=items.filter(x=>x.category===category).sort((a,b)=>(a.featuredOrder??99)-(b.featuredOrder??99));
  const grid=document.getElementById('categoryGrid');if(!grid)return;
  const ribbedHex={'Black':'#111111','White':'#ffffff','Yellow':'#f2cf37','Baby Pink':'#f7c9d8','Hot Pink':'#f2388a','Chartreuse':'#8fb339','Green':'#2e7d32','Teal':'#017f7c','Royal Blue':'#2852af','Orange':'#ed7b2f','Burgundy':'#7f2037','Caramel':'#c68642','Flamingo':'#f26f82'};
  let ribbedStyle=new URLSearchParams(location.search).get('style')==='twisted'?'twisted':'flat';
  const ribbedVariant=item=>BFCatalog.variant(item,ribbedStyle);
  const render=()=>{
    if(category==='ribbed'){
      document.querySelectorAll('[data-ribbed-style]').forEach(b=>b.classList.toggle('active',b.dataset.ribbedStyle===ribbedStyle));
      const intro=document.getElementById('ribbedStyleIntro');if(intro)intro.textContent=ribbedStyle==='flat'?'Classic flat ribbed bands in every available shade.':'Twisted-front ribbed bands with texture and a sculpted centre.';
      let banner=document.getElementById('hairbandSaleBanner');if(!banner){banner=document.createElement('div');banner.id='hairbandSaleBanner';banner.className='hairband-sale-banner ribbed-sale-banner';grid.parentNode.insertBefore(banner,grid)}const sample=list.map(item=>({price:BFCatalog.price(item,settings),old:BFCatalog.compareAtPrice(item,settings)})).find(x=>x.old>x.price);const pct=sample?BFCatalog.discountPercent(sample.price,sample.old):0;if(pct){banner.hidden=false;banner.innerHTML=`<div class="sale-burst"><strong>${pct}%</strong><span>OFF</span></div><div class="sale-banner-copy"><span class="sale-eyebrow">Hairband offer</span><strong>Ribbed Hairbands are ${pct}% off</strong><small>Discount shown automatically on eligible styles. No code needed.</small></div>`}else{banner.hidden=true;banner.innerHTML=''};
    }
    grid.innerHTML=list.map(item=>{
      const price=BFCatalog.price(item,settings),compareAt=BFCatalog.compareAtPrice(item,settings),variant=category==='ribbed'?ribbedVariant(item):item,preorder=!!BFCatalog.isPreorder(item);
      const available=category==='ribbed'?(variant.available!==false&&(preorder||Number(variant.stock??0)>0)):BFCatalog.purchasable(item);
      const url=item.id==='spandex-tube-top'?'tube-top.html':`item.html?id=${encodeURIComponent(item.id)}${category==='ribbed'?`&style=${ribbedStyle}`:''}`;
      const swatch=category==='ribbed'&&ribbedHex[item.color]?`<i class="ribbed-swatch" style="background:${ribbedHex[item.color]}" aria-hidden="true"></i>`:'';
      const image=category==='ribbed'?BFCatalog.image(item,ribbedStyle):BFCatalog.image(item);
      const styleName=ribbedStyle==='twisted'?'Twisted':'Flat';
      const title=category==='ribbed'?`${styleName} ${item.name.replace(/^(Flat |Twisted )?/,'')}`:item.name;
      const badges=[item.featuredOrder<=3&&category==='ribbed'?'Print Collection':'',preorder?'Pre-order':''].filter(Boolean).map(text=>`<span class="catalog-tile-badge${text==='Pre-order'?' preorder':''}">${text}</span>`).join('');
      return `<article class="catalog-tile"><a href="${url}"><div class="catalog-tile-media"><img src="${image}" alt="${title}" loading="lazy">${badges}${category==='ribbed'?`<button class="catalog-quick-add" type="button" ${available?'':'disabled'} aria-label="${preorder?'Pre-order':'Add'} ${title} to bag" data-quick-add="${item.id}"><i class="fa-solid fa-bag-shopping"></i></button>`:''}</div><div class="catalog-tile-copy"><h3>${title}</h3><p>${item.subtitle||item.color||''}${swatch}</p><strong>${available?(price?BFCatalog.priceHtml(price,compareAt):'Price available soon'):preorder?'Pre-order':'Sold out'}</strong>${preorder&&BFCatalog.preorderDate(item)?`<small class="catalog-fulfilment-date">From ${window.BFFulfilment?.shortDate?.(BFCatalog.preorderDate(item))||BFCatalog.preorderDate(item)}</small>`:''}</div></a></article>`;
    }).join('')||'<p>No products are available in this collection yet.</p>';
    if(category==='ribbed')grid.querySelectorAll('[data-quick-add]').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const item=list.find(x=>x.id===btn.dataset.quickAdd);if(!item)return;const variant=BFCatalog.variant(item,ribbedStyle),preorder=BFCatalog.isPreorder(item);if(variant.available===false||(!preorder&&Number(variant.stock??0)<=0))return BF.toast(preorder?'This hairband is not available for pre-order in this style.':'This hairband is currently sold out.');BF.addCatalogProduct(item,'',BFCatalog.price(item,settings),BFCatalog.image(item,ribbedStyle),1,ribbedStyle)}));
  };
  if(category==='ribbed')document.querySelectorAll('[data-ribbed-style]').forEach(btn=>btn.onclick=()=>{ribbedStyle=btn.dataset.ribbedStyle==='twisted'?'twisted':'flat';history.replaceState(null,'',`${location.pathname}?style=${ribbedStyle}`);render()});
  render();
}
document.addEventListener('DOMContentLoaded',initCategoryPage);
