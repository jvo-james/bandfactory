const BF_CATALOG_DEFAULTS = [
  {id:'ribbed-cherry-milk',category:'ribbed',name:'Cherry Milk',subtitle:'Pink & white · Cheetah-style print',price:null,color:'Pink & White',description:'A statement ribbed hairband with a pink and white animal print. Soft texture meets a playful finish for an easy pop of colour.',stock:25,available:true,imageKey:'ribbed-cherry-milk',featuredOrder:1},
  {id:'ribbed-navy-milk',category:'ribbed',name:'Navy Milk',subtitle:'Blue & white · Cheetah-style print',price:null,color:'Blue & White',description:'A statement ribbed hairband with a navy blue and white animal print. A bold colour story with the same comfortable ribbed finish.',stock:25,available:true,imageKey:'ribbed-navy-milk',featuredOrder:2},
  {id:'ribbed-noir-gold',category:'ribbed',name:'Noir Gold',subtitle:'Black & gold · Cheetah-style print',price:null,color:'Black & Gold',description:'A statement ribbed hairband in black and gold animal print. Rich, striking and made to finish the look without trying too hard.',stock:25,available:true,imageKey:'ribbed-noir-gold',featuredOrder:3},
  ...[
    ['Black','ribbed-black'],['White','ribbed-white'],['Yellow','ribbed-yellow'],['Baby Pink','ribbed-baby-pink'],['Hot Pink','ribbed-hot-pink'],
    ['Chartreuse','ribbed-olive'],['Green','ribbed-teal'],['Teal','ribbed-new-teal'],['Royal Blue','ribbed-royal-blue'],['Orange','ribbed-orange'],['Burgundy','ribbed-burgundy'],['Caramel','ribbed-mustard'],['Flamingo','ribbed-flamingo']
  ].map(([color,id],i)=>({id,category:'ribbed',name:`${color} Ribbed Hairband`,subtitle:color,price:null,color,description:`Classic ribbed hairband in ${color}.`,stock:['Teal','Royal Blue'].includes(color)?0:25,available:!['Teal','Royal Blue'].includes(color),imageKey:id,featuredOrder:10+i})),
  {id:'spandex-tube-top',category:'tops',name:'Spandex Tube Top',subtitle:'Black · Double lined · Stretchy',price:64,color:'Black',description:'Double lined and stretchy. The original Band Factory basic already in the shop.',sizes:{XS:{stock:3,available:true},S:{stock:4,available:true},M:{stock:3,available:true},L:{stock:3,available:true},XL:{stock:3,available:true},'2XL':{stock:3,available:true}},available:true,imageKey:'spandex-tube-top',featuredOrder:1},
  {id:'second-skin-tee',category:'tops',name:'Second Skin Tee',subtitle:'Dark Brown',price:70,color:'Dark Brown',description:'A fitted dark brown tee with a smooth second-skin feel. Designed to sit close to the body and work effortlessly with everyday looks.',sizes:{S:{stock:2,available:true},M:{stock:2,available:true},L:{stock:2,available:true},XL:{stock:2,available:true},'2XL':{stock:2,available:true}},available:true,imageKey:'second-skin-tee',featuredOrder:2},
  {id:'essential-vest-top',category:'tops',name:'Essential Vest Top',subtitle:'3-piece set · Black, Coral & White',price:150,color:'Black, Coral & White',description:'A three-piece vest top set with one black, one coral and one white piece. Easy staples made for layering, lounging and everyday styling.',packSize:3,sizes:{S:{stock:3,available:true},M:{stock:3,available:true},L:{stock:3,available:true},XL:{stock:3,available:true}},available:true,imageKey:'essential-vest-top',featuredOrder:3},
  {id:'second-skin-long-sleeve',category:'tops',name:'Second Skin Long Sleeve',subtitle:'3-piece top pack · White, Blue Black & Nude',price:200,color:'White, Blue Black & Nude',description:'A three-piece pack of fitted long sleeve tops in white, blue black and nude. Soft second-skin essentials made to move easily from relaxed days to styled looks.',packSize:3,sizes:{S:{stock:2,available:true},M:{stock:2,available:true},L:{stock:2,available:true},XL:{stock:2,available:true}},available:true,imageKey:'second-skin-long-sleeve',featuredOrder:1},
  {id:'second-set',category:'sets',name:'Second Skin Set',subtitle:'White set + hairband',price:160,color:'White',description:'A clean white coordinated set with a fitted long sleeve top, matching bottoms and a matching hairband. The set includes everything shown in the product image except the socks.',sizes:{},available:true,imageKey:'second-set',featuredOrder:2}
];

window.BF_CATALOG_DEFAULTS = BF_CATALOG_DEFAULTS;
window.BF_CATEGORY_DEFAULTS = [
  {id:'smooth',name:'Smooth',eyebrow:'Hairbands',description:'Flat and Twisted smooth hairbands.',image:'images/flat.jpg',sortOrder:1,visible:true,system:true,url:'smooth.html'},
  {id:'ribbed',name:'Ribbed',eyebrow:'Hairbands',description:'Ribbed hairbands in colours, prints, Flat and Twisted styles.',image:'images/IMG_3249.jpeg',sortOrder:2,visible:true,system:true,url:'ribbed.html'},
  {id:'tops',name:'Tops',eyebrow:'Basics',description:'Band Factory everyday tops.',image:'images/second-skin-tee.jpg',sortOrder:3,visible:true,system:true,url:'tops.html'},
  {id:'sets',name:'Sets',eyebrow:'Basics',description:'Coordinated Band Factory sets.',image:'images/second-skin-long-sleeve.jpg',sortOrder:4,visible:true,system:true,url:'sets.html'}
];

function bfSafeVariantId(value){return String(value||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80);}
function bfNormaliseVariant(v,index=0){
  const source=v&&typeof v==='object'?v:{};
  const color=String(source.color||source.name||`Colour ${index+1}`).trim();
  const id=bfSafeVariantId(source.id||color)||`variant-${index+1}`;
  const rawSizes=source.sizes&&typeof source.sizes==='object'?source.sizes:{};
  const sizes={};
  Object.entries(rawSizes).forEach(([size,d])=>{const key=String(size||'').trim();if(key)sizes[key]={stock:Math.max(0,Number(d?.stock||0)),available:d?.available!==false};});
  const images=Array.isArray(source.images)?source.images.filter(Boolean):[];
  const image=source.image||images[0]||'';
  const hex=String(source.hex||source.colorHex||'').trim();
  return {id,color,hex,image,images,sizes,available:source.available!==false,featuredOrder:Number(source.featuredOrder||index+1)};
}
function bfVariantSource(item){return Array.isArray(item?.variants)?item.variants.map(bfNormaliseVariant).filter(Boolean):[];}

window.BFCatalog = {
  async load(){
    let saved={};
    try{ saved=await BFStore.getDoc('products/catalog',{}); }catch(e){ console.warn(e); }
    const byId=Object.fromEntries((saved.items||[]).map(x=>[x.id,x]));
    const items=BF_CATALOG_DEFAULTS.map(x=>({...x,...(byId[x.id]||{}),id:x.id,imageKey:x.imageKey}));
    for(const item of items){
      if(item.id==='ribbed-olive'){ item.name='Chartreuse Ribbed Hairband'; item.subtitle='Chartreuse'; item.color='Chartreuse'; item.description='Classic ribbed hairband in chartreuse.'; item.imageKey='ribbed-olive'; }
      if(item.id==='ribbed-teal'){ item.name='Green Ribbed Hairband'; item.subtitle='Green'; item.color='Green'; item.description='Classic ribbed hairband in green.'; item.imageKey='ribbed-teal'; }
      if(item.id==='ribbed-new-teal'){ item.name='Teal Ribbed Hairband'; item.subtitle='Teal'; item.color='Teal'; item.description='Classic ribbed hairband in teal.'; item.imageKey='ribbed-new-teal'; }
      if(item.id==='ribbed-royal-blue'){ item.name='Royal Blue Ribbed Hairband'; item.subtitle='Royal Blue'; item.color='Royal Blue'; item.description='Classic ribbed hairband in royal blue.'; item.imageKey='ribbed-royal-blue'; }
      if(item.id==='ribbed-mustard'){ item.name='Caramel Ribbed Hairband'; item.subtitle='Caramel'; item.color='Caramel'; item.description='Classic ribbed hairband in caramel.'; item.imageKey='ribbed-mustard'; }
      if(item.id==='second-skin-long-sleeve') item.category='tops';
      if(item.id==='second-set'){ item.name='Second Skin Set'; item.category='sets'; item.subtitle='White set + hairband'; item.description='A clean white coordinated set with a fitted long sleeve top, matching bottoms and a matching hairband. The set includes everything shown in the product image except the socks.'; }
    }
    for(const x of (saved.items||[])) if(!items.some(i=>i.id===x.id)) items.push(x);
    for(const item of items.filter(x=>x.category==='ribbed')){
      const legacy={stock:Number(item.stock??0),available:item.available!==false};
      item.styles=item.styles||{};
      item.styles.flat={...legacy,...(item.styles.flat||{})};
      item.styles.twisted={stock:0,available:false,...(item.styles.twisted||{})};
      item.stock=Number(item.styles.flat.stock??0);item.available=item.styles.flat.available!==false;
    }
    return items.filter(x=>x.deleted!==true);
  },
  image(item,style='flat',variantId=''){
    const variant=variantId?this.variant(item,variantId):null;
    if(variant?.image)return variant.image;
    if(item?.category==='ribbed'&&style==='twisted')return item?.twistedImage||(window.BF_RIBBED_TWISTED_IMAGE?BF_RIBBED_TWISTED_IMAGE(item?.twistedImageKey||item?.imageKey||item?.id):'images/ribbed-placeholder.svg');
    return item?.image||BF_IMAGE(item?.imageKey||item?.id);
  },
  fallbackImage(item,allItems=[],categories=[]){
    const direct=item?.image||this.image(item,'flat',item?.variantId||'');
    if(direct&&direct!=='images/placeholder-product.svg')return direct;
    const siblings=(allItems||[]).filter(x=>x&&x.category===item?.category&&x.id!==item?.id&&x.deleted!==true);
    for(const sibling of siblings){const v=this.variants(sibling)[0];const img=v?.image||sibling.image||this.image(sibling);if(img&&img!=='images/placeholder-product.svg')return img;}
    const category=(categories||[]).find(c=>c.id===item?.category);
    return category?.image||'images/placeholder-product.svg';
  },
  variants(item){return bfVariantSource(item);},
  hasVariants(item){return this.variants(item).length>0;},
  featuredVariant(item={}){
    const list=this.variants(item);
    if(!list.length)return null;
    const wanted=String(item?.featuredVariantId||item?.featuredColour||item?.featuredColor||'').trim().toLowerCase();
    return list.find(v=>String(v.id||'').toLowerCase()===wanted || String(v.color||'').toLowerCase()===wanted || bfSafeVariantId(v.color)===wanted) || list[0];
  },
  storefrontImage(item={},allItems=[],categories=[]){
    const v=this.featuredVariant(item);
    const direct=v?.image||item?.image||'';
    if(direct&&direct!=='images/placeholder-product.svg')return direct;
    return this.fallbackImage(item,allItems,categories);
  },
  variant(item,styleOrId='flat'){
    if(Array.isArray(item?.variants)){
      const wanted=String(styleOrId||'').trim();
      const found=item.variants.map(bfNormaliseVariant).find(v=>v.id===wanted||v.color===wanted||bfSafeVariantId(v.color)===wanted);
      return found||bfNormaliseVariant(item.variants[0]||{},0)||{};
    }
    if(item?.category!=='ribbed')return item||{};
    const clean=styleOrId==='twisted'?'twisted':'flat';
    return item?.styles?.[clean]||(clean==='flat'?{stock:Number(item?.stock??0),available:item?.available!==false}:{stock:0,available:false});
  },
  variantView(item,variantId=''){
    if(!this.hasVariants(item))return {...item,masterProductId:item?.masterProductId||item?.id,variantId:item?.variantId||''};
    const v=this.variant(item,variantId),sizes=v.sizes||{};
    return {...item,masterProductId:item.id,variantId:v.id,color:v.color||item.color||'',subtitle:v.color||item.subtitle||'',image:v.image||item.image||'',images:v.images||item.images||[],sizes,available:item.available!==false&&v.available!==false,variantName:v.color||'',stock:undefined};
  },
  expandVariants(items=[]){
    const out=[];
    for(const item of items){const vars=this.variants(item);if(!vars.length)out.push({...item,masterProductId:item.id,variantId:''});else vars.forEach(v=>out.push(this.variantView(item,v.id)));}
    return out;
  },
  price(item,settings={}){const ribbedDefault=Number(settings.ribbedPrice||settings.retailPrice||10);return Number(item?.price ?? (item?.category==='ribbed'?ribbedDefault:0) ?? 0);},
  compareAtPrice(item,settings={}){const current=this.price(item,settings);const fallback=item?.category==='ribbed'?settings.ribbedCompareAtPrice:null;const old=Number(item?.compareAtPrice ?? fallback ?? 0);return old>current?old:0;},
  discountPercent(price,compareAt){const current=Number(price||0),old=Number(compareAt||0);return old>current&&current>=0?Math.max(1,Math.round(((old-current)/old)*100)):0;},
  savingsHtml(price,compareAt){const current=Number(price||0),old=Number(compareAt||0),pct=this.discountPercent(current,old);if(!pct)return '';return `<div class="sale-saving-note"><i class="fa-solid fa-tag" aria-hidden="true"></i><span>You save <strong>${BF.money(old-current)}</strong> · ${pct}% off</span></div>`;},
  priceHtml(price,compareAt=0,extraClass=''){const current=Number(price||0),old=Number(compareAt||0);if(!current)return 'View product';return old>current?`<span class="sale-price-wrap ${extraClass}"><del>${BF.money(old)}</del><strong>${BF.money(current)}</strong><span class="sale-pill">Sale</span></span>`:`<span class="sale-price-wrap ${extraClass}"><strong>${BF.money(current)}</strong></span>`;},
  stock(item,size='',variantId=''){
    const v=variantId&&this.hasVariants(item)?this.variant(item,variantId):item;
    if(v?.sizes&&Object.keys(v.sizes).length){const d=v.sizes[size]||{};return d.available===false?0:Math.max(0,Number(d.stock||0));}
    if(variantId&&this.hasVariants(item))return v.available===false?0:Math.max(0,Number(v.stock??0));
    return v?.available===false?0:Math.max(0,Number(v?.stock??0));
  },
  sizeEntries(item,variantId=''){const v=variantId&&this.hasVariants(item)?this.variant(item,variantId):item;return Object.entries(v?.sizes||{});},
  fulfilment(item={}){
    const f=item?.fulfilment||{};
    const type=String(item?.fulfilmentType||f.type||(item?.preorder===true?'preorder':'standard')).trim().toLowerCase()==='preorder'?'preorder':'standard';
    const date=type==='preorder'?(item?.fulfilmentDate||item?.preorderDate||f.date||''):'';
    return {type,date,isPreorder:type==='preorder'};
  },
  isPreorder(item={}){return this.fulfilment(item).isPreorder;},
  preorderDate(item={}){return this.fulfilment(item).date||'';},
  wholesale(item={}){
    const raw=item?.wholesale||{};
    const tiers=(Array.isArray(raw.tiers)?raw.tiers:[]).map(t=>({minQty:Math.max(1,Math.floor(Number(t?.minQty||0))),price:Math.max(0,Number(t?.price||0))})).filter(t=>t.minQty>0&&t.price>0).sort((a,b)=>a.minQty-b.minQty);
    const minQty=Math.max(1,Math.floor(Number(raw.minQty||tiers[0]?.minQty||1)));
    return {enabled:raw.enabled===true,minQty,tiers};
  },
  isWholesale(item={}){return this.wholesale(item).enabled;},
  wholesalePriceForQty(itemOrWholesale={},qty=1){const data=itemOrWholesale?.wholesale?this.wholesale(itemOrWholesale):itemOrWholesale;const tiers=Array.isArray(data?.tiers)?data.tiers:[];const n=Math.max(1,Math.floor(Number(qty||1)));let selected=null;for(const tier of tiers){if(n>=Number(tier.minQty))selected=tier;}return selected?Number(selected.price):0;},
  wholesaleCompare(item,qty=1){const retail=this.price(item,{}),wholesale=this.wholesalePriceForQty(item,qty);return retail>wholesale&&wholesale>0?Math.max(1,Math.round(((retail-wholesale)/retail)*100)):0;},
  purchasable(item={},variantId='',size=''){
    if(item?.available===false)return false;
    if(this.isPreorder(item)){
      if(this.hasVariants(item)){const v=this.variant(item,variantId);if(v?.available===false)return false;if(v?.sizes&&Object.keys(v.sizes).length){return size?v.sizes[size]?.available!==false:Object.values(v.sizes).some(d=>d?.available!==false);}return true;}
      if(item?.sizes&&Object.keys(item.sizes).length){return size?item.sizes[size]?.available!==false:Object.values(item.sizes).some(d=>d?.available!==false);}
      return true;
    }
    if(this.hasVariants(item)){const selected=variantId?this.variant(item,variantId):null,vars=selected?[selected]:this.variants(item);return vars.some(v=>v.available!==false&&(v.sizes&&Object.keys(v.sizes).length?(size? v.sizes[size]?.available!==false&&Number(v.sizes[size]?.stock||0)>0:Object.values(v.sizes).some(d=>d?.available!==false&&Number(d?.stock||0)>0)):Number(v.stock||0)>0));}
    if(item?.category==='ribbed')return ['flat','twisted'].some(style=>{const v=this.variant(item,style);return v.available!==false&&Number(v.stock||0)>0;});
    if(item?.sizes&&Object.keys(item.sizes).length)return Object.values(item.sizes).some(v=>v?.available!==false&&Number(v?.stock||0)>0);
    return Number(item?.stock||0)>0;
  },
  async loadCategories(){
    let saved={};try{saved=await BFStore.getDoc('products/categories',{});}catch(e){console.warn(e)}
    const byId=Object.fromEntries((saved.items||[]).map(x=>[x.id,x]));
    const items=(window.BF_CATEGORY_DEFAULTS||[]).map(x=>({...x,...(byId[x.id]||{}),id:x.id,system:true}));
    for(const x of (saved.items||[]))if(!items.some(i=>i.id===x.id))items.push(x);
    return items.filter(x=>x.deleted!==true).sort((a,b)=>Number(a.sortOrder||99)-Number(b.sortOrder||99)||String(a.name||'').localeCompare(String(b.name||'')));
  },
  categoryUrl(category){return category?.url||`collection.html?category=${encodeURIComponent(category?.id||'')}`;},
  async imageWithFallback(item,{variantId='',style='flat',allItems=[],categories=[]}={}){const direct=this.image(item,style,variantId);if(direct&&direct!=='images/placeholder-product.svg')return direct;return this.fallbackImage(item,allItems,categories);},
  variantImage(item,variantId='',allItems=[],categories=[]){const v=variantId&&this.hasVariants(item)?this.variant(item,variantId):this.featuredVariant(item);const direct=v?.image||item?.image||'';return direct&&direct!=='images/placeholder-product.svg'?direct:this.fallbackImage(item,allItems,categories);},
  bindVariantCards(root=document,lookup=()=>null){
    root.querySelectorAll('[data-bf-variant-card]').forEach(card=>{
      const product=lookup(card.dataset.productId||'');
      if(!product)return;
      const image=card.querySelector('[data-card-image]');
      const colourLabel=card.querySelector('[data-card-colour]');
      const link=card.querySelector('[data-card-link]')||card.querySelector('a');
      const wholesaleLink=card.querySelector('[data-card-wholesale-link]');
      const retailLink=card.querySelector('[data-card-retail-link]');
      const buttons=[...card.querySelectorAll('[data-card-variant]')];
      const variants=this.variants(product);
      const fallback=this.storefrontImage(product,[],[]);
      const setVariant=(id,scroll=false)=>{
        const variant=this.variant(product,id); if(!variant)return;
        const src=variant.image||fallback;
        if(image){image.src=src;image.alt=`${product.name||'Product'}${variant.color?' in '+variant.color:''}`;}
        if(colourLabel)colourLabel.textContent=variant.color||'';
        buttons.forEach(btn=>{const active=btn.dataset.cardVariant===variant.id;btn.classList.toggle('is-active',active);btn.setAttribute('aria-pressed',active?'true':'false');});
        const retailUrl=`item.html?id=${encodeURIComponent(product.id)}&variant=${encodeURIComponent(variant.id)}`;
        if(link)link.href=retailUrl;
        if(retailLink)retailLink.href=retailUrl;
        if(wholesaleLink)wholesaleLink.href=`wholesale-product.html?id=${encodeURIComponent(product.id)}&variant=${encodeURIComponent(variant.id)}`;
      };
      const defaultId=product.featuredVariantId||product.featuredColour||variants[0]?.id||'';
      setVariant(defaultId);
      buttons.forEach(btn=>{
        const choose=()=>setVariant(btn.dataset.cardVariant||defaultId);
        btn.addEventListener('mouseenter',choose);
        btn.addEventListener('focus',choose);
        btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();choose();});
      });
      card.addEventListener('mouseleave',()=>setVariant(defaultId));
    });
  },
};
