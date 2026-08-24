
// Preserve the shopper's first known acquisition source across pages so checkout attribution remains useful.
(function captureBandFactoryAttribution(){
  const key='bf_attribution';
  try{
    const existing=JSON.parse(localStorage.getItem(key)||'{}');
    if(existing.capturedAt)return;
    const q=new URLSearchParams(location.search),ref=document.referrer||'';let detected='Direct / Unknown';
    const utm=q.get('utm_source');
    if(utm)detected=utm;
    else if(/tiktok/i.test(ref))detected='TikTok';
    else if(/instagram/i.test(ref))detected='Instagram';
    else if(/snapchat/i.test(ref))detected='Snapchat';
    else if(/wa\.me|whatsapp/i.test(ref))detected='WhatsApp';
    else if(/google/i.test(ref))detected='Google';
    else if(ref&&!ref.startsWith(location.origin))detected='Referral';
    localStorage.setItem(key,JSON.stringify({detectedSource:detected,utmSource:utm||'',utmMedium:q.get('utm_medium')||'',utmCampaign:q.get('utm_campaign')||'',landingPage:location.pathname+location.search,referrer:ref,capturedAt:new Date().toISOString()}));
  }catch(error){console.warn('[Band Factory] Attribution could not be saved.',error)}
})();

const BF = {
  products: {
    smooth: { id:'smooth', name:'Smooth Hairband', price:10,
      // IMAGE: DEFAULT PRODUCT FALLBACK — replace if you want a different fallback photo.
      image:'images/hero.webp' }
  },
  colors: [
    ['Pink','#FF4A8D'],['Black','#141414'],['White','#F7F4EF'],['Gray','#8C8C8C'],['Ash','#B8ADA7'],['Red','#FF0000'],
    ['Blue Black','#18202B'],['Ocean Blue','#0177BF'],['Baby Blue','#ADCFE4'],['Royal Blue','#2852AF'],['Nude','#CAA38F'],
    ['Light Brown','#A9846E'],['Mint','#A9CFBD'],['Mustard','#C89E3C'],['Dark Brown','#56392F'],['Chocolate Brown','#714B3D'],
    ['Army Green','#68705B'],['Peach','#F97272'],['Burgundy','#48020C'],['Teal Blue','#017F7C']
  ],

  /* =====================================================================
     PRODUCT IMAGE MAP — THIS IS THE MAIN PLACE TO REPLACE PRODUCT PHOTOS.
     When you have the real photos, create the files inside /images and replace
     each path below. The Shop, Product, Recommendations, Bag and Checkout
     will all update automatically from this one map.

     Example:
       'Pink': 'images/pink-hairband.webp'
     ===================================================================== */
  imageForColor(name){
    const images = {
      // IMAGE: PINK SMOOTH HAIRBAND
      'Pink': 'images/fpinkk.jpg',
      // IMAGE: BLACK SMOOTH HAIRBAND
      'Black': 'images/black.jpg',
      // IMAGE: WHITE SMOOTH HAIRBAND
      'White': 'images/white.jpg',
      'Gray': 'images/gray.jpg',
      // IMAGE: ASH SMOOTH HAIRBAND
      'Ash': 'images/ash.jpg',
       'Red': 'images/red.jpg',
      // IMAGE: BLUE BLACK SMOOTH HAIRBAND
      'Blue Black': 'images/blue-black.jpg',
      // IMAGE: SEA BLUE SMOOTH HAIRBAND
      'Ocean Blue': 'images/ob.png',
      // IMAGE: BABY BLUE SMOOTH HAIRBAND
      'Baby Blue': 'images/baby-blue.jpg',
      // IMAGE: ROYAL BLUE SMOOTH HAIRBAND
      'Royal Blue': 'images/royal-blue.jpg',
      // IMAGE: NUDE SMOOTH HAIRBAND
      'Nude': 'images/nude.jpg',
      // IMAGE: LIGHT BROWN SMOOTH HAIRBAND
      'Light Brown': 'images/light-brown.jpg',
      // IMAGE: MINT SMOOTH HAIRBAND
      'Mint': 'images/mint.jpg',
      // IMAGE: MUSTARD SMOOTH HAIRBAND
      'Mustard': 'images/mustard.jpg',
      // IMAGE: DARK BROWN SMOOTH HAIRBAND
      'Dark Brown': 'images/dark-brown.jpg',
      // IMAGE: CHOCOLATE BROWN SMOOTH HAIRBAND
      'Chocolate Brown': 'images/chocolate-brown.jpg',
      // IMAGE: ARMY GREEN SMOOTH HAIRBAND
      'Army Green': 'images/army-green.jpg',
      // IMAGE: PEACH SMOOTH HAIRBAND
      'Peach': 'images/new-peach.jpg',
      // IMAGE: BURGUNDY SMOOTH HAIRBAND
      'Burgundy': 'images/new-b.jpg',
      'Teal Blue': 'images/new-tblue.jpg'
    };
    return images[name] || this.products.smooth.image;
  },


imageForProduct(style='flat', name='Pink', material='smooth') {
    if (material === 'ribbed') {
        return 'images/ribbed-placeholder.svg';
    }

    if (style === 'twisted') {
        const twistedImages = {
            'Pink': 'images/pinkk.jpg',
            'Black': 'images/twisted-black.jpg',
            'White': 'images/twist-white.jpg',
            'Gray': 'images/twisted-gray.jpg',
            'Ash': 'images/twisted-ash.jpg',
          'Red': 'images/tred.jpg',
            'Blue Black': 'images/twisted-blueblack.jpg',
            'Ocean Blue': 'images/tob.png',
            'Baby Blue': 'images/twisted-babyblue.jpg',
            'Royal Blue': 'images/twisted-royalblue.jpg',
            'Nude': 'images/twisted-nude.jpg',
            'Light Brown': 'images/twisted-lightbrown.jpg',
            'Mint': 'images/twisted-mint.jpg',
            'Mustard': 'images/twisted-mustard.jpg',
            'Dark Brown': 'images/twisted-darkbrown.jpg',
            'Chocolate Brown': 'images/twisted-chocolatebrown.jpg',
            'Army Green': 'images/twisted-armygreen.jpg',
            'Peach': 'images/new-peach-twisted.jpg',
            'Burgundy': 'images/new-b-t.jpg',
          'Teal Blue': 'images/new-tblue-t.jpg'
        };

        return twistedImages[name] || 'images/twisted-pink.jpg';
    }

    return this.imageForColor(name);
},
  
  variantData(productData={},style='flat',color='Pink'){
    return productData.styles?.[style]?.colors?.[color] || productData.colors?.[color] || {};
  },
  variantAvailable(productData={},settings={},style='flat',color='Pink'){
    const d=this.variantData(productData,style,color);
    const styleAvailable=style==='twisted'?settings.smoothTwistedAvailable!==false:settings.smoothFlatAvailable!==false;
    return settings.smoothAvailable!==false && styleAvailable && d.available!==false && Number(d.stock??1)>0;
  },
  lowStockMessage(stock,threshold=10){
    stock=Number(stock); threshold=Number(threshold||10);
    if(stock>0 && stock<=threshold) return 'Selling quickly. Limited stock is available, so order soon if this is your shade.';
    return '';
  },
  retailPrice(style='flat'){
    return Number(style==='twisted' ? (this.settings.twistedRetailPrice ?? this.settings.retailPrice ?? 10) : (this.settings.retailPrice ?? 10));
  },
  getCart(){ try{return JSON.parse(localStorage.getItem('bf_cart'))||[]}catch{return[]} },
  saveCart(cart){ localStorage.setItem('bf_cart',JSON.stringify(cart)); this.updateBagUI(); },
  addRetail(color='Pink',qty=1,style='flat',material='smooth'){
    const cleanStyle=style==='twisted'?'twisted':'flat';
    const cleanMaterial=material==='ribbed'?'ribbed':'smooth';
    const cart=this.getCart(); const key=`retail-${cleanMaterial}-${cleanStyle}-${color}`; const found=cart.find(i=>i.key===key);
    const price=cleanMaterial==='smooth'?this.retailPrice(cleanStyle):Number(this.settings.ribbedPrice||0);
    const label=`${cleanMaterial[0].toUpperCase()+cleanMaterial.slice(1)} ${cleanStyle[0].toUpperCase()+cleanStyle.slice(1)} Hairband`;
    if(found) found.qty+=qty; else cart.push({key,type:'retail',name:label,material:cleanMaterial,style:cleanStyle,color,qty,price,image:this.imageForProduct(cleanStyle,color,cleanMaterial)});
    this.saveCart(cart); this.toast(`${qty} ${qty===1?'hairband':'hairbands'} added to your Bag`); this.openDrawer('bagDrawer');
  },
  addSimpleProduct(id,name,price,image,qty=1){
    const amount=Number(price||0); if(amount<=0)return this.toast('This item is not ready for checkout yet.');
    const cart=this.getCart(),key=`simple-${id}`,found=cart.find(i=>i.key===key);
    if(found)found.qty+=qty;else cart.push({key,type:'simple',productId:id,name,qty,price:amount,image});
    this.saveCart(cart);this.toast(`${name} added to your Bag`);this.openDrawer('bagDrawer');
  },
  addApparel(id,name,size,price,image,qty=1){
    const amount=Number(price||0),cleanSize=String(size||'').toUpperCase();if(amount<=0||!cleanSize)return this.toast('Choose a size before adding this item.');
    const cart=this.getCart(),key=`apparel-${id}-${cleanSize}`,found=cart.find(i=>i.key===key);
    if(found)found.qty+=qty;else cart.push({key,type:'apparel',productId:id,name,size:cleanSize,color:'Black',qty,price:amount,image});
    this.saveCart(cart);this.toast(`${name} · ${cleanSize} added to your Bag`);this.openDrawer('bagDrawer');
  },
  addWholesale(bundle,allocations,mode='custom',style='flat',material='smooth',styleAllocations=null){
    const cart=this.getCart();
    const cleanStyle=['flat','twisted','mixed'].includes(style)?style:'flat';
    const prettyStyle=cleanStyle==='mixed'?'Mixed':cleanStyle[0].toUpperCase()+cleanStyle.slice(1);
    const modeLabel=mode==='standard'?'Standard Wholesale':'Custom Colour Wholesale';
    const materialLabel=material[0].toUpperCase()+material.slice(1);
    const split=styleAllocations||{[cleanStyle]:bundle.pieces};

    let summary='';
    if(mode==='standard'){
      const splitText=cleanStyle==='mixed'?` · ${Number(split.flat||0)} Flat + ${Number(split.twisted||0)} Twisted`:'';
      summary=`Colours selected and mixed by Band Factory based on availability${splitText}`;
    }else if(cleanStyle==='mixed'&&allocations&&typeof allocations==='object'){
      const styleLines=['flat','twisted'].map(kind=>{
        const entries=Object.entries(allocations[kind]||{}).filter(([,q])=>Number(q)>0).map(([c,q])=>`${q} ${c}`).join(', ');
        return `${kind[0].toUpperCase()+kind.slice(1)} (${Number(split[kind]||0)}): ${entries||'No colours'}`;
      });
      summary=`${Number(split.flat||0)} Flat + ${Number(split.twisted||0)} Twisted · ${styleLines.join(' · ')}`;
    }else{
      summary=Object.entries(allocations||{}).filter(([,q])=>Number(q)>0).map(([c,q])=>`${q} ${c}`).join(' · ');
    }

    cart.push({
      key:`wholesale-${Date.now()}`,
      type:'wholesale',
      wholesaleMode:mode,
      name:`${bundle.pieces} Piece ${materialLabel} ${prettyStyle} ${modeLabel}`,
      material,
      style:cleanStyle,
      styleAllocations:split,
      allocations,
      qty:1,
      price:bundle.price,
      // IMAGE: WHOLESALE BAG THUMBNAIL — replace this with your stacked/bulk hairband photo.
      image:'images/shopping.jpg',
      bundlePieces:bundle.pieces,
      summary
    });
    this.saveCart(cart); this.toast('Wholesale bundle added to your Bag'); this.openDrawer('bagDrawer');
  },
  cartCount(){return this.getCart().reduce((n,i)=>n+Number(i.qty||1),0)},
  cartSubtotal(){return this.getCart().reduce((s,i)=>s+i.price*i.qty,0)},
  money(v){return `GHS ${Number(v).toFixed(2).replace('.00','')}`},
  updateBagUI(){document.querySelectorAll('[data-bag-count]').forEach(el=>el.textContent=this.cartCount());this.renderBag()},
  renderBag(){
    const body=document.querySelector('[data-bag-body]'); if(!body)return; const cart=this.getCart();
    const totalEl=document.querySelector('[data-bag-total]'); if(totalEl) totalEl.textContent=this.money(this.cartSubtotal());
    const countText=document.querySelector('[data-bag-items-text]'); if(countText) countText.textContent=`${this.cartCount()} ${this.cartCount()===1?'item':'items'}`;
    if(!cart.length){body.innerHTML=`<div class="empty-state"><h3>Your Bag is waiting.</h3><p>Choose a colour you love or build a wholesale bundle.</p><a class="btn" href="shop.html">Shop hairbands</a></div>`;return}
    body.innerHTML=cart.map((i,idx)=>`<div class="bag-row"><div class="bag-thumb"><img src="${i.image}" alt="${i.name}"></div><div><p class="bag-name">${i.name}</p><p class="bag-meta">${i.type==='wholesale'?`${(i.material||'smooth')[0].toUpperCase()+(i.material||'smooth').slice(1)} · ${(i.style||'flat')[0].toUpperCase()+(i.style||'flat').slice(1)} · ${i.summary}`:(i.type==='apparel'?`Black · Size ${i.size}`:(i.type==='simple'?'Band Factory collection':`${i.color} · ${(i.style||'flat')[0].toUpperCase()+(i.style||'flat').slice(1)}`))}</p><div class="bag-line"><strong>${this.money(i.price*i.qty)}</strong><div class="qty-control"><button data-cart-minus="${idx}" aria-label="Decrease quantity">−</button><span>${i.qty}</span><button data-cart-plus="${idx}" aria-label="Increase quantity">+</button></div></div><button class="remove-link" data-cart-remove="${idx}">Remove</button></div></div>`).join('');
    body.querySelectorAll('[data-cart-plus]').forEach(b=>b.onclick=()=>this.changeQty(+b.dataset.cartPlus,1));body.querySelectorAll('[data-cart-minus]').forEach(b=>b.onclick=()=>this.changeQty(+b.dataset.cartMinus,-1));body.querySelectorAll('[data-cart-remove]').forEach(b=>b.onclick=()=>this.remove(+b.dataset.cartRemove));
  },
  async managedCartStockError(cart){
    if(typeof BFStore==='undefined')return '';
    try{
      const [settings,productData,apparelData]=await Promise.all([BFStore.getDoc('settings/store',{}),BFStore.getDoc('products/smooth',{colors:{},styles:{}}),BFStore.getDoc('products/spandexTubeTop',{name:'Spandex Tube Top',price:64,color:'Black',sizes:{XS:{stock:3,available:true},S:{stock:4,available:true},M:{stock:3,available:true},L:{stock:3,available:true},XL:{stock:3,available:true},'2XL':{stock:3,available:true}}})]);
      const remaining={flat:{},twisted:{}};
      const colors=new Set([...(this.colors||[]).map(x=>x[0]),...Object.keys(productData.colors||{}),...Object.keys(productData.styles?.flat?.colors||{}),...Object.keys(productData.styles?.twisted?.colors||{})]);
      for(const style of ['flat','twisted']) for(const color of colors){
        const d=this.variantData(productData,style,color);
        remaining[style][color]=this.variantAvailable(productData,settings,style,color)?Math.max(0,Number(d.stock??0)):0;
      }
      const take=(style,color,qty,label)=>{
        qty=Math.max(0,Number(qty||0));const have=Math.max(0,Number(remaining[style]?.[color]||0));
        if(qty>have)throw new Error(have>0?`Only ${have} ${label} ${have===1?'is':'are'} available right now.`:`${label} is sold out right now.`);
        remaining[style][color]=have-qty;
      };
      const takeStandard=(style,qty,label)=>{
        let need=Math.max(0,Number(qty||0));const choices=Object.entries(remaining[style]||{}).filter(([,stock])=>stock>0).sort((a,b)=>b[1]-a[1]);
        const total=choices.reduce((sum,[,stock])=>sum+stock,0);
        if(total<need)throw new Error(`Only ${total} ${style} wholesale piece${total===1?' is':'s are'} available for ${label} right now.`);
        for(const [color,stock] of choices){if(need<=0)break;const used=Math.min(stock,need);remaining[style][color]-=used;need-=used;}
      };
      for(const item of cart){
        if((item.material||'smooth')!=='smooth')continue;
        if(item.type==='retail'){
          const style=item.style==='twisted'?'twisted':'flat';take(style,item.color,Number(item.qty||0),`${item.color} ${style} hairband${Number(item.qty||0)===1?'':'s'}`);
        }else if(item.type==='wholesale'){
          const mult=Math.max(1,Number(item.qty||1));
          if(item.wholesaleMode==='custom'&&item.allocations){
            if(item.style==='mixed'){
              for(const style of ['flat','twisted'])for(const [color,qty] of Object.entries(item.allocations?.[style]||{}))take(style,color,Number(qty)*mult,`${color} ${style} hairbands`);
            }else{
              const style=item.style==='twisted'?'twisted':'flat';for(const [color,qty] of Object.entries(item.allocations||{}))take(style,color,Number(qty)*mult,`${color} ${style} hairbands`);
            }
          }else if(item.style==='mixed'){
            takeStandard('flat',Number(item.styleAllocations?.flat||0)*mult,'this Standard Mixed bundle');
            takeStandard('twisted',Number(item.styleAllocations?.twisted||0)*mult,'this Standard Mixed bundle');
          }else{
            const style=item.style==='twisted'?'twisted':'flat';takeStandard(style,Number(item.bundlePieces||0)*mult,`this Standard ${style} bundle`);
          }
        }else if(item.type==='apparel'&&item.productId==='spandex-tube-top'){
          const size=String(item.size||'').toUpperCase(),sizeData=apparelData?.sizes?.[size]||{},have=sizeData.available===false?0:Math.max(0,Number(sizeData.stock??0)),need=Math.max(0,Number(item.qty||0));
          if(need>have)throw new Error(have>0?`Only ${have} Spandex Tube Top${have===1?' is':'s are'} left in size ${size}.`:`Size ${size} is sold out right now.`);
        }
      }
      return '';
    }catch(error){return error?.message||'That quantity is no longer available.';}
  },
  async changeQty(index,delta){
    const c=this.getCart();if(!c[index])return;
    const previous=Number(c[index].qty||1),next=Math.max(1,previous+delta);
    if(next===previous)return;
    c[index].qty=next;
    if(delta>0&&(((c[index].material||'smooth')==='smooth'&&(c[index].type==='retail'||c[index].type==='wholesale'))||c[index].type==='apparel')){
      const error=await this.managedCartStockError(c);
      if(error){this.toast(`That's all we've got ✨ ${error}`);return;}
    }
    this.saveCart(c);
  },
  remove(index){const c=this.getCart();c.splice(index,1);this.saveCart(c)},
  openDrawer(id){document.getElementById(id)?.classList.add('open');document.querySelector('.drawer-backdrop')?.classList.add('show');document.body.classList.add('drawer-open')},
  closeDrawers(){document.querySelectorAll('.drawer').forEach(d=>d.classList.remove('open'));document.querySelector('.drawer-backdrop')?.classList.remove('show');document.body.classList.remove('drawer-open')},
  toast(msg){let t=document.querySelector('.toast');if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t)}t.textContent=msg;t.classList.add('show');clearTimeout(this._toast);this._toast=setTimeout(()=>t.classList.remove('show'),2300)},
  settings:{ retailPrice:10, twistedRetailPrice:10, smoothFlatAvailable:true, smoothTwistedAvailable:true, heroTitle:'EVERYDAY ESSENTIALS. REIMAGINED.', heroCopy:'Thoughtful pieces made to finish the look — starting with our signature hairbands, with more everyday essentials to come.', wholesaleHeadline:'BUY MORE. BUILD MORE.', pickupAddress:'REPLACE WITH PICKUP ADDRESS' },
  async loadSettings(){
    try{const data=await BFStore.getDoc('settings/store',{});this.settings={...this.settings,...data};this.products.smooth.price=Number(this.settings.retailPrice||10);document.dispatchEvent(new CustomEvent('bf:settings',{detail:this.settings}));return this.settings}catch(e){console.warn(e);return this.settings}
  },
  async getApprovedReviews(){try{return await BFStore.listWhere('reviews','status','==','approved')}catch{return[]}},
  async submitReview(data){
    const review={...data,status:'pending',submittedAt:new Date().toISOString()};
    const id=await BFStore.add('reviews',review);
    await BFStore.notify('review','New review awaiting approval',`${data.name} left a ${data.rating}-star review.`,{reviewId:id});
    BFEmail.sendReviewEmails(review).catch(console.error);
    return id;
  },
async subscribe(email,name=''){
  const normalized = String(email || '').trim().toLowerCase();

  if (!normalized) {
    throw new Error('Email address is required.');
  }

  await BFStore.add('subscribers', {
    email: normalized,
    name: String(name || '').trim(),
    status: 'active',
    source: 'homepage'
  });

  await BFStore.notify(
    'subscriber',
    'New updates subscriber',
    `${normalized} joined the Band Factory updates list.`,
    { email: normalized }
  );

  BFEmail.sendNewsletterWelcome({
    email: normalized,
    name
  }).catch(console.error);
}
};
function buildSearchIndex(){
  const colourItems=BF.colors.map(([name])=>({title:`${name} Smooth Hairband`,meta:'Smooth Hairband · Retail',url:`product.html?color=${encodeURIComponent(name)}`,image:BF.imageForColor(name),terms:`${name} smooth hairband retail colour color`}));
  return [...colourItems,
    {title:'Spandex Tube Top',meta:'NEW · Black · XS–2XL · GHS 64',url:'tube-top.html',image:'images/new.jpeg',terms:'spandex tube top black top clothing apparel xs small medium large xl 2xl new limited'},
    {title:'Standard Wholesale',meta:'Band Factory selects and mixes colours',url:'wholesale.html#how',terms:'standard wholesale 30 50 100 200 bulk reseller'},
    {title:'Custom Colour Wholesale',meta:'Choose colours and quantities',url:'wholesale.html#how',terms:'custom colour color wholesale 30 50 100 200 bulk'},
    {title:'Ribbed Hairbands',meta:'Check current availability',url:'shop.html',terms:'ribbed hairbands out stock'},
    {title:'Matching Sets',meta:'Smooth or ribbed hairband + basic top',url:'shop.html',terms:'matching sets basic top coming soon'},
    {title:'Delivery & Pickup',meta:'Checkout and fulfilment information',url:'checkout.html',terms:'delivery pickup dispatch location'},
    {title:'Contact Band Factory',meta:'Questions or order help',url:'contact.html',terms:'contact whatsapp email help'}];
}
function setupSiteSearch(){
  const overlay=document.getElementById('siteSearch'),input=document.getElementById('siteSearchInput'),results=document.getElementById('siteSearchResults'); if(!overlay||!input)return;
  const index=buildSearchIndex();
  const render=q=>{const term=q.trim().toLowerCase();const found=term?index.filter(x=>(x.title+' '+x.meta+' '+x.terms).toLowerCase().includes(term)).slice(0,8):index.slice(0,6);results.innerHTML=found.map(x=>`<a class="search-result" href="${x.url}">${x.image?`<img src="${x.image}" alt="">`:`<span class="search-result-icon"><i class="fa-solid fa-arrow-right"></i></span>`}<span><strong>${x.title}</strong><small>${x.meta}</small></span><i class="fa-solid fa-arrow-up-right-from-square"></i></a>`).join('')||'<div class="search-empty">No exact match. Try a colour name or “wholesale”.</div>'};
  const open=()=>{overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');document.body.classList.add('search-open');render(input.value);setTimeout(()=>input.focus(),100)};
  const close=()=>{overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true');document.body.classList.remove('search-open')};
  document.querySelectorAll('[data-open-search]').forEach(b=>b.addEventListener('click',open));document.querySelectorAll('[data-close-search]').forEach(b=>b.addEventListener('click',close));overlay.addEventListener('click',e=>{if(e.target===overlay)close()});input.addEventListener('input',()=>render(input.value));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay.classList.contains('open'))close();if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();open()}});
}

function sharedShell() {
  const shell = document.createElement('div');

  shell.innerHTML = `
    <div class="search-overlay" id="siteSearch" aria-hidden="true">
      <div class="search-shell">
        <div class="search-top">
          <span class="eyebrow">Search Band Factory</span>
          <button
            type="button"
            class="search-close"
            data-close-search
            aria-label="Close search"
          >
            ×
          </button>
        </div>

        <div class="search-field-wrap">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input
            id="siteSearchInput"
            type="search"
            autocomplete="off"
            placeholder="Search colours, wholesale, delivery…"
            aria-label="Search Band Factory"
          >
        </div>

        <div class="search-hint">
          Try “Black”, “wholesale”, “matching sets” or “delivery”.
        </div>

        <div class="search-results" id="siteSearchResults"></div>
      </div>
    </div>

    <div class="drawer-backdrop"></div>

    <!-- BAG DRAWER -->
    <aside class="drawer bag-drawer" id="bagDrawer">

      <div class="drawer-head">
        <div>
          <div class="eyebrow" data-bag-items-text>0 items</div>
          <h2>Your Bag</h2>
        </div>

        <button class="drawer-close" aria-label="Close Bag">
          ×
        </button>
      </div>

      <div class="drawer-body" data-bag-body></div>

      <div class="drawer-footer">

        <div class="subtotal-row">
          <span>Subtotal</span>
          <span data-bag-total>GHS 0</span>
        </div>

        <a href="checkout.html" class="btn wide">
          Checkout
        </a>

        <p class="drawer-note">
          <i class="fa-solid fa-lock"></i>
          Secure payment powered by Paystack.
        </p>

      </div>
    </aside>


    <!-- REVIEW DRAWER -->
    <aside class="drawer review-drawer" id="reviewDrawer">

      <div class="drawer-head">
        <div>
          <div class="eyebrow">Worn & Loved</div>
          <h2>Share your experience</h2>
        </div>

        <button
          class="drawer-close"
          aria-label="Close review"
        >
          ×
        </button>
      </div>

      <div class="drawer-body">

        <form id="reviewForm">

          <!-- RATING -->
          <div class="form-group">
            <label>Your rating</label>

            <div class="rating-input">
              ${[1, 2, 3, 4, 5]
                .map(
                  n => `
                    <button
                      class="star-button"
                      type="button"
                      data-star="${n}"
                      aria-label="${n} stars"
                    >
                      ★
                    </button>
                  `
                )
                .join('')}
            </div>

            <input
              type="hidden"
              name="rating"
              value="5"
            >
          </div>


          <!-- NAME -->
          <div class="form-group">
            <label>Name</label>

            <input
              class="field"
              name="name"
              required
              placeholder="Your name"
            >
          </div>


          <!-- EMAIL -->
          <div class="form-group">
            <label>
              Email
              <span
                style="
                  font-weight:400;
                  text-transform:none;
                  letter-spacing:0;
                "
              >
                — not shown publicly
              </span>
            </label>

            <input
              class="field"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
            >
          </div>


          <!-- CITY -->
          <div class="form-group">
            <label>City / Town</label>

            <input
              class="field"
              name="city"
              required
              placeholder="Your city or town"
            >
          </div>


          <!-- REVIEW -->
          <div class="form-group">
            <label>Your review</label>

            <textarea
              class="field"
              name="review"
              required
              placeholder="Tell us what you loved..."
            ></textarea>
          </div>


          <!-- PURCHASED -->
          <label class="checkline">
            <input
              type="checkbox"
              name="purchased"
            >

            <span>
              I purchased from Band Factory.
            </span>
          </label>


          <!-- SUBMIT -->
          <button
            class="btn wide"
            type="submit"
            style="margin-top:22px"
          >
            Submit review
          </button>


          <!-- SUCCESS MESSAGE -->
          <div
            class="form-success"
            style="display:none"
          >
            <strong>
              Thank you! Your review was submitted successfully. ✓
            </strong>

            <span>
              It has been received and will appear on the website after approval.
            </span>
          </div>

        </form>
      </div>
    </aside>
  `;


  /* =========================================================
     ADD SHELL TO PAGE
  ========================================================= */

  document.body.appendChild(shell);


  /* =========================================================
     BAG DRAWER
  ========================================================= */

  document
    .querySelectorAll('[data-open-bag]')
    .forEach(button => {
      button.onclick = () => {
        BF.openDrawer('bagDrawer');
      };
    });


  /* =========================================================
     REVIEW DRAWER
  ========================================================= */

  document
    .querySelectorAll('[data-open-review]')
    .forEach(button => {
      button.onclick = () => {
        BF.openDrawer('reviewDrawer');
      };
    });


  /* =========================================================
     CLOSE DRAWERS
  ========================================================= */

  document
    .querySelectorAll('.drawer-close')
    .forEach(button => {
      button.onclick = () => {
        BF.closeDrawers();
      };
    });


  const backdrop =
    document.querySelector('.drawer-backdrop');

  if (backdrop) {
    backdrop.onclick = () => {
      BF.closeDrawers();
    };
  }


  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      BF.closeDrawers();
    }
  });


  /* =========================================================
     INITIALIZE BAG + SEARCH
  ========================================================= */

  BF.updateBagUI();
  setupSiteSearch();


  /* =========================================================
     REVIEW FORM
  ========================================================= */

  const rf =
    document.getElementById('reviewForm');

  if (!rf) return;


  let rating = 5;

  const stars = [
    ...rf.querySelectorAll('.star-button')
  ];

  const success =
    rf.querySelector('.form-success');

  const submitButton =
    rf.querySelector('button[type="submit"]');


  /* =========================================================
     STAR RATING
  ========================================================= */

  const paintStars = () => {
    stars.forEach((star, index) => {
      star.classList.toggle(
        'active',
        index < rating
      );
    });
  };


  paintStars();


  stars.forEach(star => {
    star.onclick = () => {
      rating = Number(
        star.dataset.star
      );

      rf.rating.value = rating;

      paintStars();

      /*
       * If they begin filling another review,
       * remove the previous success notice.
       */
      if (success) {
        success.style.display = 'none';
      }

      if (submitButton) {
        submitButton.textContent =
          'Submit review';
      }
    };
  });


  /* =========================================================
     REVIEW SUBMISSION
  ========================================================= */

  rf.onsubmit = async e => {
    e.preventDefault();

    if (!submitButton) return;


    submitButton.disabled = true;
    submitButton.textContent =
      'Submitting...';


    /*
     * Hide an old success message in case
     * this is their second submission.
     */
    if (success) {
      success.style.display = 'none';
    }


    const fd =
      new FormData(rf);


    try {

      await BF.submitReview({
        rating: Number(
          fd.get('rating')
        ),

        name:
          fd.get('name'),

        email:
          fd.get('email'),

        city:
          fd.get('city'),

        review:
          fd.get('review'),

        purchased:
          Boolean(
            fd.get('purchased')
          )
      });


      /* =====================================================
         SUCCESS
         IMPORTANT:
         The review drawer remains OPEN.
      ===================================================== */


      /*
       * Clear all input fields.
       */
      rf.reset();


      /*
       * Restore default 5-star rating.
       */
      rating = 5;

      rf.rating.value = 5;

      paintStars();


      /*
       * Show confirmation inside the drawer.
       */
      if (success) {
        success.style.display =
          'block';
      }


      /*
       * Make success obvious on the button too.
       */
      submitButton.textContent =
        'Review submitted ✓';


      /*
       * Do NOT call BF.closeDrawers().
       *
       * The customer should be able to read
       * the confirmation and close the drawer
       * themselves.
       */


      setTimeout(() => {
        submitButton.textContent =
          'Submit another review';
      }, 1800);


    } catch (err) {

      console.error(
        'Review submission failed:',
        err
      );


      BF.toast(
        'Could not submit review. Please try again.'
      );


      submitButton.textContent =
        'Submit review';


    } finally {

      submitButton.disabled = false;

    }
  };
}

document.addEventListener('DOMContentLoaded',()=>{if(!document.body.classList.contains('admin-body'))sharedShell();BF.loadSettings().then(async st=>{const socials={...BF_CONFIG.socials,instagram:st.instagramUrl||BF_CONFIG.socials.instagram,tiktok:st.tiktokUrl||BF_CONFIG.socials.tiktok};document.querySelectorAll('[data-social]').forEach(a=>{const k=a.dataset.social;if(k==='whatsapp')a.href=`https://wa.me/${socials.whatsapp}`;else if(k==='snapchat')a.href=`https://www.snapchat.com/add/${socials.snapchat}`;else if(socials[k])a.href=socials[k]})});const header=document.querySelector('.site-header');if(document.body.classList.contains('home-page')&&header){const update=()=>header.classList.toggle('scrolled',scrollY>30);update();addEventListener('scroll',update,{passive:true})}const toggle=document.querySelector('.mobile-toggle'),menu=document.querySelector('.mobile-menu');if(toggle&&menu)toggle.onclick=()=>{menu.classList.toggle('open');document.body.classList.toggle('menu-open')};document.querySelectorAll('.mobile-menu a').forEach(a=>a.onclick=()=>{menu?.classList.remove('open');document.body.classList.remove('menu-open')})});
