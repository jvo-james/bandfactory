let homeInventory={colors:{},styles:{}},homeSettings={lowStockThreshold:10},homeTubeTop={sizes:{}},homeCatalog=[],homeCategories=[];
/* ==========================================================
   BAND FACTORY - HOME PAGE
========================================================== */


/* ==========================================================
   SMALL HTML ESCAPE HELPER
   Prevents customer-entered review content from breaking HTML
========================================================== */

function escapeHTML(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


/* ==========================================================
   REVIEW CARD
========================================================== */

function reviewCard(review) {

    const rating = Math.max(
        1,
        Math.min(5, Number(review.rating) || 5)
    );

    const reviewText = escapeHTML(review.review || '');

    const name = escapeHTML(
        review.name || 'Band Factory Customer'
    );

    const city = escapeHTML(review.city || '');

    const meta = [
        city,
        review.purchased ? 'Verified purchase' : ''
    ]
        .filter(Boolean)
        .join(' · ');

    return `
        <article class="review-box">

            <div class="stars" aria-label="${rating} out of 5 stars">
                ${'★'.repeat(rating)}
                ${'☆'.repeat(5 - rating)}
            </div>

            <div class="review-text-wrap">

                <p class="review-text">
                    “${reviewText}”
                </p>

            </div>

            <button
                class="review-read-more"
                type="button"
                data-review="${reviewText}"
                data-name="${name}"
                data-meta="${escapeHTML(meta)}"
                data-rating="${rating}"
            >
                Read full review →
            </button>

            <div class="review-person">

                <span>${name}</span>

                <small>
                    ${meta || 'Band Factory customer'}
                </small>

            </div>

        </article>
    `;
}


/* ==========================================================
   REVIEW READER / FULL REVIEW MODAL
========================================================== */

function createReviewReader() {

    if (document.getElementById('reviewReader')) {
        return;
    }

    const reader = document.createElement('div');

    reader.className = 'review-reader';
    reader.id = 'reviewReader';

    reader.innerHTML = `
        <div
            class="review-reader-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Customer review"
        >

            <span class="review-reader-quote">
                “
            </span>

            <div
                class="review-reader-stars"
                id="reviewReaderStars"
            ></div>

            <p
                class="review-reader-text"
                id="reviewReaderText"
            ></p>

            <div class="review-reader-person">

                <strong
                    id="reviewReaderName"
                ></strong>

                <span
                    id="reviewReaderMeta"
                ></span>

            </div>

            <div class="review-reader-tip">
                Tap anywhere outside to close
            </div>

        </div>
    `;

    document.body.appendChild(reader);


    /* Close when clicking the dark background */

    reader.addEventListener('click', event => {

        if (event.target === reader) {
            closeReviewReader();
        }

    });


    /* Close with Escape key */

    document.addEventListener('keydown', event => {

        if (
            event.key === 'Escape' &&
            reader.classList.contains('open')
        ) {
            closeReviewReader();
        }

    });
}


function openReviewReader(button) {

    createReviewReader();

    const reader =
        document.getElementById('reviewReader');

    const text =
        document.getElementById('reviewReaderText');

    const name =
        document.getElementById('reviewReaderName');

    const meta =
        document.getElementById('reviewReaderMeta');

    const stars =
        document.getElementById('reviewReaderStars');


    const rating = Math.max(
        1,
        Math.min(
            5,
            Number(button.dataset.rating) || 5
        )
    );


    text.textContent =
        `“${button.dataset.review || ''}”`;

    name.textContent =
        button.dataset.name ||
        'Band Factory Customer';

    meta.textContent =
        button.dataset.meta ||
        'Band Factory customer';

    stars.textContent =
        '★'.repeat(rating) +
        '☆'.repeat(5 - rating);


    reader.classList.add('open');

    document.body.style.overflow = 'hidden';
}


function closeReviewReader() {

    const reader =
        document.getElementById('reviewReader');

    if (!reader) {
        return;
    }

    reader.classList.remove('open');

    document.body.style.overflow = '';
}


/* ==========================================================
   SHOW "READ MORE" ONLY WHEN NEEDED
========================================================== */

function updateReviewReadMoreButtons() {

    document
        .querySelectorAll('.review-box')
        .forEach(card => {

            const text =
                card.querySelector('.review-text');

            const button =
                card.querySelector('.review-read-more');

            if (!text || !button) {
                return;
            }

            const isOverflowing =
                text.scrollHeight >
                text.clientHeight + 2;

            button.hidden = !isOverflowing;

        });
}


/* ==========================================================
   LOAD HOMEPAGE REVIEWS
========================================================== */

async function renderHomeReviews() {

    const reviewGrid =
        document.getElementById('homeReviewGrid');

    if (!reviewGrid) {
        return;
    }


    /* Temporary loading card */

    reviewGrid.innerHTML = `
        <article class="review-box empty-review">

            <div class="stars">
                ★★★★★
            </div>

            <div class="review-text-wrap">

                <p class="review-text">
                    Loading customer reviews...
                </p>

            </div>

            <div class="review-person">

                <span>Band Factory</span>

                <small>
                    Worn & Loved
                </small>

            </div>

        </article>
    `;


    try {

        const reviews =
            await BF.getApprovedReviews();


        /*
           BF.getApprovedReviews() should already
           return approved reviews, but filtering
           again is harmless if status exists.
        */

        const approvedReviews =
            reviews.filter(review => {

                if (!review.status) {
                    return true;
                }

                return review.status === 'approved';

            });


        if (!approvedReviews.length) {

            reviewGrid.innerHTML = `
                <article class="review-box empty-review">

                    <div class="stars">
                        ☆☆☆☆☆
                    </div>

                    <div class="review-text-wrap">

                        <p class="review-text">
                            Be the first to tell us
                            how your Band Factory
                            hairband feels, fits and
                            styles.
                        </p>

                    </div>

                    <div class="review-person">

                        <span>
                            Your review could be here.
                        </span>

                        <small>
                            Reviews appear after approval.
                        </small>

                    </div>

                </article>
            `;

            return;
        }


        reviewGrid.innerHTML =
            approvedReviews
                .map(reviewCard)
                .join('');


        /*
           Wait until the browser has rendered
           the cards before checking overflow.
        */

        requestAnimationFrame(() => {

            updateReviewReadMoreButtons();

        });


    } catch (error) {

        console.error(
            'Could not load homepage reviews:',
            error
        );


        reviewGrid.innerHTML = `
            <article class="review-box empty-review">

                <div class="stars">
                    ☆☆☆☆☆
                </div>

                <div class="review-text-wrap">

                    <p class="review-text">
                        Customer reviews are taking
                        a little longer to load.
                    </p>

                </div>

                <div class="review-person">

                    <span>
                        Band Factory
                    </span>

                    <small>
                        Please refresh the page.
                    </small>

                </div>

            </article>
        `;

    }
}


/* ==========================================================
   COLOUR MARQUEE
========================================================== */

function renderColourMarquee() {

    const track =
        document.getElementById('colorTrack');

    if (!track) {
        return;
    }


    /*
       Duplicate colours so the marquee
       can loop smoothly.
    */

    const colors = [
        ...BF.colors,
        ...BF.colors
    ];


    track.innerHTML =
        colors
            .map(([name, colour]) => `
                <span>

                    <i
                        style="background:${colour}"
                    ></i>

                    ${escapeHTML(name)}

                </span>
            `)
            .join('');
}


/* ==========================================================
   HOMEPAGE PRODUCT PICKS
========================================================== */


function homeEscape(v=''){return escapeHTML(String(v??''));}
function homeCategoryImage(category){
    if(category?.image)return category.image;
    const first=homeCatalog.find(item=>item.category===category?.id&&item.deleted!==true);
    if(first){const variant=BFCatalog.variants(first)[0];const direct=variant?.image||BFCatalog.image(first);if(direct&&direct!=='images/placeholder-product.svg')return direct;}
    return BFCatalog.fallbackImage({category:category?.id},homeCatalog,homeCategories);
}
function renderHomeCategories(){
    const grid=document.getElementById('homeCategoryGrid');if(!grid)return;
    const categories=homeCategories.filter(c=>c.visible!==false&&c.deleted!==true);
    grid.innerHTML=categories.map(category=>{const image=homeCategoryImage(category);return `<a href="${homeEscape(BFCatalog.categoryUrl(category))}" class="home-category-card"><img src="${homeEscape(image)}" alt="${homeEscape(category.name)}" loading="lazy"><div><span>${homeEscape(category.eyebrow||'Collection')}</span><h3>${homeEscape(category.name)}</h3><b>Shop ${homeEscape(category.name)} →</b></div></a>`}).join('');
}
function homeVariantSwatch(v){
    const name=String(v?.color||'').trim().toLowerCase();
    const known=Object.fromEntries((BF.colors||[]).map(([label,hex])=>[String(label).trim().toLowerCase(),hex]));
    if(v?.hex)return v.hex;
    if(known[name])return known[name];
    const exact=Object.keys(known).find(k=>name.includes(k));
    return exact?known[exact]:'#d8cbd0';
}
function homeFeaturedVariant(item){
    return BFCatalog.featuredVariant?.(item)||BFCatalog.variants(item)[0]||null;
}
function renderHomePreorders(){
    const section=document.getElementById('homePreorderSection'),grid=document.getElementById('homePreorderGrid');
    if(!section||!grid)return;
    const visibleIds=new Set(homeCategories.filter(c=>c.visible!==false).map(c=>c.id));
    let products=homeCatalog.filter(item=>item.deleted!==true&&item.available!==false&&visibleIds.has(item.category)&&BFCatalog.isPreorder(item));
    products.sort((a,b)=>String(BFCatalog.preorderDate(a)).localeCompare(String(BFCatalog.preorderDate(b)))||Number(a.featuredOrder||99)-Number(b.featuredOrder||99));
    section.hidden=!products.length;
    if(!products.length){grid.innerHTML='';return;}
    grid.innerHTML=products.slice(0,6).map(item=>{
        const variants=BFCatalog.variants(item).filter(v=>v.available!==false),featured=homeFeaturedVariant(item)||variants[0],selectedId=featured?.id||'',price=BFCatalog.price(item,homeSettings),compare=BFCatalog.compareAtPrice(item,homeSettings),w=BFCatalog.wholesale(item),wholesaleQty=30>=Number(w.minQty||1)?30:Number(w.minQty||1),wholesalePrice=BFCatalog.wholesalePriceForQty(item,wholesaleQty),date=window.BFFulfilment?.shortDate?.(BFCatalog.preorderDate(item))||BFCatalog.preorderDate(item),fallback=BFCatalog.storefrontImage?.(item,homeCatalog,homeCategories)||BFCatalog.fallbackImage(item,homeCatalog,homeCategories);
        const swatches=variants.map(v=>`<button type="button" class="home-preorder-swatch ${v.id===selectedId?'is-selected':''}" data-preorder-variant="${homeEscape(v.id)}" aria-label="${homeEscape(v.color||'Choose colour')}" aria-pressed="${v.id===selectedId?'true':'false'}" title="${homeEscape(v.color||'')}" style="--swatch:${homeEscape(homeVariantSwatch(v))}"><span></span></button>`).join('');
        const retailUrl=`item.html?id=${encodeURIComponent(item.id)}${selectedId?`&variant=${encodeURIComponent(selectedId)}`:''}`;
        const wholesaleUrl=`wholesale-product.html?id=${encodeURIComponent(item.id)}${selectedId?`&variant=${encodeURIComponent(selectedId)}`:''}`;
        return `<article class="home-preorder-card" data-preorder-card data-product-id="${homeEscape(item.id)}" data-default-variant="${homeEscape(selectedId)}">
            <a class="home-preorder-media" data-preorder-retail-link href="${retailUrl}">
                <img data-preorder-image src="${homeEscape(featured?.image||fallback)}" alt="${homeEscape(item.name)}${featured?.color?` in ${homeEscape(featured.color)}`:''}" loading="lazy">
                <span class="home-preorder-badge">Pre-order</span>
            </a>
            <div class="home-preorder-copy">
                <div class="home-preorder-title-row">
                    <div><h3>${homeEscape(item.name)}</h3><p data-preorder-colour>${homeEscape(featured?.color||item.subtitle||'')}</p></div>
                </div>
                ${swatches?`<div class="home-preorder-colour-line"><small>Colours</small><div class="home-preorder-swatches" role="group" aria-label="Available colours">${swatches}</div></div>`:''}
                <div class="home-preorder-prices">
                    <a href="${retailUrl}" data-preorder-retail-link><span>Retail</span><strong>${price?BFCatalog.priceHtml(price,compare):'View product'}<i class="fa-solid fa-arrow-right" aria-hidden="true"></i></strong></a>
                    ${w.enabled&&wholesalePrice>0?`<a href="${wholesaleUrl}" data-preorder-wholesale-link><span>Wholesale · ${wholesaleQty} pcs</span><strong>${BF.money(wholesalePrice)}<i class="fa-solid fa-arrow-right" aria-hidden="true"></i></strong></a>`:''}
                </div>
                <div class="home-preorder-foot"><span>Fulfilment from ${homeEscape(date)}</span><a href="${retailUrl}" data-preorder-retail-link>View product</a></div>
            </div>
        </article>`;
    }).join('');
    grid.querySelectorAll('[data-preorder-card]').forEach(card=>{
        const product=homeCatalog.find(p=>p.id===card.dataset.productId);if(!product)return;
        const variants=BFCatalog.variants(product),defaultId=card.dataset.defaultVariant||variants[0]?.id||'',image=card.querySelector('[data-preorder-image]'),colour=card.querySelector('[data-preorder-colour]'),retailLinks=[...card.querySelectorAll('[data-preorder-retail-link]')],wholesaleLink=card.querySelector('[data-preorder-wholesale-link]');
        let selected=defaultId;
        const setVariant=(id)=>{
            const v=BFCatalog.variant(product,id)||variants[0];if(!v)return;selected=v.id||id;
            const src=v.image||BFCatalog.storefrontImage?.(product,homeCatalog,homeCategories)||BFCatalog.fallbackImage(product,homeCatalog,homeCategories);
            if(image){image.src=src;image.alt=`${product.name||'Product'}${v.color?` in ${v.color}`:''}`;}
            if(colour)colour.textContent=v.color||product.subtitle||'';
            card.querySelectorAll('[data-preorder-variant]').forEach(btn=>{const active=btn.dataset.preorderVariant===selected;btn.classList.toggle('is-selected',active);btn.setAttribute('aria-pressed',active?'true':'false');});
            const retail=`item.html?id=${encodeURIComponent(product.id)}${selected?`&variant=${encodeURIComponent(selected)}`:''}`;
            retailLinks.forEach(a=>a.href=retail);
            if(wholesaleLink)wholesaleLink.href=`wholesale-product.html?id=${encodeURIComponent(product.id)}${selected?`&variant=${encodeURIComponent(selected)}`:''}`;
        };
        setVariant(selected);
        card.querySelectorAll('[data-preorder-variant]').forEach(btn=>{
            const choose=()=>setVariant(btn.dataset.preorderVariant||selected);
            btn.addEventListener('mouseenter',choose);
            btn.addEventListener('focus',choose);
            btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();choose();});
        });
    });
}
function renderHomeProducts() {
    const productGrid=document.getElementById('homeProducts'); if(!productGrid)return;
    const visibleIds=new Set(homeCategories.filter(c=>c.visible!==false).map(c=>c.id));
    const smoothCandidates=(visibleIds.has('smooth')?[['Black','flat'],['Pink','twisted'],['Burgundy','flat'],['Royal Blue','twisted'],['Nude','flat']]:[]).filter(([colour,style])=>BF.variantAvailable(homeInventory,homeSettings,style,colour)).map(([colour,style])=>({kind:'smooth',name:`Smooth ${style[0].toUpperCase()+style.slice(1)} · ${colour}`,image:BF.imageForProduct(style,colour),price:BF.retailPrice(style),url:`product.html?color=${encodeURIComponent(colour)}&style=${style}`,preorder:false}));
    const catalogCandidates=BFCatalog.expandVariants(homeCatalog.filter(item=>item.available!==false&&visibleIds.has(item.category))).map(item=>({kind:'catalog',name:item.variantId&&item.color?`${item.name} · ${item.color}`:item.name,image:BFCatalog.image(item,'flat',item.variantId)||BFCatalog.fallbackImage(item,homeCatalog,homeCategories),price:BFCatalog.price(item,homeSettings),compareAt:BFCatalog.compareAtPrice(item,homeSettings),url:`item.html?id=${encodeURIComponent(item.masterProductId||item.id)}${item.variantId?`&variant=${encodeURIComponent(item.variantId)}`:''}`,preorder:BFCatalog.isPreorder(item),date:BFCatalog.preorderDate(item)}));
    const pool=[...catalogCandidates,...smoothCandidates],shuffled=[...pool].sort(()=>Math.random()-.5),picks=[];for(const item of shuffled){if(picks.length===4)break;if(!picks.some(p=>p.name===item.name))picks.push(item)}
    productGrid.innerHTML=picks.map(item=>`<article class="home-product"><a href="${item.url}"><div class="image"><img src="${item.image}" alt="${escapeHTML(item.name)}" loading="lazy">${item.preorder?'<span class="home-stock-chip preorder-chip">Pre-order</span>':''}</div></a><div class="meta"><h3>${escapeHTML(item.name)}</h3><p>${item.price?BFCatalog.priceHtml(item.price,item.compareAt||0):'View product'}${item.preorder&&item.date?`<small>From ${escapeHTML(window.BFFulfilment?.shortDate?.(item.date)||item.date)}</small>`:''}</p><a class="add-mini stock-link" href="${item.url}">View product</a></div></article>`).join('');
}


/* ==========================================================
   SHOP BY COLOUR
========================================================== */

function shadeOptions(name){
    const options=[];
    if(homeCategories.some(c=>c.id==='smooth'&&c.visible!==false))for(const style of ['flat','twisted']) if(BF.variantAvailable(homeInventory,homeSettings,style,name)) options.push({name:`Smooth ${style[0].toUpperCase()+style.slice(1)} Hairband`,meta:name,image:BF.imageForProduct(style,name),url:`product.html?color=${encodeURIComponent(name)}&style=${style}`});
    homeCatalog.filter(item=>homeCategories.some(c=>c.id==='ribbed'&&c.visible!==false)&&item.category==='ribbed'&&String(item.color||'').toLowerCase()===name.toLowerCase()&&item.available!==false&&Number(item.stock??0)>0).forEach(item=>options.push({name:item.name,meta:'Ribbed Hairband',image:BFCatalog.image(item),url:`item.html?id=${encodeURIComponent(item.id)}`}));
    return options;
}
function openShadePicker(name){
    const options=shadeOptions(name);let modal=document.getElementById('shadePicker');if(!modal){modal=document.createElement('div');modal.id='shadePicker';modal.className='shade-picker';modal.innerHTML='<button class="shade-picker-backdrop" type="button" data-shade-close aria-label="Close"></button><div class="shade-picker-card"><button class="shade-picker-close" type="button" data-shade-close aria-label="Close">×</button><div class="eyebrow">Shop your shade</div><h2 id="shadePickerTitle"></h2><p id="shadePickerIntro"></p><div class="shade-picker-grid" id="shadePickerGrid"></div></div>';document.body.appendChild(modal);modal.querySelectorAll('[data-shade-close]').forEach(x=>x.onclick=()=>{modal.classList.remove('open');document.body.classList.remove('shade-open')})}
    modal.querySelector('#shadePickerTitle').textContent=name;modal.querySelector('#shadePickerIntro').textContent=options.length>1?'Choose the finish you want. Every available version of this shade is shown here.':options.length?'This shade is available in the option below.':'This shade is currently unavailable.';
    modal.querySelector('#shadePickerGrid').innerHTML=options.map(x=>`<a href="${x.url}" class="shade-picker-option"><img src="${x.image}" alt="${escapeHTML(x.name)}"><div><strong>${escapeHTML(x.name)}</strong><span>${escapeHTML(x.meta)}</span></div><i class="fa-solid fa-arrow-right"></i></a>`).join('')||'<p class="shade-picker-empty">This shade is currently out of stock. Please check again soon.</p>';
    modal.classList.add('open');document.body.classList.add('shade-open');
}
function renderColourBoxes() {
    const colourBoxes=document.getElementById('colourBoxes'); if(!colourBoxes)return;
    colourBoxes.innerHTML=BF.colors.map(([name,colour])=>{const count=shadeOptions(name).length;return `<button class="colour-box ${count?'':'is-unavailable'}" type="button" data-shade="${escapeHTML(name)}" style="--shade:${colour}"><span class="colour-fill"></span><strong>${escapeHTML(name)}</strong><small>${count?`${count} ${count===1?'option':'options'} available`:'Out of stock'} <i class="fa-solid fa-arrow-right"></i></small></button>`}).join('');
    colourBoxes.querySelectorAll('[data-shade]').forEach(btn=>btn.onclick=()=>openShadePicker(btn.dataset.shade));
}


/* ==========================================================
   HOMEPAGE SETTINGS
========================================================== */

function applyHomepageSettings(settings) {

    if (!settings) {
        return;
    }


    /* HERO POSITIONING
       Kept fixed in index.html because the old Website Content admin tab was removed.
       Legacy Firestore hero values should not overwrite the broader brand message. */

    /* WHOLESALE TITLE */

    const wholesaleTitle =
        document.getElementById(
            'wholesaleHomeTitle'
        );

    if (
        wholesaleTitle &&
        settings.wholesaleHomeTitle
    ) {

        wholesaleTitle.innerHTML =
            escapeHTML(
                settings.wholesaleHomeTitle
            )
                .replace(/\n/g, '<br>');

    }


    /* WHOLESALE COPY */

    const wholesaleCopy =
        document.getElementById(
            'wholesaleHomeCopy'
        );

    if (
        wholesaleCopy &&
        settings.wholesaleHomeCopy
    ) {

        wholesaleCopy.textContent =
            settings.wholesaleHomeCopy;

    }


    /* WHOLESALE PRICE */

    const wholesalePrice =
        document.getElementById(
            'wholesaleHomePrice'
        );

    if (
        wholesalePrice &&
        settings.wholesale30Price
    ) {

        wholesalePrice.textContent =
            `30 bands - ${BF.money(
                Number(settings.wholesale30Price)
            )}`;

    }
}


/* ==========================================================
   SOCIAL LINKS
========================================================== */

function applySocialLinks() {

    const config =
        window.BF_CONFIG;

    if (
        !config ||
        !config.socials
    ) {
        return;
    }


    const socials =
        config.socials;


    document
        .querySelectorAll('[data-social]')
        .forEach(link => {

            const key =
                link.dataset.social;


            if (
                key === 'whatsapp' &&
                socials.whatsapp
            ) {

                link.href =
                    `https://wa.me/${socials.whatsapp}`;

            }


            if (
                key === 'snapchat' &&
                socials.snapchat
            ) {

                link.href =
                    `https://www.snapchat.com/add/${socials.snapchat}`;

            }


            if (
                key === 'instagram' &&
                socials.instagram
            ) {

                link.href =
                    socials.instagram;

            }


            if (
                key === 'tiktok' &&
                socials.tiktok
            ) {

                link.href =
                    socials.tiktok;

            }

        });
}


/* ==========================================================
   NEWSLETTER
========================================================== */

function setupNewsletter() {

    const form =
        document.getElementById(
            'newsletterForm'
        );

    if (!form) {
        return;
    }


    form.addEventListener(
        'submit',
        async event => {

            event.preventDefault();


            const emailInput =
                form.querySelector(
                    'input[name="email"]'
                );


            const button =
                form.querySelector('button');


            if (
                !emailInput ||
                !emailInput.value.trim()
            ) {

                BF.toast(
                    'Please enter your email address.'
                );

                return;
            }


            const email =
                emailInput.value.trim();


            button.disabled = true;

            const previousText =
                button.textContent;

            button.textContent = '…';


            try {

                await BF.subscribe(email);


                BF.toast(
                    'Welcome to Band Factory.'
                );


                form.reset();


            } catch (error) {

                console.error(
                    'Newsletter error:',
                    error
                );


                BF.toast(
                    'Could not join right now. Please try again.'
                );


            } finally {

                button.disabled = false;

                button.textContent =
                    previousText || '→';

            }

        }
    );
}



function tubeTopTotalStock(product=homeTubeTop){
    return Object.values(product?.sizes||{}).reduce((sum,size)=>sum+Math.max(0,Number(size?.stock??size??0)),0);
}

function renderHomepageFeature(){
    const card=document.getElementById('homepageFeatureCard');if(!card)return;
    const image=document.getElementById('homepageFeatureImage'),badge=document.getElementById('homepageFeatureBadge'),eyebrow=document.getElementById('homepageFeatureEyebrow'),title=document.getElementById('homepageFeatureTitle'),copy=document.getElementById('homepageFeatureCopy'),cta=document.getElementById('homepageFeatureCta');
    const visibleIds=new Set(homeCategories.filter(c=>c.visible!==false).map(c=>c.id));const set=homeCatalog.find(x=>x.id==='second-skin-long-sleeve'&&visibleIds.has(x.category)&&x.available!==false)||homeCatalog.find(x=>visibleIds.has(x.category)&&x.available!==false);if(!set){card.hidden=true;return}card.hidden=false;const category=homeCategories.find(c=>c.id===set.category);
    card.href=set.id==='spandex-tube-top'?'tube-top.html':`item.html?id=${encodeURIComponent(set.id)}`;card.classList.add('editorial-drop-card');image.src=BFCatalog.image(set);image.alt=set.name;badge.hidden=false;badge.textContent=(category?.name||'FEATURED').toUpperCase();eyebrow.textContent=(set.subtitle||category?.eyebrow||'BAND FACTORY').toUpperCase();title.textContent=`${set.name}.`;copy.textContent=`${set.subtitle||set.color||category?.description||''}${BFCatalog.price(set,homeSettings)?` · ${BF.money(BFCatalog.price(set,homeSettings))}`:''}`;cta.textContent=`Shop ${category?.name||'product'} →`;
}

/* ==========================================================
   MAIN HOMEPAGE RENDER
========================================================== */

async function renderHome() {

    try {

        await BF.loadSmoothPalette();
        renderColourMarquee();
        applySocialLinks();
        const [settings,inventory,tubeTop,catalog,categories]=await Promise.all([BF.loadSettings(),BFStore.getDoc('products/smooth',{colors:{},styles:{}}),BFStore.getDoc('products/spandexTubeTop',{name:'Spandex Tube Top',price:64,color:'Black',sizes:{XS:{stock:3,available:true},S:{stock:4,available:true},M:{stock:3,available:true},L:{stock:3,available:true},XL:{stock:3,available:true},'2XL':{stock:3,available:true}}}),BFCatalog.load(),BFCatalog.loadCategories()]);
        homeSettings=settings||{}; homeInventory=inventory||{colors:{},styles:{}}; homeTubeTop=tubeTop||{sizes:{}}; homeCatalog=catalog||[]; homeCategories=categories||[];
        renderHomeCategories();
        renderHomePreorders();
        renderHomepageFeature();
        renderHomeProducts();
        renderColourBoxes();
        applyHomepageSettings(settings);


        /* Load approved reviews */

        await renderHomeReviews();


    } catch (error) {

        console.error(
            'Homepage failed to initialise:',
            error
        );

    }
}


/* ==========================================================
   REVIEW BUTTON CLICK
========================================================== */

document.addEventListener(
    'click',
    event => {

        const button =
            event.target.closest(
                '.review-read-more'
            );

        if (!button) {
            return;
        }


        openReviewReader(button);

    }
);


/* ==========================================================
   WINDOW RESIZE
   Re-check whether review text overflows
========================================================== */

let reviewResizeTimer;

window.addEventListener(
    'resize',
    () => {

        clearTimeout(reviewResizeTimer);


        reviewResizeTimer =
            setTimeout(() => {

                updateReviewReadMoreButtons();

            }, 120);

    }
);


/* ==========================================================
   REFRESH REVIEWS WHEN USER RETURNS
========================================================== */

document.addEventListener(
    'visibilitychange',
    () => {

        if (
            document.visibilityState === 'visible'
        ) {

            renderHomeReviews();

        }

    }
);


window.addEventListener(
    'focus',
    () => {

        renderHomeReviews();

    }
);


/* ==========================================================
   PAGE LOAD
========================================================== */

document.addEventListener(
    'DOMContentLoaded',
    () => {

        createReviewReader();

        setupNewsletter();

        renderHome();

    }
);

/* Homepage hero slideshow */
document.addEventListener('DOMContentLoaded',()=>{
  const slides=[...document.querySelectorAll('.hero-slider .hero-slide')];
  if(!slides.length)return;
  slides.forEach(slide=>{
    const path=String(slide.dataset.heroImage||'').split('.').reduce((o,k)=>o?.[k],window.BF_IMAGES);
    if(path)slide.style.backgroundImage=`url("${path}")`;
  });
  const dots=[...document.querySelectorAll('[data-hero-dot]')];
  let index=0,timer;
  const show=i=>{index=(i+slides.length)%slides.length;slides.forEach((s,n)=>s.classList.toggle('active',n===index));dots.forEach((d,n)=>d.classList.toggle('active',n===index));clearInterval(timer);timer=setInterval(()=>show(index+1),6500)};
  document.querySelector('[data-hero-next]')?.addEventListener('click',()=>show(index+1));
  document.querySelector('[data-hero-prev]')?.addEventListener('click',()=>show(index-1));
  dots.forEach((d,n)=>d.addEventListener('click',()=>show(n)));
  show(0);
});
