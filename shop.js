let productData={colors:{}},settings={retailPrice:10,twistedRetailPrice:10,smoothAvailable:true,smoothFlatAvailable:true,smoothTwistedAvailable:true,ribbedAvailable:false,matchingSetsAvailable:false,ribbedPrice:0,smoothSetPrice:0,ribbedSetPrice:0};
let activeStyle='flat';
const families={All:BF.colors.map(c=>c[0]),Neutrals:['Black','White','Gray','Ash','Nude'],Pinks:['Pink','Peach','Burgundy'],Blues:['Blue Black','Ocean Blue','Baby Blue','Royal Blue'],Browns:['Light Brown','Dark Brown','Chocolate Brown'],Greens:['Mint','Army Green']};
const moodMap = {
    neutral: ['Black', 'White', 'Ash', 'Nude'],
    bold: ['Burgundy', 'Royal Blue', 'Mustard', 'Army Green']
};

const colorHex=name=>(BF.colors.find(c=>c[0]===name)||['','#ddd'])[1];
function styleAvailable(){return settings.smoothAvailable!==false && (activeStyle==='flat'?settings.smoothFlatAvailable!==false:settings.smoothTwistedAvailable!==false)}
function isAvailable(c){const d=productData.styles?.[activeStyle]?.colors?.[c]||productData.colors?.[c]||{};return styleAvailable()&&d.available!==false&&Number(d.stock??1)>0}
function price(){return Number(activeStyle==='twisted'?(settings.twistedRetailPrice??settings.retailPrice??10):(settings.retailPrice||10))}
function productUrl(color){return `product.html?color=${encodeURIComponent(color)}&style=${activeStyle}`}
function renderShop(list=families.All){const grid=document.getElementById('productGrid');const items=[...list];const styleName=activeStyle[0].toUpperCase()+activeStyle.slice(1),threshold=Number(settings.lowStockThreshold||10);grid.innerHTML=items.map(color=>{const d=productData.styles?.[activeStyle]?.colors?.[color]||productData.colors?.[color]||{},available=isAvailable(color),stock=Number(d.stock??0),low=available&&stock<=threshold,url=available?productUrl(color):`unavailable.html?color=${encodeURIComponent(color)}&style=${activeStyle}`;return `<article class="product-card ${available?'':'is-unavailable'}"><a href="${url}"><div class="product-media ${activeStyle==='twisted'?'placeholder-media':''}"><img loading="lazy" src="${BF.imageForProduct(activeStyle,color)}" alt="Smooth ${styleName} Hairband in ${color}"><span class="style-corner">${available?(low?'Limited stock':styleName):'Out of stock'}</span>${available?`<button class="quick-add" type="button" aria-label="Add ${color} ${styleName} hairband to bag" onclick="event.preventDefault();BF.addRetail('${color}',1,'${activeStyle}')"><span class="desktop-add">Quick add</span><span class="mobile-add">+</span></button>`:''}</div></a><div class="product-info"><h3>Smooth ${styleName} Hairband - ${color}</h3><div class="product-price"><strong>${BF.money(price())}</strong><i class="mini-swatch" style="background:${colorHex(color)}"></i></div>${available&&low?'<small class="limited-copy">Selling quickly</small>':!available?'<small class="limited-copy">Check restock status</small>':''}</div></article>`}).join('')}
function renderCategoryStatus(){document.getElementById('smoothStatus').textContent=settings.smoothAvailable===false?'Out of Stock':'Retail';document.getElementById('smoothStatus').classList.toggle('available',settings.smoothAvailable!==false);document.getElementById('ribbedStatus').textContent=settings.ribbedAvailable?'Available':'Out of Stock';document.getElementById('ribbedCopy').textContent=settings.ribbedAvailable?'Ribbed Flat and Twisted Hairbands are available.':'Flat and twisted ribbed styles are currently out of stock.';document.getElementById('ribbedBuy').hidden=!(settings.ribbedAvailable&&Number(settings.ribbedPrice)>0);document.getElementById('ribbedPrice').textContent=BF.money(settings.ribbedPrice||0);document.getElementById('matchingStatus').textContent=settings.matchingSetsAvailable?'Available':'Coming Soon';document.getElementById('matchingBuy').hidden=!(settings.matchingSetsAvailable&&(Number(settings.smoothSetPrice)>0||Number(settings.ribbedSetPrice)>0));document.getElementById('smoothSetPrice').textContent=BF.money(settings.smoothSetPrice||0);document.getElementById('ribbedSetPrice').textContent=BF.money(settings.ribbedSetPrice||0);document.getElementById('addSmoothSet').hidden=Number(settings.smoothSetPrice)<=0;document.getElementById('addRibbedSet').hidden=Number(settings.ribbedSetPrice)<=0}
function setStyle(style){activeStyle=style;document.querySelectorAll('.style-btn').forEach(b=>b.classList.toggle('active',b.dataset.style===style));document.getElementById('styleIntro').textContent=style==='flat'?'Classic flat bands in every available shade.':'Twisted-front smooth bands — same colour story, a more sculpted finish.';renderShop(families[document.querySelector('.family-btn.active')?.dataset.family||'All'])}

async function initShop(){
    const params = new URLSearchParams(location.search);

    const requestedStyle = params.get('style');
    const requestedMood = params.get('mood');

    if(requestedStyle === 'twisted'){
        activeStyle = 'twisted';
    }

    [settings,productData] = await Promise.all([
        BFStore.getDoc('settings/store', settings),
        BFStore.getDoc('products/smooth', {colors:{}})
    ]);

    BF.settings = {
        ...BF.settings,
        ...settings
    };

    BF.products.smooth.price = Number(settings.retailPrice || 10);

    renderCategoryStatus();

    /* -----------------------------
       DEFAULT STYLE
    ----------------------------- */

    setStyle(activeStyle);


    /* -----------------------------
       MOOD FILTER FROM HOMEPAGE
    ----------------------------- */

    if(requestedMood && moodMap[requestedMood]){
        renderShop(moodMap[requestedMood]);

        /*
           Remove the active family button because
           this is a custom homepage mood filter.
        */
        document.querySelectorAll('.family-btn').forEach(btn=>{
            btn.classList.remove('active');
        });

        /*
           Optional: change heading/intro so the
           customer knows what collection they opened.
        */
        const intro = document.getElementById('styleIntro');

        if(intro){
            if(requestedMood === 'neutral'){
                intro.textContent =
                    'Quiet, versatile shades made for everyday wear.';
            }

            if(requestedMood === 'bold'){
                intro.textContent =
                    'Rich, standout colours for days that call for more.';
            }
        }
    }


    /* -----------------------------
       OTHER PRODUCT BUTTONS
    ----------------------------- */

    document.getElementById('addRibbed').onclick = () =>
        BF.addSimpleProduct(
            'ribbed',
            'Ribbed Hairband',
            settings.ribbedPrice,
            'images/ribbed-placeholder.svg'
        );

    document.getElementById('addSmoothSet').onclick = () =>
        BF.addSimpleProduct(
            'smooth-set',
            'Smooth Hairband + Basic Top',
            settings.smoothSetPrice,
            'images/b4.jpg'
        );

    document.getElementById('addRibbedSet').onclick = () =>
        BF.addSimpleProduct(
            'ribbed-set',
            'Ribbed Hairband + Basic Top',
            settings.ribbedSetPrice,
            'images/b4.jpg'
        );


    /* -----------------------------
       FLAT / TWISTED SWITCHER
    ----------------------------- */

    document.querySelectorAll('.style-btn').forEach(btn=>{
        btn.onclick = () => setStyle(btn.dataset.style);
    });


    /* -----------------------------
       COLOUR FAMILY BUTTONS
    ----------------------------- */

    document.querySelectorAll('.family-btn').forEach(btn=>{
        btn.onclick = () => {

            document.querySelectorAll('.family-btn').forEach(b=>{
                b.classList.remove('active');
            });

            btn.classList.add('active');

            renderShop(
                families[btn.dataset.family] || families.All
            );
        };
    });
}
document.addEventListener('DOMContentLoaded',initShop);
