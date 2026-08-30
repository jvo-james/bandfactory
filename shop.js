let productData={colors:{}},settings={retailPrice:10,twistedRetailPrice:10,smoothAvailable:true,smoothFlatAvailable:true,smoothTwistedAvailable:true};
let activeStyle='flat';
const families={All:BF.colors.map(c=>c[0]),Neutrals:['Black','White','Gray','Ash','Nude'],Pinks:['Pink','Peach','Burgundy'],Blues:['Blue Black','Ocean Blue','Baby Blue','Royal Blue'],Browns:['Light Brown','Dark Brown','Chocolate Brown'],Greens:['Mint','Army Green']};
const colorHex=name=>(BF.colors.find(c=>c[0]===name)||['','#ddd'])[1];
function styleAvailable(){return settings.smoothAvailable!==false&&(activeStyle==='flat'?settings.smoothFlatAvailable!==false:settings.smoothTwistedAvailable!==false)}
function isAvailable(c){const d=productData.styles?.[activeStyle]?.colors?.[c]||productData.colors?.[c]||{};return styleAvailable()&&d.available!==false&&Number(d.stock??1)>0}
function price(){return Number(activeStyle==='twisted'?(settings.twistedRetailPrice??settings.retailPrice??10):(settings.retailPrice||10))}
function productUrl(color){return `product.html?color=${encodeURIComponent(color)}&style=${activeStyle}`}
function renderShop(list=families.All){
  const grid=document.getElementById('productGrid');if(!grid)return;
  const styleName=activeStyle[0].toUpperCase()+activeStyle.slice(1),threshold=Number(settings.lowStockThreshold||10);
  grid.innerHTML=[...list].map(color=>{const d=productData.styles?.[activeStyle]?.colors?.[color]||productData.colors?.[color]||{},available=isAvailable(color),stock=Number(d.stock??0),low=available&&stock<=threshold,url=available?productUrl(color):`unavailable.html?color=${encodeURIComponent(color)}&style=${activeStyle}`;return `<article class="product-card ${available?'':'is-unavailable'}"><a href="${url}"><div class="product-media ${activeStyle==='twisted'?'placeholder-media':''}"><img loading="lazy" src="${BF.imageForProduct(activeStyle,color)}" alt="Smooth ${styleName} Hairband in ${color}"><span class="style-corner">${available?(low?'Limited stock':styleName):'Out of stock'}</span>${available?`<button class="quick-add" type="button" aria-label="Add ${color} ${styleName} hairband to bag" onclick="event.preventDefault();event.stopPropagation();BF.addRetail('${color}',1,'${activeStyle}')"><span class="desktop-add">Quick add</span><span class="mobile-add">+</span></button>`:''}</div></a><div class="product-info"><h3>Smooth ${styleName} Hairband - ${color}</h3><div class="product-price"><strong>${BF.money(price())}</strong><i class="mini-swatch" style="background:${colorHex(color)}"></i></div>${available&&low?'<small class="limited-copy">Selling quickly</small>':!available?'<small class="limited-copy">Currently unavailable</small>':''}</div></article>`}).join('');
}
function setStyle(style){activeStyle=style;document.querySelectorAll('.style-btn').forEach(b=>b.classList.toggle('active',b.dataset.style===style));const intro=document.getElementById('styleIntro');if(intro)intro.textContent=style==='flat'?'Classic flat bands in every available shade.':'Twisted-front smooth bands with the same soft finish and a sculpted centre.';const activeFamily=document.querySelector('.family-btn.active')?.dataset.family||'All';renderShop(families[activeFamily]||families.All)}
async function initShop(){
  const params=new URLSearchParams(location.search);if(params.get('style')==='twisted')activeStyle='twisted';
  await BF.loadSmoothPalette(); const categories=await BFCatalog.loadCategories();if(!categories.some(c=>c.id==='smooth'&&c.visible!==false)){location.href='shop.html';return} families.All=BF.colors.map(c=>c[0]);
  [settings,productData]=await Promise.all([BFStore.getDoc('settings/store',settings),BFStore.getDoc('products/smooth',{colors:{}})]);BF.settings={...BF.settings,...settings};BF.products.smooth.price=Number(settings.retailPrice||10);setStyle(activeStyle);
  document.querySelectorAll('.style-btn').forEach(btn=>btn.onclick=()=>setStyle(btn.dataset.style));
  document.querySelectorAll('.family-btn').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('.family-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderShop(families[btn.dataset.family]||families.All)});
}
document.addEventListener('DOMContentLoaded',initShop);
