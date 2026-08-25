const cart = BF.getCart();
let checkoutSettings = {};
let landmarkTimer;
let paymentInProgress = false;
let abandonedSaveTimer;
const ATTRIBUTION_KEY='bf_attribution';
const ABANDONED_ID_KEY='bf_abandoned_cart_id';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function itemsSummary(){
  return cart.map(i => i.type === 'wholesale' ? `${i.name}: ${i.summary}` : i.type==='apparel' ? `${i.qty} × ${i.name} · Black · Size ${i.size}` : i.type==='simple' ? `${i.qty} × ${i.name}` : `${i.qty} × ${i.color} ${i.material==='ribbed'?'Ribbed':'Smooth'} ${(i.style||'flat')[0].toUpperCase()+(i.style||'flat').slice(1)} Hairband`).join(' | ');
}

function selectedFulfilment(){
  return $('[name="fulfilment"]:checked')?.value || 'delivery';
}


function selectedCountry(){
  const input = $('#checkoutCountry');
  if(!input) return {name:'Ghana',iso2:'gh'};
  try{
    if(window.jQuery && window.jQuery.fn.countrySelect){
      const data = window.jQuery(input).countrySelect('getSelectedCountryData');
      if(data && data.name) return data;
    }
  }catch{}
  return {name:input.value.trim() || 'Ghana',iso2:($('#checkoutCountryCode')?.value || 'GH').toLowerCase()};
}

function isGhanaDelivery(){
  return (selectedCountry().iso2 || '').toLowerCase() === 'gh';
}

function syncCountryState(){
  const delivery = selectedFulfilment() === 'delivery';
  const country = selectedCountry();
  const ghana = (country.iso2 || '').toLowerCase() === 'gh';
  const codeField = $('#checkoutCountryCode');
  if(codeField) codeField.value = String(country.iso2 || 'gh').toUpperCase();

  $('#ghanaRegionGroup').hidden = !ghana;
  $('#internationalRegionGroup').hidden = ghana;
  $('#internationalPaymentNote').hidden = ghana || !delivery;
  $('#postalOptional').textContent = ghana ? 'Optional in Ghana' : 'Required';
  $('#landmarkHelp').textContent = ghana
    ? 'Suggestions are restricted to Ghana. You can always type the landmark manually.'
    : `Suggestions will match ${country.name || 'your selected country'}. You can always type the landmark manually.`;

  const intlRegion = $('#internationalRegion');
  const postal = $('#postalCode');
  if(intlRegion) intlRegion.required = delivery && !ghana;
  if(postal) postal.required = delivery && !ghana;
  if(ghana){ clearFieldError(intlRegion); clearFieldError(postal); }
  validateForm(false);
}

function setupCountrySelector(){
  const input = $('#checkoutCountry');
  if(!input) return;

  if(window.jQuery && window.jQuery.fn.countrySelect){
    const $country = window.jQuery(input);
    $country.countrySelect({
      defaultCountry:'gh',
      preferredCountries:['gh','ng','gb','us','ca','za','ke']
    });
    $country.on('change countrychange',()=>{
      syncCountryState();
      saveDraft();
    });
  }else{
    input.value = input.value || 'Ghana';
    console.warn('[Band Factory] Country selector library did not load; falling back to a text country field.');
  }
}

function subtotal(){ return BF.cartSubtotal(); }
function deliveryFee(){ return null; }
function processingFee(){ return Math.round(subtotal() * 0.0295 * 100) / 100; }
function grandTotal(){ return Math.round((subtotal() + processingFee()) * 100) / 100; }

function renderSummary(){
  const el = $('#summaryItems');
  if(!cart.length){
    el.innerHTML = '<p>Your Bag is empty. <a href="shop.html" style="color:#f8dce7;text-decoration:underline">Return to the shop</a>.</p>';
  }else{
    el.innerHTML = cart.map(i => `<div class="summary-row"><img src="${i.image}" alt="${i.name}"><p><strong>${i.name}</strong><br><small>${i.type === 'wholesale' ? i.summary : i.type==='apparel' ? `Black · Size ${i.size} × ${i.qty}` : i.type==='simple' ? `Quantity × ${i.qty}` : `${i.color} · ${(i.style||'flat')[0].toUpperCase()+(i.style||'flat').slice(1)} × ${i.qty}`}</small></p><strong>${BF.money(i.price * i.qty)}</strong></div>`).join('');
  }

  $('#summarySubtotal').textContent = BF.money(subtotal());
  $('#summaryProcessingFee').textContent = BF.money(processingFee());
  $('#summaryTotal').textContent = BF.money(grandTotal());
  $('#summaryToggleTotal').textContent = BF.money(grandTotal());
  refreshPaymentButtons();
}

function nextDispatch(settings = {}){
  const now = new Date();
  const dispatchDays = [3, 6]; // Wednesday, Saturday
  for(let d = 0; d < 8; d++){
    const date = new Date(now);
    date.setHours(12,0,0,0);
    date.setDate(now.getDate() + d);
    if(dispatchDays.includes(date.getDay())){
      if(d === 0 && settings.sameDayDispatchOpen === false) continue;
      return date;
    }
  }
  return null;
}

function formatDate(date){
  if(!date) return 'To be confirmed';
  return new Intl.DateTimeFormat('en-GH',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(date);
}

function dateFromInput(value){
  if(!value) return null;
  const [year,month,day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function setPickupMinimumDate(){
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth()+1).padStart(2,'0');
  const d = String(now.getDate()).padStart(2,'0');
  $('#pickupDate').min = `${y}-${m}-${d}`;
}

function updatePickupDateLabel(){
  const value = $('#pickupDate').value;
  const box = $('#pickupDateStatus');
  const date = dateFromInput(value);
  if(!date){
    box.innerHTML = 'Please choose a date.';
    return;
  }
  box.innerHTML = `<i class="fa-regular fa-calendar-check"></i> Your preferred pickup date is <strong>${formatDate(date)}</strong>.`;
}

async function updateDispatch(){
  try{
    checkoutSettings = await BFStore.getDoc('settings/store',{});
  }catch(error){
    console.warn('[Band Factory] Could not load checkout settings; using local defaults.', error);
    checkoutSettings = {};
  }

  const date = nextDispatch(checkoutSettings);
  window.__bfDispatchDate = date;
  $('#dispatchNote').innerHTML = date
    ? `Your order is scheduled for <strong>${formatDate(date)}</strong>.`
    : 'The next dispatch date will be confirmed by Band Factory.';

  const address = checkoutSettings.pickupAddress || BF_CONFIG.pickup.address || 'Pickup address will be confirmed.';
  $('#pickupAddress').textContent = address;
  renderPickupMap();
  renderSummary();
}

function renderPickupMap(){
  const lat = Number(checkoutSettings.pickupLatitude ?? BF_CONFIG.pickup.latitude);
  const lng = Number(checkoutSettings.pickupLongitude ?? BF_CONFIG.pickup.longitude);
  const map = $('#pickupMap');
  if(Number.isFinite(lat) && Number.isFinite(lng)){
    const delta = 0.006;
    const bbox = [lng-delta,lat-delta,lng+delta,lat+delta].join('%2C');
    map.innerHTML = `<iframe title="Band Factory pickup location" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}"></iframe>`;
  }else{
    map.innerHTML = '<div style="height:100%;display:grid;place-items:center;text-align:center;padding:20px;color:#877a80;font-size:11px">Pickup map will appear here once the location coordinates are added in config.js.</div>';
  }
}

function openPickupMap(){
  const lat = Number(checkoutSettings.pickupLatitude ?? BF_CONFIG.pickup.latitude);
  const lng = Number(checkoutSettings.pickupLongitude ?? BF_CONFIG.pickup.longitude);
  const address = checkoutSettings.pickupAddress || BF_CONFIG.pickup.address || '';
  const query = Number.isFinite(lat) && Number.isFinite(lng) ? `${lat},${lng}` : address;
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,'_blank','noopener');
}

async function copyPickupAddress(){
  const address = checkoutSettings.pickupAddress || BF_CONFIG.pickup.address || '';
  if(!address) return BF.toast('Pickup address has not been configured yet.');
  try{
    await navigator.clipboard.writeText(address);
    BF.toast('Pickup address copied.');
  }catch{
    BF.toast(address);
  }
}

function toggleFulfilment(){
  const delivery = selectedFulfilment() === 'delivery';
  $('#deliveryFields').hidden = !delivery;
  $('#pickupFields').hidden = delivery;
  $('#dispatchCard').style.display = delivery ? 'grid' : 'none';

  ['country','city','address'].forEach(name => {
    const field = $(`[name="${name}"]`);
    field.required = delivery;
    if(!delivery) clearFieldError(field);
  });
  $('#pickupDate').required = !delivery;
  if(delivery) clearFieldError($('#pickupDate'));
  syncCountryState();

  renderSummary();
  validateForm(false);
}

function setupAutocomplete(){
  const input = $('#landmarkInput');
  const box = $('#landmarkSuggestions');
  input.addEventListener('input',()=>{
    clearTimeout(landmarkTimer);
    $('[name="landmarkLat"]').value = '';
    $('[name="landmarkLng"]').value = '';
    const q = input.value.trim();
    if(q.length < 3){ box.classList.remove('open'); return; }

    landmarkTimer = setTimeout(async()=>{
      const token = BF_CONFIG.mapboxAccessToken;
      if(!token || token.startsWith('REPLACE_')){
        box.innerHTML = '<div class="suggestion">Location suggestions are unavailable right now. You can type your landmark manually and continue.</div>';
        box.classList.add('open');
        return;
      }
      try{
        const countryCode = String(selectedCountry().iso2 || '').toLowerCase();
        const countryParam = countryCode ? `&country=${encodeURIComponent(countryCode)}` : '';
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${encodeURIComponent(token)}${countryParam}&autocomplete=true&limit=6&language=en`;
        const response = await fetch(url);
        if(!response.ok) throw new Error('Mapbox request failed');
        const data = await response.json();
        box.innerHTML = (data.features||[]).map(f=>`<div class="suggestion" data-name="${String(f.place_name).replace(/"/g,'&quot;')}" data-lng="${f.center[0]}" data-lat="${f.center[1]}">${f.place_name}</div>`).join('') || '<div class="suggestion">No exact match found. You can keep the landmark you typed manually.</div>';
        box.classList.add('open');
        $$('[data-name]',box).forEach(option=>option.onclick=()=>{
          input.value = option.dataset.name;
          $('[name="landmarkLat"]').value = option.dataset.lat;
          $('[name="landmarkLng"]').value = option.dataset.lng;
          box.classList.remove('open');
        });
      }catch(error){
        console.warn('[Band Factory] Landmark suggestions unavailable:',error);
        box.innerHTML = '<div class="suggestion">Suggestions are temporarily unavailable. You can type your landmark manually and continue.</div>';
        box.classList.add('open');
      }
    },350);
  });
  document.addEventListener('click',event=>{ if(!event.target.closest('.autocomplete')) box.classList.remove('open'); });
}

function fieldGroup(field){ return field?.closest('.form-group'); }
function clearFieldError(field){ fieldGroup(field)?.classList.remove('invalid'); }
function markFieldError(field){ fieldGroup(field)?.classList.add('invalid'); }

function fieldIsValid(field){
  if(!field || !field.required) return true;
  if(field.type === 'email') return !field.value.trim() || field.validity.valid;
  return field.value.trim().length > 0;
}

function validateForm(showErrors = true){
  const form = $('#checkoutForm');
  const requiredFields = $$('input[required],select[required],textarea[required]',form).filter(field => {
    if(field.name === 'pickupDate') return selectedFulfilment() === 'pickup';
    if(['country','city','address'].includes(field.name)) return selectedFulfilment() === 'delivery';
    if(['internationalRegion','postalCode'].includes(field.name)) return selectedFulfilment() === 'delivery' && !isGhanaDelivery();
    if(field.name === 'detailsConfirmed') return false;
    return true;
  });

  let valid = cart.length > 0;
  let firstInvalid = null;

  requiredFields.forEach(field=>{
    const okay = fieldIsValid(field);
    if(!okay){
      valid = false;
      firstInvalid ||= field;
      if(showErrors) markFieldError(field);
    }else clearFieldError(field);
  });

  const check = $('[name="detailsConfirmed"]');
  const checkOkay = check.checked;
  if(!checkOkay){
    valid = false;
    firstInvalid ||= check;
    if(showErrors){
      $('#confirmCheck').classList.add('invalid');
      $('#confirmError').style.display = 'block';
    }
  }else{
    $('#confirmCheck').classList.remove('invalid');
    $('#confirmError').style.display = 'none';
  }

  if(showErrors && firstInvalid){
    (firstInvalid.closest('.form-group') || firstInvalid.closest('.confirm-check') || firstInvalid).scrollIntoView({behavior:'smooth',block:'center'});
    setTimeout(()=>firstInvalid.focus?.({preventScroll:true}),350);
  }

  refreshPaymentButtons(valid);
  return valid;
}

function refreshPaymentButtons(valid = null){
  if(valid === null){
    const form = $('#checkoutForm');
    const delivery = selectedFulfilment() === 'delivery';
    valid = cart.length > 0 &&
      $('[name="name"]').value.trim() &&
      (!$('[name="email"]').value.trim() || $('[name="email"]').validity.valid) &&
      $('[name="phone"]').value.trim() &&
      (!delivery || ($('[name="country"]').value.trim() && $('[name="city"]').value.trim() && $('[name="address"]').value.trim() && (isGhanaDelivery() || ($('[name="internationalRegion"]').value.trim() && $('[name="postalCode"]').value.trim())))) &&
      (delivery || $('#pickupDate').value) &&
      $('[name="detailsConfirmed"]').checked;
  }

  const confirmationChecked = $('[name="detailsConfirmed"]')?.checked;
  const text = valid
    ? `Pay ${BF.money(grandTotal())} securely with Paystack`
    : (!confirmationChecked ? 'Tick the confirmation box to pay' : 'Complete your details to pay');
  ['#payButton','#mobilePayButton'].forEach(selector=>{
    const button = $(selector);
    if(!button) return;
    button.disabled = !valid || paymentInProgress || !cart.length;
    $('.pay-label',button).textContent = paymentInProgress ? 'Waiting for payment confirmation…' : text;
  });
}

function setPaymentState(message = '', type = ''){
  ['#paymentState','#mobilePaymentState'].forEach(selector=>{
    const el = $(selector);
    if(!el) return;
    el.textContent = message;
    el.className = `payment-state${type ? ` ${type}` : ''}`;
  });
}

function setPaymentLoading(isLoading){
  paymentInProgress = isLoading;
  refreshPaymentButtons();
}

function setPaymentHelp(show = false, reason = ''){
  [['#paymentHelp','#paymentHelpReason'],['#mobilePaymentHelp','#mobilePaymentHelpReason']].forEach(([boxSelector,reasonSelector])=>{
    const box = $(boxSelector);
    const reasonEl = $(reasonSelector);
    if(!box) return;
    box.classList.toggle('show',Boolean(show));
    if(reasonEl && reason) reasonEl.textContent = reason;
  });
}

function paymentTroubleMessage(stage, error){
  if(!navigator.onLine) return 'You appear to be offline. Reconnect to the internet, then try payment again.';
  if(stage === 'paystack') return 'Secure payment could not load in this browser. Try Chrome or Safari, leave any in-app browser, and disable ad/content blockers for this site.';
  if(stage === 'order') return 'We could not prepare your order. Check your connection and try again. Your cart and details are still saved.';
  if(stage === 'stock') return error?.message || 'We could not reserve your items. Please check your connection or review your cart, then try again.';
  if(stage === 'save') return 'We could not save the pending order. Check your connection and try again; you have not been charged.';
  return error?.message || 'Payment could not start. Check your connection and try again; you have not been charged.';
}

function loadPaystackScript(timeoutMs = 9000){
  if(typeof window.PaystackPop === 'function') return Promise.resolve(true);
  return new Promise(resolve=>{
    let settled = false;
    const finish = ok=>{ if(settled) return; settled=true; clearTimeout(timer); resolve(ok); };
    const timer = setTimeout(()=>finish(typeof window.PaystackPop === 'function'), timeoutMs);
    const script=document.createElement('script');
    script.src=`https://js.paystack.co/v2/inline.js?retry=${Date.now()}`;
    script.async=true;
    script.onload=()=>finish(typeof window.PaystackPop === 'function');
    script.onerror=()=>finish(false);
    document.head.appendChild(script);
  });
}

function withTimeout(promise, timeoutMs, message){
  let timer;
  const timeout = new Promise((_,reject)=>{
    timer=setTimeout(()=>reject(new Error(message)),timeoutMs);
  });
  return Promise.race([promise,timeout]).finally(()=>clearTimeout(timer));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000){
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(),timeoutMs);
  try{
    return await fetch(url,{...options,signal:controller.signal});
  }catch(error){
    if(error?.name === 'AbortError') throw new Error('The connection took too long. Please check your internet and try again.');
    throw error;
  }finally{
    clearTimeout(timer);
  }
}

async function ensurePaystackReady(){
  if(typeof window.PaystackPop === 'function') return true;
  setPaymentState('Connecting to secure payment…');
  const ready = await loadPaystackScript();
  if(!ready) throw Object.assign(new Error('Paystack could not load.'),{paymentStage:'paystack'});
  return true;
}

function showPaymentSuccessLoader(){
  const overlay = $('#paymentSuccessOverlay');
  document.body.classList.add('payment-success-loading');
  if(overlay) overlay.setAttribute('aria-hidden','false');
  window.__bfSuccessLoaderStartedAt = Date.now();
}

async function ensureSuccessLoaderMoment(minimumMs = 1600){
  const started = Number(window.__bfSuccessLoaderStartedAt || Date.now());
  const remaining = minimumMs - (Date.now() - started);
  if(remaining > 0){
    await new Promise(resolve => setTimeout(resolve, remaining));
  }
}

function formDataObject(fd){
  return Object.fromEntries(fd.entries());
}


function normalizeCheckoutPhone(value=''){
  let digits=String(value||'').replace(/\D/g,'');
  if(digits.startsWith('0')&&digits.length>=10)digits='233'+digits.slice(1);
  return digits;
}
function paymentEmailFor(fd){
  const actual=String(fd.get('email')||'').trim();if(actual)return actual;
  const phone=normalizeCheckoutPhone(fd.get('phone'))||Date.now();
  return `checkout+${phone}@bandfactory-placeholder.com`;
}
function captureAttribution(){
  let stored={};try{stored=JSON.parse(localStorage.getItem(ATTRIBUTION_KEY)||'{}')}catch{}
  if(stored.capturedAt)return stored;
  const q=new URLSearchParams(location.search),ref=document.referrer||'';let detected='Direct / Unknown';
  const utm=q.get('utm_source');if(utm)detected=utm;
  else if(/tiktok/i.test(ref))detected='TikTok';else if(/instagram/i.test(ref))detected='Instagram';else if(/snapchat/i.test(ref))detected='Snapchat';else if(/wa\.me|whatsapp/i.test(ref))detected='WhatsApp';else if(/google/i.test(ref))detected='Google';else if(ref)detected='Referral';
  stored={detectedSource:detected,utmSource:utm||'',utmMedium:q.get('utm_medium')||'',utmCampaign:q.get('utm_campaign')||'',landingPage:location.pathname+location.search,referrer:ref,capturedAt:new Date().toISOString()};
  localStorage.setItem(ATTRIBUTION_KEY,JSON.stringify(stored));return stored;
}
function attributionData(fd){const a=captureAttribution();return {...a,reportedSource:String(fd.get('reportedSource')||'').trim(),source:String(fd.get('reportedSource')||a.detectedSource||'Direct / Unknown').trim()}}

async function restoreRecoveryCart(){
  const recoveryId=new URLSearchParams(location.search).get('recover');
  if(!recoveryId||!/^CART-[A-Z0-9-]+$/i.test(recoveryId))return;
  try{
    const saved=await BFStore.getDoc(`abandonedCarts/${recoveryId}`,null);
    if(!saved?.items?.length||saved.status==='recovered')return;
    cart.splice(0,cart.length,...saved.items);
    BF.saveCart(cart);
    localStorage.setItem(ABANDONED_ID_KEY,recoveryId);
    sessionStorage.setItem('bf_checkout_draft',JSON.stringify({name:saved.name||'',email:saved.email||'',phone:saved.phone||'',reportedSource:saved.reportedSource||''}));
    BF.toast('Your saved Band Factory bag has been restored.');
  }catch(error){console.warn('[Band Factory] Recovery cart could not be restored.',error)}
}

function abandonedCartId(){let id=localStorage.getItem(ABANDONED_ID_KEY);if(!id){id='CART-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,7).toUpperCase();localStorage.setItem(ABANDONED_ID_KEY,id)}return id}
async function saveAbandonedCartNow(){
  if(paymentInProgress||!cart.length)return;const form=$('#checkoutForm');if(!form)return;const fd=new FormData(form),phone=String(fd.get('phone')||'').trim();if(normalizeCheckoutPhone(phone).length<10)return;
const fulfilment = fd.get('fulfilment') || 'delivery';
const countryCode = String(fd.get('countryCode') || 'GH').toUpperCase();

const id = abandonedCartId();

const data = {
  id,
  status: 'active',

  // Customer
  name: fd.get('name') || '',
  phone,
  email: fd.get('email') || '',

  // Fulfilment
  fulfilment,

  // Delivery details
  country: fulfilment === 'delivery'
    ? (fd.get('country') || 'Ghana')
    : 'Ghana',

  countryCode: fulfilment === 'delivery'
    ? countryCode
    : 'GH',

  isInternational:
    fulfilment === 'delivery'
      ? countryCode !== 'GH'
      : false,

  region:
    fulfilment === 'delivery'
      ? (
          countryCode === 'GH'
            ? (fd.get('region') || '')
            : (fd.get('internationalRegion') || '')
        )
      : '',

  city:
    fulfilment === 'delivery'
      ? (fd.get('city') || '')
      : '',

  address:
    fulfilment === 'delivery'
      ? (fd.get('address') || '')
      : '',

  address2:
    fulfilment === 'delivery'
      ? (fd.get('address2') || '')
      : '',

  postalCode:
    fulfilment === 'delivery'
      ? (fd.get('postalCode') || '')
      : '',

  landmark:
    fulfilment === 'delivery'
      ? (fd.get('landmark') || '')
      : '',

  landmarkLat:
    fulfilment === 'delivery'
      ? (fd.get('landmarkLat') || '')
      : '',

  landmarkLng:
    fulfilment === 'delivery'
      ? (fd.get('landmarkLng') || '')
      : '',

  // Pickup details
  pickupDate:
    fulfilment === 'pickup'
      ? (fd.get('pickupDate') || '')
      : '',

  pickupAddress:
    fulfilment === 'pickup'
      ? (checkoutSettings.pickupAddress || BF_CONFIG.pickup.address || '')
      : '',

  // Other checkout info
  notes: fd.get('notes') || '',

  // Cart
  items: cart,
  itemsSummary: itemsSummary(),
  subtotal: subtotal(),
  processingFee: processingFee(),
  total: grandTotal(),

  ...attributionData(fd),

  updatedAt: new Date().toISOString()
};
    try{await BFStore.setDoc(`abandonedCarts/${id}`,data,true)}catch(e){console.warn('[Band Factory] Could not save abandoned cart.',e)}
}
function queueAbandonedSave(){clearTimeout(abandonedSaveTimer);abandonedSaveTimer=setTimeout(saveAbandonedCartNow,900)}
async function markAbandonedRecovered(orderId){const id=localStorage.getItem(ABANDONED_ID_KEY);if(!id)return;try{await BFStore.setDoc(`abandonedCarts/${id}`,{status:'recovered',orderId,recoveredAt:new Date().toISOString(),updatedAt:new Date().toISOString()},true)}catch(e){console.warn(e)}localStorage.removeItem(ABANDONED_ID_KEY)}


async function trySecureFinalization(order){
  const endpoint=String(BF_CONFIG.secureOrderEndpoint||'').trim();
  if(!endpoint)return false;
  try{
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({order,reference:order.paystackReference})});
    const result=await response.json().catch(()=>({}));
    if(!response.ok||!result.ok)throw new Error(result.error||`Secure verification returned ${response.status}`);
    if(order.abandonedCartId)localStorage.removeItem(ABANDONED_ID_KEY);
    return true;
  }catch(error){
    console.error('[Band Factory] Secure verification/sync unavailable; using compatibility fallback.',error);
    return false;
  }
}

async function deductPurchasedStock(){
  const product = await BFStore.getDoc('products/smooth', {
    colors: {},
    styles: {}
  });

  const styles = JSON.parse(JSON.stringify(product.styles || {}));

  for(const item of cart){
    if(item.type !== 'retail') continue;
    if((item.material || 'smooth') !== 'smooth') continue;

    const style = item.style === 'twisted' ? 'twisted' : 'flat';
    const color = item.color;
    const qty = Number(item.qty || 0);

    if(!color || qty <= 0) continue;

    styles[style] ||= { colors: {} };
    styles[style].colors ||= {};

    const current =
      styles[style].colors[color] ||
      product.colors?.[color] ||
      {};

    const currentStock = Number(current.stock || 0);

    styles[style].colors[color] = {
      ...current,
      stock: Math.max(0, currentStock - qty)
    };
  }

  await BFStore.setDoc('products/smooth', {
    styles,
    colors: styles.flat?.colors || {}
  }, true);
}

async function completeOrder(transaction, fd, orderId){
 const fulfilment = fd.get('fulfilment');
const id = orderId;
  const sub = subtotal(), fee = null, processing = processingFee(), total = grandTotal();
  const pickupDate = fulfilment === 'pickup' ? dateFromInput(fd.get('pickupDate')) : null;
  const order = {
    id,
    name: fd.get('name'),
    email: String(fd.get('email')||'').trim(),
    paymentEmail: paymentEmailFor(fd),
    phone: fd.get('phone'),
    normalizedPhone: normalizeCheckoutPhone(fd.get('phone')),
    ...attributionData(fd),
    fulfilment,
    fulfilmentDate: fulfilment === 'delivery' ? window.__bfDispatchDate?.toISOString() : pickupDate?.toISOString(),
    pickupDate: pickupDate?.toISOString() || '',
    pickupAddress: fulfilment === 'pickup' ? (checkoutSettings.pickupAddress || BF_CONFIG.pickup.address) : '',
    country: fulfilment === 'delivery' ? (fd.get('country') || 'Ghana') : 'Ghana',
    countryCode: fulfilment === 'delivery' ? (fd.get('countryCode') || 'GH') : 'GH',
    isInternational: fulfilment === 'delivery' ? String(fd.get('countryCode') || 'GH').toUpperCase() !== 'GH' : false,
    region: fulfilment === 'delivery' ? ((fd.get('countryCode') || 'GH').toUpperCase() === 'GH' ? (fd.get('region') || '') : (fd.get('internationalRegion') || '')) : '',
    city: fulfilment === 'delivery' ? (fd.get('city') || '') : '',
    address: fulfilment === 'delivery' ? (fd.get('address') || '') : '',
    address2: fulfilment === 'delivery' ? (fd.get('address2') || '') : '',
    postalCode: fulfilment === 'delivery' ? (fd.get('postalCode') || '') : '',
    landmark: fulfilment === 'delivery' ? (fd.get('landmark') || '') : '',
    landmarkLat: fulfilment === 'delivery' ? (fd.get('landmarkLat') || '') : '',
    landmarkLng: fulfilment === 'delivery' ? (fd.get('landmarkLng') || '') : '',
    notes: fd.get('notes') || '',
    items: cart,
    itemsSummary: itemsSummary(),
    subtotal: sub,
    deliveryFee: fee,
    processingFee: processing,
    deliveryFeeStatus: fulfilment === 'delivery' ? 'To be communicated' : 'Not applicable',
    total,
    payment: 'Paid',
    createdAt: new Date().toISOString(),
    paystackReference: transaction.reference || transaction.trxref || '',
    status: 'Preparing',
    type: cart.some(i=>i.type === 'wholesale') ? 'Wholesale' : 'Retail',
    abandonedCartId: localStorage.getItem(ABANDONED_ID_KEY) || ''
  };

  // IMPORTANT: Paystack has already returned success. Save the success payload immediately.
  // This guarantees that Firebase or EmailJS problems can never make a paid customer see a failed-payment screen.
  sessionStorage.setItem('bf_payment_success', JSON.stringify({verifiedClientSuccess:true,createdAt:Date.now(),order}));
  sessionStorage.removeItem('bf_checkout_draft');
  localStorage.removeItem('bf_cart');

setPaymentState(
  'Payment received. Preparing your confirmation and receipt…',
  'success'
);

  
  // Sync Firebase and send confirmation emails, but do not treat those services as payment verification.
  const syncOrder = async()=>{
    if(await trySecureFinalization(order))return;
    // Compatibility fallback: preserve a genuinely paid order if the server function is unreachable.
    // Stock is deliberately NOT changed here because browser-side stock changes are not trusted.
    await BFStore.setDoc(`orders/${id}`, {...order,serverVerified:false,stockSyncStatus:'needs-review'}, false);
    const secondary=[];
    secondary.push(BFStore.add('customers', {name:order.name,email:order.email,phone:order.phone,normalizedPhone:order.normalizedPhone,orderId:id,total:order.total,type:order.type,city:order.city,region:order.region,country:order.country,countryCode:order.countryCode,source:order.source,lastOrderAt:new Date().toISOString()}));
    secondary.push(markAbandonedRecovered(id));
    secondary.push(BFStore.notify('inventory','Stock update needs attention',`Order ${id} was paid while secure stock finalisation was unavailable. Please check this order and inventory.`,{orderId:id}));
    secondary.push(BFStore.notify('purchase','New paid order',`${order.name} placed ${id} for ${BF.money(total)}.`,{orderId:id}));
    secondary.push(BFStore.log('Paid order created',{orderId:id,total,paystackReference:order.paystackReference,source:order.source,serverVerified:false}));
    await Promise.allSettled(secondary);
  };

  const syncResult = await Promise.allSettled([
    syncOrder(),
    BFEmail.sendPurchaseEmails(order)
  ]);

  const firebaseOkay = syncResult[0].status === 'fulfilled';
  const emailOkay = syncResult[1].status === 'fulfilled' && syncResult[1].value?.success !== false;
  order.syncStatus = firebaseOkay ? 'synced' : 'pending';
  order.emailStatus = emailOkay ? 'sent' : 'pending';
  sessionStorage.setItem('bf_payment_success', JSON.stringify({verifiedClientSuccess:true,createdAt:Date.now(),order}));

  if(!firebaseOkay) console.error('[Band Factory] Payment succeeded but Firebase sync needs attention:', syncResult[0].reason);
  if(!emailOkay) console.error('[Band Factory] Payment succeeded but email delivery needs attention:', syncResult[1].reason || syncResult[1].value);

  await ensureSuccessLoaderMoment();
  location.replace('confirmation.html');
}


async function validateCartStock(){
  const [settings,productData,apparelData]=await Promise.all([BFStore.getDoc('settings/store',{}),BFStore.getDoc('products/smooth',{colors:{},styles:{}}),BFStore.getDoc('products/spandexTubeTop',{name:'Spandex Tube Top',price:64,color:'Black',sizes:{XS:{stock:3,available:true},S:{stock:4,available:true},M:{stock:3,available:true},L:{stock:3,available:true},XL:{stock:3,available:true},'2XL':{stock:3,available:true}}})]);
  const remaining={flat:{},twisted:{}};
  const colors=new Set([...(BF.colors||[]).map(x=>x[0]),...Object.keys(productData.colors||{}),...Object.keys(productData.styles?.flat?.colors||{}),...Object.keys(productData.styles?.twisted?.colors||{})]);
  for(const style of ['flat','twisted']) for(const color of colors){
    const d=BF.variantData(productData,style,color);
    remaining[style][color]=BF.variantAvailable(productData,settings,style,color)?Math.max(0,Number(d.stock??0)):0;
  }
  const take=(style,color,qty,label)=>{
    qty=Math.max(0,Number(qty||0));const have=Math.max(0,Number(remaining[style]?.[color]||0));
    if(qty>have) throw new Error(have>0?`Only ${have} ${label} ${have===1?'is':'are'} available right now. Please reduce the quantity in your Bag.`:`${label} is sold out right now. Please remove it from your Bag or choose another colour.`);
    remaining[style][color]=have-qty;
  };
  const takeStandard=(style,qty,label)=>{
    let need=Math.max(0,Number(qty||0));
    const choices=Object.entries(remaining[style]||{}).filter(([,stock])=>stock>0).sort((a,b)=>b[1]-a[1]);
    const total=choices.reduce((sum,[,stock])=>sum+stock,0);
    if(total<need) throw new Error(`${label} is sold out for this quantity. Only ${total} ${style} wholesale pieces are available across all colours right now.`);
    for(const [color,stock] of choices){if(need<=0)break;const used=Math.min(stock,need);remaining[style][color]-=used;need-=used;}
  };
  const apparelRemaining={};for(const [size,data] of Object.entries(apparelData?.sizes||{}))apparelRemaining[String(size).toUpperCase()]=data?.available===false?0:Math.max(0,Number(data?.stock??0));
  for(const item of cart){
    if(item.type==='apparel'&&item.productId==='spandex-tube-top'){const size=String(item.size||'').toUpperCase(),have=Math.max(0,Number(apparelRemaining[size]||0)),need=Math.max(0,Number(item.qty||0));if(need>have)throw new Error(have>0?`Only ${have} Spandex Tube Top${have===1?' is':'s are'} available in size ${size}. Please reduce the quantity in your Bag.`:`Spandex Tube Top size ${size} is sold out. Please remove it from your Bag or choose another size.`);apparelRemaining[size]=have-need;continue;}
    if((item.material||'smooth')!=='smooth')continue;
    if(item.type==='retail'){
      const style=item.style==='twisted'?'twisted':'flat';take(style,item.color,Number(item.qty||0),`${item.color} ${style} hairband`);
    } else if(item.type==='wholesale'){
      const mult=Math.max(1,Number(item.qty||1));
      if(item.wholesaleMode==='custom'&&item.allocations){
        if(item.style==='mixed'){
          for(const style of ['flat','twisted']) for(const [color,qty] of Object.entries(item.allocations?.[style]||{})) take(style,color,Number(qty)*mult,`${color} ${style} hairbands`);
        } else {
          const style=item.style==='twisted'?'twisted':'flat';for(const [color,qty] of Object.entries(item.allocations||{})) take(style,color,Number(qty)*mult,`${color} ${style} hairbands`);
        }
      } else if(item.style==='mixed'){
        takeStandard('flat',Number(item.styleAllocations?.flat||0)*mult,'This Standard Mixed bundle');
        takeStandard('twisted',Number(item.styleAllocations?.twisted||0)*mult,'This Standard Mixed bundle');
      } else {
        const style=item.style==='twisted'?'twisted':'flat';takeStandard(style,Number(item.bundlePieces||0)*mult,`This Standard ${style} bundle`);
      }
    }
  }
  return true;
}

async function reserveOrderId(){
  const response=await fetchWithTimeout('/.netlify/functions/reserve-order-id',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  const result=await response.json().catch(()=>({}));
  if(!response.ok||!/^BF-\d{5,}$/.test(String(result.orderId||''))||!result.token) throw new Error(result.error||'Could not create your order number. Please try again.');
  return {orderId:result.orderId,token:result.token};
}

async function reserveStock(orderId,token){
  const response=await fetchWithTimeout('/.netlify/functions/reserve-stock',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId,token})});
  const result=await response.json().catch(()=>({}));
  if(!response.ok||result.ok!==true) throw new Error(result.error||'That quantity is no longer available. Please review your Bag and try again.');
  return true;
}

async function releaseStock(orderId,token){
  if(!orderId||!token)return;
  try{await fetch('/.netlify/functions/release-stock',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId,token}),keepalive:true});}catch(error){console.warn('[Band Factory] Could not release checkout stock immediately:',error);}
}

async function pay(){
  if(paymentInProgress) return;
  if(!validateForm(true)){
    setPaymentState('Please complete the highlighted details before payment.','warning');
    return;
  }
  if(!cart.length) return;

  const form = $('#checkoutForm');
const fd = new FormData(form);

let orderId = '';
let checkoutToken = '';
let stockReserved = false;
let paymentStage = 'start';
setPaymentHelp(false);

const key = BF_CONFIG.paystackPublicKey;
  if(!key || key.startsWith('REPLACE_')){
    BF.toast('Add your Paystack public key in config.js.');
    return;
  }

  setPaymentLoading(true);
  setPaymentState('Checking current stock…');

  try{
  paymentStage = 'stock';
  await withTimeout(validateCartStock(),15000,'Stock check took too long. Please check your internet and try again.');
  paymentStage = 'order';
  setPaymentState('Creating your order number…');
  const checkoutReservation = await reserveOrderId();
  orderId = checkoutReservation.orderId;
  checkoutToken = checkoutReservation.token;

  paymentStage = 'save';
  setPaymentState('Saving your order…');

  const fulfilment = fd.get('fulfilment');
  const countryCode = String(fd.get('countryCode') || 'GH').toUpperCase();

  const pendingOrder = {
    id: orderId,

    name: fd.get('name'),
    email: String(fd.get('email') || '').trim(),
    paymentEmail: paymentEmailFor(fd),
    phone: fd.get('phone'),
    normalizedPhone: normalizeCheckoutPhone(fd.get('phone')),

    ...attributionData(fd),

    fulfilment,

    fulfilmentDate:
      fulfilment === 'delivery'
        ? window.__bfDispatchDate?.toISOString()
        : '',

    pickupDate:
      fulfilment === 'pickup'
        ? (fd.get('pickupDate') || '')
        : '',

    pickupAddress:
      fulfilment === 'pickup'
        ? (checkoutSettings.pickupAddress || BF_CONFIG.pickup.address)
        : '',

    country:
      fulfilment === 'delivery'
        ? (fd.get('country') || 'Ghana')
        : 'Ghana',

    countryCode:
      fulfilment === 'delivery'
        ? countryCode
        : 'GH',

    isInternational:
      fulfilment === 'delivery'
        ? countryCode !== 'GH'
        : false,

    region:
      fulfilment === 'delivery'
        ? (
            countryCode === 'GH'
              ? (fd.get('region') || '')
              : (fd.get('internationalRegion') || '')
          )
        : '',

    city:
      fulfilment === 'delivery'
        ? (fd.get('city') || '')
        : '',

    address:
      fulfilment === 'delivery'
        ? (fd.get('address') || '')
        : '',

    address2:
      fulfilment === 'delivery'
        ? (fd.get('address2') || '')
        : '',

    postalCode:
      fulfilment === 'delivery'
        ? (fd.get('postalCode') || '')
        : '',

    landmark:
      fulfilment === 'delivery'
        ? (fd.get('landmark') || '')
        : '',

    landmarkLat:
      fulfilment === 'delivery'
        ? (fd.get('landmarkLat') || '')
        : '',

    landmarkLng:
      fulfilment === 'delivery'
        ? (fd.get('landmarkLng') || '')
        : '',

    notes: fd.get('notes') || '',

    items: cart,
    itemsSummary: itemsSummary(),

    subtotal: subtotal(),
    processingFee: processingFee(),
    deliveryFee: null,

    deliveryFeeStatus:
      fulfilment === 'delivery'
        ? 'To be communicated'
        : 'Not applicable',

    total: grandTotal(),

    payment: 'Pending',
    status: 'Awaiting Payment',

    type:
      cart.some(i => i.type === 'wholesale')
        ? 'Wholesale'
        : 'Retail',

    abandonedCartId:
      localStorage.getItem(ABANDONED_ID_KEY) || '',

    createdAt: new Date().toISOString()
  };

  await withTimeout(
    BFStore.setDoc(`orders/${orderId}`,pendingOrder,false),
    15000,
    'Saving your order took too long. Please check your internet and try again.'
  );

  paymentStage = 'stock';
  setPaymentState('Reserving your items…');
  await reserveStock(orderId,checkoutToken);
  stockReserved = true;

  paymentStage = 'paystack';
  setPaymentState('Connecting to Paystack securely…');
  await ensurePaystackReady();
  setPaymentState('Opening Paystack securely…');

  const popup = new window.PaystackPop();
    popup.newTransaction({
      key,
      email: paymentEmailFor(fd),
      amount: Math.round(grandTotal() * 100),
      currency: 'GHS',
      phone: fd.get('phone'),
      firstName: String(fd.get('name')).split(' ')[0],
      ...(String(fd.get('countryCode') || 'GH').toUpperCase() !== 'GH' ? {channels:['card']} : {}),
     metadata:{custom_fields:[
  {
    display_name:'Order ID',
    variable_name:'order_id',
    value:orderId
  },
  {display_name:'Fulfilment',variable_name:'fulfilment',value:fd.get('fulfilment')},        {display_name:'Country',variable_name:'country',value:fd.get('country') || 'Ghana'},
        {display_name:'Payment market',variable_name:'payment_market',value:String(fd.get('countryCode') || 'GH').toUpperCase() === 'GH' ? 'Ghana' : 'International'},
        {display_name:'Customer email',variable_name:'customer_email',value:fd.get('email') || 'Not provided'},
        {display_name:'Customer source',variable_name:'customer_source',value:attributionData(fd).source},
        {display_name:'Order note',variable_name:'order_note',value:fd.get('notes') || 'None'}
      ]},
      onLoad:()=>setPaymentState('Paystack is open. Complete payment in the secure window.'),
      onSuccess:transaction=>{
        showPaymentSuccessLoader();
        setPaymentState('Payment received. Confirming your order…','success');
      completeOrder(transaction,fd,orderId).catch(async error=>{
                  // We are already paid at this point. Preserve the payment reference and still continue to confirmation.
          console.error('[Band Factory] Post-payment processing issue:',error);
          const fallbackOrder = {
  id:orderId,
            ...formDataObject(fd),
            email:String(fd.get('email')||'').trim(),paymentEmail:paymentEmailFor(fd),normalizedPhone:normalizeCheckoutPhone(fd.get('phone')),...attributionData(fd),
            items:cart,
            itemsSummary:itemsSummary(),
            subtotal:subtotal(),processingFee:processingFee(),deliveryFee:null,deliveryFeeStatus:fd.get('fulfilment') === 'delivery' ? 'To be communicated' : 'Not applicable',total:grandTotal(),
            payment:'Paid',paystackReference:transaction.reference || transaction.trxref || '',createdAt:new Date().toISOString(),status:'Preparing',type:cart.some(i=>i.type==='wholesale')?'Wholesale':'Retail',abandonedCartId:localStorage.getItem(ABANDONED_ID_KEY)||'',syncStatus:'pending',emailStatus:'pending'
          };
          sessionStorage.setItem('bf_payment_success',JSON.stringify({verifiedClientSuccess:true,createdAt:Date.now(),order:fallbackOrder}));
          localStorage.removeItem('bf_cart');
          await ensureSuccessLoaderMoment();
          location.replace('confirmation.html');
        });
      },
      onCancel:async()=>{
        if(stockReserved){await releaseStock(orderId,checkoutToken);stockReserved=false;}
        setPaymentLoading(false);
        setPaymentState('Payment wasn’t completed. Your items have been released and your order details are still here.','warning');
        BF.toast('Payment wasn’t completed. Your reserved items were released.');
      },
      onError:async error=>{
        if(stockReserved){await releaseStock(orderId,checkoutToken);stockReserved=false;}
        setPaymentLoading(false);
        const message=paymentTroubleMessage('paystack',error);
        setPaymentState(message,'warning');
        setPaymentHelp(true,message);
        BF.toast('Payment could not open. Troubleshooting steps are shown below.');
      }
    });
  }catch(error){
    console.error(error);
    if(stockReserved){await releaseStock(orderId,checkoutToken);stockReserved=false;}
    setPaymentLoading(false);
    const stage=error?.paymentStage || paymentStage;
    const message=paymentTroubleMessage(stage,error);
    setPaymentState(message,'warning');
    setPaymentHelp(true,message);
    BF.toast('Checkout could not continue. Troubleshooting steps are shown below.');
  }
}

function saveDraft(){
  const form = $('#checkoutForm');
  if(!form) return;
  sessionStorage.setItem('bf_checkout_draft', JSON.stringify(formDataObject(new FormData(form))));
}

function restoreDraft(){
  try{
    const draft = JSON.parse(sessionStorage.getItem('bf_checkout_draft') || '{}');
    Object.entries(draft).forEach(([name,value])=>{
      if(name === 'detailsConfirmed') return;
      const field = $(`[name="${CSS.escape(name)}"]`);
      if(!field) return;
      if(field.type === 'radio'){
        const option = $(`[name="${CSS.escape(name)}"][value="${CSS.escape(value)}"]`);
        if(option) option.checked = true;
      }else field.value = value;
    });
  }catch{}
}

function setupLiveValidation(){
  const form = $('#checkoutForm');
  form.addEventListener('input',event=>{
    if(event.target.matches('.field')) clearFieldError(event.target);
    saveDraft();
    queueAbandonedSave();
    validateForm(false);
  });
  form.addEventListener('change',event=>{
    saveDraft();
    queueAbandonedSave();
    validateForm(false);
  });
}

function setupSummaryToggle(){
  $('#summaryToggle').addEventListener('click',()=>{
    const summary = $('#orderSummary');
    const open = summary.classList.toggle('open');
    $('#summaryToggle').setAttribute('aria-expanded',String(open));
    $('i',$('#summaryToggle')).className = `fa-solid fa-chevron-${open?'up':'down'}`;
  });
}

document.addEventListener('DOMContentLoaded',async()=>{
  captureAttribution();
  await restoreRecoveryCart();
  setupCountrySelector();
  restoreDraft();
  try{
    const draft = JSON.parse(sessionStorage.getItem('bf_checkout_draft') || '{}');
    if(draft.countryCode && window.jQuery && window.jQuery.fn.countrySelect){
      window.jQuery('#checkoutCountry').countrySelect('selectCountry', String(draft.countryCode).toLowerCase());
    }
  }catch{}
  syncCountryState();
  setPickupMinimumDate();
  renderSummary();
  await updateDispatch();
  setupAutocomplete();
  setupLiveValidation();
  setupSummaryToggle();
  toggleFulfilment();
  updatePickupDateLabel();

  $$('[name="fulfilment"]').forEach(input=>input.addEventListener('change',toggleFulfilment));
  $('#pickupDate').addEventListener('change',()=>{updatePickupDateLabel();validateForm(false);});
  $('#openPickupMap').addEventListener('click',openPickupMap);
  $('#copyPickupAddress').addEventListener('click',copyPickupAddress);
  $('#payButton').addEventListener('click',pay);
  $('#mobilePayButton').addEventListener('click',pay);
  document.querySelectorAll('.payment-retry-btn').forEach(button=>button.addEventListener('click',()=>{
    setPaymentHelp(false);
    setPaymentState('Trying secure payment again…');
    pay();
  }));
  window.addEventListener('offline',()=>{
    const message='You are offline. Reconnect to the internet before trying payment.';
    setPaymentState(message,'warning');
    setPaymentHelp(true,message);
  });
  window.addEventListener('online',()=>{
    if(!paymentInProgress){
      setPaymentState('You are back online. You can try payment again.','success');
    }
  });

  validateForm(false);
});
