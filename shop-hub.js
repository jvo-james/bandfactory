(async function(){
  const [categories,items]=await Promise.all([BFCatalog.loadCategories(),BFCatalog.load()]);
  const visible=categories.filter(c=>c.visible!==false);
  const nav=document.getElementById('dynamicCategoryNav'),grid=document.getElementById('dynamicCategoryGrid');
  if(nav)nav.innerHTML=visible.map(c=>`<a href="${BFCatalog.categoryUrl(c)}">${escapeHtml(c.name)}</a>`).join('');
  if(grid)grid.innerHTML=visible.map(c=>{const first=items.find(x=>x.category===c.id&&x.available!==false);const image=c.image||BFCatalog.image(first)||'images/placeholder-product.svg';const count=items.filter(x=>x.category===c.id).length;return `<a class="shop-hub-card" href="${BFCatalog.categoryUrl(c)}"><img src="${escapeAttr(image)}" alt="${escapeAttr(c.name)}"><div><span>${escapeHtml(c.eyebrow||'Collection')}</span><h2>${escapeHtml(c.name)}</h2><p>${escapeHtml(c.description||`${count} product${count===1?'':'s'} in this collection.`)}</p><b>Shop ${escapeHtml(c.name)} →</b></div></a>`}).join('');
  function escapeHtml(v=''){return String(v).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))}
  function escapeAttr(v=''){return escapeHtml(v).replace(/"/g,'&quot;')}
})();
