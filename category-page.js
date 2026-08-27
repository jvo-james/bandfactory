async function initCategoryPage(){
  const [items,settings]=await Promise.all([BFCatalog.load(),BFStore.getDoc('settings/store',{})]);
  const category=window.BF_CATEGORY;document.querySelector(`[data-cat="${category}"]`)?.classList.add('active');
  const list=items.filter(x=>x.category===category).sort((a,b)=>(a.featuredOrder??99)-(b.featuredOrder??99));
  const grid=document.getElementById('categoryGrid');
  grid.innerHTML=list.map(item=>{const price=BFCatalog.price(item,settings),available=item.available!==false&&(item.sizes?Object.values(item.sizes).some(s=>s.available!==false&&Number(s.stock)>0):Number(item.stock??1)>0);return `<a class="catalog-tile" href="${item.id==='spandex-tube-top'?'tube-top.html':`item.html?id=${encodeURIComponent(item.id)}`}"><div class="catalog-tile-media"><img src="${BFCatalog.image(item)}" alt="${item.name}" loading="lazy">${item.featuredOrder<=3&&category==='ribbed'?'<span class="catalog-tile-badge">Print edit</span>':''}</div><div class="catalog-tile-copy"><h3>${item.name}</h3><p>${item.subtitle||item.color||''}</p><strong>${available?(price?BF.money(price):'Price in product'):'Sold out'}</strong></div></a>`}).join('')||'<p>No products in this category yet.</p>';
}
document.addEventListener('DOMContentLoaded',initCategoryPage);
