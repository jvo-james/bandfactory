async function initCategoryPage(){
  const [items,settings]=await Promise.all([BFCatalog.load(),BFStore.getDoc('settings/store',{})]);
  const category=window.BF_CATEGORY;document.querySelector(`[data-cat="${category}"]`)?.classList.add('active');
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
    }
    grid.innerHTML=list.map(item=>{
      const price=BFCatalog.price(item,settings),variant=category==='ribbed'?ribbedVariant(item):item;
      const available=category==='ribbed'?(variant.available!==false&&Number(variant.stock??0)>0):item.available!==false&&(item.sizes?Object.values(item.sizes).some(s=>s.available!==false&&Number(s.stock)>0):Number(variant.stock??1)>0);
      const url=item.id==='spandex-tube-top'?'tube-top.html':`item.html?id=${encodeURIComponent(item.id)}${category==='ribbed'?`&style=${ribbedStyle}`:''}`;
      const swatch=category==='ribbed'&&ribbedHex[item.color]?`<i class="ribbed-swatch" style="background:${ribbedHex[item.color]}" aria-hidden="true"></i>`:'';
      const image=category==='ribbed'?BFCatalog.image(item,ribbedStyle):BFCatalog.image(item);
      const styleName=ribbedStyle==='twisted'?'Twisted':'Flat';
      const title=category==='ribbed'?`${styleName} ${item.name.replace(/^(Flat |Twisted )?/,'')}`:item.name;
      return `<article class="catalog-tile"><a href="${url}"><div class="catalog-tile-media"><img src="${image}" alt="${title}" loading="lazy">${item.featuredOrder<=3&&category==='ribbed'?'<span class="catalog-tile-badge">Print Collection</span>':''}${category==='ribbed'?`<button class="catalog-quick-add" type="button" ${available?'':'disabled'} aria-label="Add ${title} to bag" data-quick-add="${item.id}"><i class="fa-solid fa-bag-shopping"></i></button>`:''}</div><div class="catalog-tile-copy"><h3>${title}</h3><p>${item.subtitle||item.color||''}${swatch}</p><strong>${available?(price?BF.money(price):'Price available soon'):'Sold out'}</strong></div></a></article>`;
    }).join('')||'<p>No products are available in this collection yet.</p>';
    if(category==='ribbed')grid.querySelectorAll('[data-quick-add]').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const item=list.find(x=>x.id===btn.dataset.quickAdd);if(!item)return;const variant=BFCatalog.variant(item,ribbedStyle);if(variant.available===false||Number(variant.stock??0)<=0)return BF.toast('This hairband is currently sold out.');BF.addCatalogProduct(item,'',BFCatalog.price(item,settings),BFCatalog.image(item,ribbedStyle),1,ribbedStyle)}));
  };
  if(category==='ribbed')document.querySelectorAll('[data-ribbed-style]').forEach(btn=>btn.onclick=()=>{ribbedStyle=btn.dataset.ribbedStyle==='twisted'?'twisted':'flat';history.replaceState(null,'',`${location.pathname}?style=${ribbedStyle}`);render()});
  render();
}
document.addEventListener('DOMContentLoaded',initCategoryPage);
