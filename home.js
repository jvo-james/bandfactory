let homeInventory={colors:{},styles:{}},homeSettings={lowStockThreshold:10},homeTubeTop={sizes:{}};
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

function renderHomeProducts() {
    const productGrid=document.getElementById('homeProducts'); if(!productGrid)return;
    const picks=[['Black','flat'],['Pink','twisted'],['Burgundy','flat'],['Royal Blue','twisted']];
    productGrid.innerHTML=picks.map(([colour,style])=>{const styleLabel=style.charAt(0).toUpperCase()+style.slice(1),image=BF.imageForProduct(style,colour),productPrice=BF.retailPrice(style),available=BF.variantAvailable(homeInventory,homeSettings,style,colour),d=BF.variantData(homeInventory,style,colour),low=available&&Number(d.stock??0)<=Number(homeSettings.lowStockThreshold||10),url=available?`product.html?color=${encodeURIComponent(colour)}&style=${style}`:`unavailable.html?color=${encodeURIComponent(colour)}&style=${style}`;return `<article class="home-product ${available?'':'is-unavailable'}"><a href="${url}"><div class="image"><img src="${image}" alt="${escapeHTML(`Smooth ${styleLabel} Hairband - ${colour}`)}" loading="lazy">${!available?'<span class="home-stock-chip">Out of stock</span>':low?'<span class="home-stock-chip">Limited stock</span>':''}</div></a><div class="meta"><h3>Smooth ${styleLabel} - ${escapeHTML(colour)}</h3><p>${BF.money(productPrice)}</p>${available?`<button class="add-mini" type="button" aria-label="Add ${escapeHTML(colour)} ${styleLabel} hairband to bag" onclick="BF.addRetail('${colour}',1,'${style}')">Add to Bag</button>`:`<a class="add-mini stock-link" href="${url}">View restock status</a>`}</div></article>`}).join('');
}


/* ==========================================================
   SHOP BY COLOUR
========================================================== */

function renderColourBoxes() {
    const colourBoxes=document.getElementById('colourBoxes'); if(!colourBoxes)return;
    colourBoxes.innerHTML=BF.colors.map(([name,colour])=>{const available=BF.variantAvailable(homeInventory,homeSettings,'flat',name),url=available?`product.html?color=${encodeURIComponent(name)}&style=flat`:`unavailable.html?color=${encodeURIComponent(name)}&style=flat`;return `<a class="colour-box ${available?'':'is-unavailable'}" href="${url}" style="--shade:${colour}"><span class="colour-fill"></span><strong>${escapeHTML(name)}</strong><small>${available?'Shop this shade':'Out of stock · Check back soon'} <i class="fa-solid fa-arrow-right"></i></small></a>`}).join('');
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
    const card=document.getElementById('homepageFeatureCard');
    if(!card)return;
    const image=document.getElementById('homepageFeatureImage'),badge=document.getElementById('homepageFeatureBadge'),eyebrow=document.getElementById('homepageFeatureEyebrow'),title=document.getElementById('homepageFeatureTitle'),copy=document.getElementById('homepageFeatureCopy'),cta=document.getElementById('homepageFeatureCta');
    const stock=tubeTopTotalStock();
    if(stock>0){
        card.href='tube-top.html';card.classList.add('editorial-drop-card');
        image.src='images/new.jpeg';image.alt='Black Spandex Tube Top by Band Factory';
        badge.hidden=false;badge.textContent='NEW · LIMITED';
        eyebrow.textContent='NEW DROP';title.textContent='Spandex Tube Top.';
        copy.textContent='Double lined · Stretchy · Black only · GHS 64';cta.textContent='Shop the top →';
    }else{
        card.href='shop.html?mood=neutral';card.classList.remove('editorial-drop-card');
        image.src='images/edit1.jpg';image.alt='Neutral Band Factory hairbands';badge.hidden=true;
        eyebrow.textContent='THE NEUTRALS';title.textContent='Quiet confidence.';copy.textContent='Black · White · Ash · Nude';cta.textContent='Explore neutrals →';
    }
}

/* ==========================================================
   MAIN HOMEPAGE RENDER
========================================================== */

async function renderHome() {

    try {

        renderColourMarquee();
        applySocialLinks();
        const [settings,inventory,tubeTop]=await Promise.all([BF.loadSettings(),BFStore.getDoc('products/smooth',{colors:{},styles:{}}),BFStore.getDoc('products/spandexTubeTop',{name:'Spandex Tube Top',price:64,color:'Black',sizes:{XS:{stock:3,available:true},S:{stock:4,available:true},M:{stock:3,available:true},L:{stock:3,available:true},XL:{stock:3,available:true},'2XL':{stock:3,available:true}}})]);
        homeSettings=settings||{}; homeInventory=inventory||{colors:{},styles:{}}; homeTubeTop=tubeTop||{sizes:{}};
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
