let DATA={orders:[],reviews:[],customers:[],subscribers:[],notifications:[],messages:[],activity:[],abandonedCarts:[],settings:{},colors:{},products:{colors:{},styles:{}}};
let loadingDepth=0;

const fmtDate=v=>{
  if(!v)return '—';
  const d=v.toDate?v.toDate():new Date(v);
  return isNaN(d)?'—':new Intl.DateTimeFormat('en-GH',{day:'numeric',month:'short',year:'numeric'}).format(d);
};

function startAdminLoading(label='Working…'){
  loadingDepth++;
  const box=document.getElementById('adminLoading');
  const text=document.getElementById('adminLoadingText');
  if(text)text.textContent=label;
  if(box)box.hidden=false;
}
function stopAdminLoading(){
  loadingDepth=Math.max(0,loadingDepth-1);
  if(loadingDepth===0){
    const box=document.getElementById('adminLoading');
    if(box)box.hidden=true;
  }
}
async function withAdminLoading(task,label='Working…'){
  startAdminLoading(label);
  try{return await task();}
  finally{stopAdminLoading()}
}

function closeSidebar(){
  document.querySelector('.admin-side')?.classList.remove('open');
  document.getElementById('adminSideScreen')?.classList.remove('show');
}
function openSidebar(){
  document.querySelector('.admin-side')?.classList.add('open');
  document.getElementById('adminSideScreen')?.classList.add('show');
}
function toggleSidebar(){
  const side=document.querySelector('.admin-side');
  if(side?.classList.contains('open'))closeSidebar();else openSidebar();
}

function showSection(id){
  document.querySelectorAll('.admin-section').forEach(x=>x.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
  document.querySelectorAll('.admin-nav button').forEach(b=>b.classList.toggle('active',b.dataset.section===id));
  const b=[...document.querySelectorAll('.admin-nav button')].find(btn=>btn.dataset.section===id);
  document.getElementById('pageTitle').textContent=b?(b.querySelector('.nav-label')?.textContent.trim()||b.textContent.trim()):'Admin';
  closeSidebar();
  window.scrollTo({top:0,behavior:'smooth'});
}
window.showSection=showSection;

async function loadAll(){
  return withAdminLoading(async()=>{
    const [orders,reviews,customers,subs,notifs,msgs,activity,abandonedCarts,settings,colors,sequence]=await Promise.all([
      BFStore.list('orders'),BFStore.list('reviews'),BFStore.list('customers'),BFStore.list('subscribers'),
      BFStore.list('notifications'),BFStore.list('messages'),BFStore.list('activity'),BFStore.list('abandonedCarts','updatedAt','desc'),
      BFStore.getDoc('settings/store',{}),BFStore.getDoc('products/smooth',{colors:{}}),BFStore.getDoc('settings/orderSequence',{})
    ]);
    DATA={orders,reviews,customers,subscribers:subs,notifications:notifs,messages:msgs,activity,abandonedCarts,settings,colors:colors.colors||{},products:colors||{colors:{},styles:{}},sequence:sequence||{}};
    await ensureChronologicalOrderIds();
    renderAll();
  },'Loading admin…');
}

function renderAll(){
  renderNavCounts();renderOverview();renderAnalytics();renderOrders();renderPendingPayments();renderTransactions();renderInternationalPayments();renderProducts();renderInventorySummary();renderWholesale();renderReviews();renderCustomers();renderAbandonedCarts();renderSubscribers();renderDelivery();renderMessages();renderNotifications();renderNotificationPopover();renderActivity();renderSettings();
}
function setNavCount(id,count){
  const el=document.getElementById(id);if(!el)return;
  const n=Math.max(0,Number(count)||0);el.textContent=n>99?'99+':n;el.hidden=n===0;
}
function stockFor(style,name){return Number(DATA.products.styles?.[style]?.colors?.[name]?.stock??DATA.colors[name]?.stock??999)}
function lowStockVariantCount(threshold){let count=0;for(const style of ['flat','twisted'])for(const [name] of BF.colors)if(stockFor(style,name)<=threshold)count++;return count}

function renderNavCounts(){
  const paid=DATA.orders.filter(o=>o.payment==='Paid');
  const pendingOrders=paid.filter(o=>!['Delivered','Cancelled'].includes(o.status)).length;
  const pendingReviews=DATA.reviews.filter(r=>r.status==='pending').length;
  const unreadMessages=DATA.messages.filter(m=>(m.status||'new')!=='read').length;
  const unreadNotifications=DATA.notifications.filter(n=>!n.read).length;
  const threshold=Number(DATA.settings.lowStockThreshold||10);
  const lowStock=lowStockVariantCount(threshold);
  const abandoned=DATA.abandonedCarts.filter(c=>!['recovered','dismissed'].includes(String(c.status||'active').toLowerCase())&&(Date.now()-orderDate({createdAt:c.updatedAt||c.createdAt}).getTime())>=30*60000).length;
  const internationalNeedsCheck=DATA.orders.filter(o=>o.payment==='Paid'&&isInternationalOrder(o)&&o.serverVerified===false).length;
  setNavCount('ordersNavCount',pendingOrders);setNavCount('reviewsNavCount',pendingReviews);setNavCount('messagesNavCount',unreadMessages);setNavCount('notificationsNavCount',unreadNotifications);setNavCount('productsNavCount',lowStock);setNavCount('abandonedNavCount',abandoned);setNavCount('internationalNavCount',internationalNeedsCheck);
  const headerCount=document.getElementById('headerNotifCount');if(headerCount){headerCount.textContent=unreadNotifications>99?'99+':unreadNotifications;headerCount.hidden=unreadNotifications===0}
}

function orderSubtotal(o){
  const hasSubtotal=o?.subtotal!==undefined&&o?.subtotal!==null&&o?.subtotal!=='';
  const subtotal=Number(o?.subtotal);
  if(hasSubtotal&&Number.isFinite(subtotal))return subtotal;
  const total=Number(o?.total||0),fee=Number(o?.processingFee||0);
  return Math.max(0,total-fee);
}
function orderProcessingFee(o){return Math.max(0,Number(o?.processingFee||0))}
function orderCustomerPaid(o){
  const total=Number(o?.total);
  return Number.isFinite(total)&&total>0?total:orderSubtotal(o)+orderProcessingFee(o);
}
function moneyCell(o){
  return `<div class="order-money-cell"><strong>${BF.money(orderSubtotal(o))}</strong><small>Fee ${BF.money(orderProcessingFee(o))} · Paid ${BF.money(orderCustomerPaid(o))}</small></div>`;
}
function titleCase(value){const text=String(value||'');return text?text[0].toUpperCase()+text.slice(1):''}
function allocationRows(map,expected,label,mult=1){
  const rows=Object.entries(map||{}).filter(([,qty])=>Number(qty)>0).map(([color,qty])=>[color,Number(qty)*mult]);
  const actual=rows.reduce((sum,[,qty])=>sum+qty,0),target=Number(expected||0)*mult;
  const ok=target?actual===target:true;
  return `<div class="allocation-group"><div class="allocation-head"><strong>${label}</strong><span class="allocation-check ${ok?'ok':'warn'}">${actual} / ${target||actual} ${ok?'✓':'⚠'}</span></div><div class="allocation-list">${rows.length?rows.map(([color,qty])=>`<div class="allocation-row"><span>${color}</span><strong>${qty}</strong></div>`).join(''):'<p class="empty-allocation">No colour allocation saved.</p>'}</div></div>`;
}
function renderOrderItem(item,index){
  const qty=Math.max(1,Number(item.qty||1)),itemTotal=Number(item.price||0)*qty;
  if(item.type!=='wholesale'){
    const style=titleCase(item.style||'flat');
    return `<article class="order-product-card"><div class="order-product-head"><span class="order-product-number">${index+1}</span><div><strong>${item.name||'Product'}</strong><small>${item.type==='simple'?'Collection item':`${item.color||'No colour'} · ${style}`}</small></div><b>${BF.money(itemTotal)}</b></div><div class="order-product-meta"><span><small>Quantity</small><strong>${qty}</strong></span>${item.type!=='simple'?`<span><small>Style</small><strong>${style}</strong></span><span><small>Colour</small><strong>${item.color||'—'}</strong></span>`:''}<span><small>Unit price</small><strong>${BF.money(item.price||0)}</strong></span></div></article>`;
  }
  const pieces=Number(item.bundlePieces||0),totalPieces=pieces*qty,mode=item.wholesaleMode==='standard'?'Standard mix':'Custom colours',style=item.style||'flat',split=item.styleAllocations||{};
  let allocation='';
  if(item.wholesaleMode==='custom'&&item.allocations){
    if(style==='mixed'){
      allocation=allocationRows(item.allocations.flat,split.flat,'Flat colours',qty)+allocationRows(item.allocations.twisted,split.twisted,'Twisted colours',qty);
    }else allocation=allocationRows(item.allocations,pieces,`${titleCase(style)} colours`,qty);
  }
  const splitText=style==='mixed'?`${Number(split.flat||0)*qty} Flat + ${Number(split.twisted||0)*qty} Twisted`:`${totalPieces} ${titleCase(style)}`;
  return `<article class="order-product-card wholesale-product-card"><div class="order-product-head"><span class="order-product-number">${index+1}</span><div><strong>${item.name||'Wholesale bundle'}</strong><small>${mode}</small></div><b>${BF.money(itemTotal)}</b></div><div class="wholesale-summary-grid"><span><small>Total pieces</small><strong>${totalPieces}</strong></span><span><small>Style split</small><strong>${splitText}</strong></span><span><small>Bundles</small><strong>${qty}</strong></span><span><small>Bundle price</small><strong>${BF.money(item.price||0)}</strong></span></div>${item.wholesaleMode==='custom'?`<details class="colour-breakdown"><summary><span>View colour breakdown</span><i class="fa-solid fa-chevron-down"></i></summary><div class="colour-breakdown-body">${allocation||'<p class="empty-allocation">No colour allocation saved for this bundle.</p>'}</div></details>`:`<div class="standard-mix-note"><i class="fa-solid fa-circle-info"></i><span>Band Factory chooses the colours for this standard mix based on availability.</span></div>`}</article>`;
}

function renderOverview(){
  const paid=numberedOrders('paid');
  const rev=paid.reduce((s,o)=>s+orderSubtotal(o),0);
  const pending=paid.filter(o=>!['Delivered','Cancelled'].includes(o.status)).length;
  const reviewPending=DATA.reviews.filter(r=>r.status==='pending').length;
  const unread=DATA.notifications.filter(n=>!n.read).length;
  const threshold=Number(DATA.settings.lowStockThreshold||10);
  const low=lowStockVariantCount(threshold);
  document.getElementById('statOrders').textContent=paid.length;
  document.getElementById('statRevenue').textContent=BF.money(rev);
  document.getElementById('statPending').textContent=pending;
  document.getElementById('statSubscribers').textContent=DATA.subscribers.filter(s=>s.status!=='inactive').length;
  document.getElementById('todayLabel').textContent=new Intl.DateTimeFormat('en-GH',{weekday:'long',day:'numeric',month:'long'}).format(new Date());
  const headerCount=document.getElementById('headerNotifCount');if(headerCount){headerCount.textContent=unread>99?'99+':unread;headerCount.hidden=unread===0}
  document.getElementById('recentOrders').innerHTML=paid.slice(0,7).map(o=>`<tr onclick="openOrder('${o.id}')" style="cursor:pointer"><td data-label="#">${rowNumberBadge(orderAdminNumber(o))}</td><td data-label="Order"><strong>${orderLabel(o)}</strong></td><td data-label="Customer">${o.name||'—'}</td><td data-label="Net sales">${moneyCell(o)}</td><td data-label="Type">${o.type||'Retail'}</td><td data-label="Status"><span class="badge ${String(o.status).toLowerCase()}">${o.status||'Preparing'}</span></td></tr>`).join('')||'<tr><td colspan="6">No paid orders yet.</td></tr>';
  const a=[];
  if(pending)a.push({text:`${pending} paid order${pending>1?'s':''} still need to be completed`,count:pending,section:'ordersPanel'});
  if(reviewPending)a.push({text:`${reviewPending} review${reviewPending>1?'s are':' is'} waiting for your decision`,count:reviewPending,section:'reviewsPanel'});
  if(low)a.push({text:`${low} colour${low>1?'s are':' is'} running low`,count:low,section:'productsPanel'});
  if(unread)a.push({text:`${unread} notification${unread>1?'s have':' has'} not been read`,count:unread,section:'notificationsPanel'});
  document.getElementById('attentionList').innerHTML=a.length?a.map(x=>`<button type="button" class="attention-item actionable" onclick="showSection('${x.section}')"><i class="fa-solid fa-circle-exclamation"></i><span>${x.text}</span><span class="attention-count">${x.count}</span><i class="fa-solid fa-chevron-right attention-arrow"></i></button>`).join(''):'<div class="attention-item attention-clear"><i class="fa-solid fa-circle-check"></i>Nothing needs your attention right now.</div>';
}


function renderTransactions(){
  const el=document.getElementById('transactionsTable'); if(!el)return;
  const rows=numberedOrders('paid');
  el.innerHTML=rows.map(o=>`<tr onclick="openOrder('${o.id}')" style="cursor:pointer"><td data-label="#">${rowNumberBadge(orderAdminNumber(o))}</td><td data-label="Date">${fmtDate(o.createdAt||o.submittedAt)}</td><td data-label="Order"><strong>${orderLabel(o)}</strong></td><td data-label="Customer">${o.name||'Customer'}</td><td data-label="Subtotal"><strong>${BF.money(orderSubtotal(o))}</strong></td><td data-label="Processing fee">${BF.money(orderProcessingFee(o))}<small class="fee-split">1.95% Paystack + 1% MTN MoMo</small></td><td data-label="Total paid"><strong>${BF.money(orderCustomerPaid(o))}</strong></td></tr>`).join('')||'<tr><td colspan="7">No paid transactions yet.</td></tr>';
}

function isInternationalOrder(o={}){
  if(o.isInternational===true)return true;
  const code=String(o.countryCode||'').trim().toUpperCase();
  if(code)return code!=='GH';
  const country=String(o.country||'').trim().toLowerCase();
  return !!country&&!['ghana','gh'].includes(country);
}
function internationalCountryName(o={}){
  const country=String(o.country||'').trim();
  if(country)return country;
  const code=String(o.countryCode||'').trim().toUpperCase();
  return code||'International';
}
function countryFlag(code=''){
  const value=String(code||'').trim().toUpperCase();
  if(!/^[A-Z]{2}$/.test(value))return '🌍';
  return String.fromCodePoint(...[...value].map(ch=>127397+ch.charCodeAt()));
}
function internationalPaymentState(o={}){
  if(o.serverVerified===true)return {label:'Confirmed',className:'paid',help:'Securely confirmed'};
  if(o.serverVerified===false)return {label:'Check Paystack',className:'pending',help:'Server confirmation needs a check'};
  return {label:'Paid',className:'preparing',help:'Paid order recorded'};
}
function renderInternationalPayments(){
  const table=document.getElementById('internationalPaymentsTable');if(!table)return;
  const all=DATA.orders.filter(o=>o.payment==='Paid'&&isInternationalOrder(o)).sort((a,b)=>orderDate(b)-orderDate(a));
  const countries=[...new Set(all.map(internationalCountryName).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const filter=document.getElementById('internationalCountryFilter');
  if(filter){
    const current=filter.value||'all';
    filter.innerHTML='<option value="all">All countries</option>'+countries.map(name=>`<option value="${name.replace(/"/g,'&quot;')}">${name}</option>`).join('');
    filter.value=countries.includes(current)?current:'all';
  }
  const selected=filter?.value||'all';
  const rows=selected==='all'?all:all.filter(o=>internationalCountryName(o)===selected);
  const total=all.reduce((sum,o)=>sum+orderCustomerPaid(o),0);
  const needsCheck=all.filter(o=>o.serverVerified===false).length;
  const countEl=document.getElementById('internationalOrderCount'),totalEl=document.getElementById('internationalTotal'),countryCountEl=document.getElementById('internationalCountryCount'),reviewEl=document.getElementById('internationalReviewCount');
  if(countEl)countEl.textContent=all.length;
  if(totalEl)totalEl.textContent=BF.money(total);
  if(countryCountEl)countryCountEl.textContent=countries.length;
  if(reviewEl)reviewEl.textContent=needsCheck;

  const countryList=document.getElementById('internationalCountryList');
  if(countryList){
    const stats={};
    all.forEach(o=>{const name=internationalCountryName(o),code=String(o.countryCode||'').toUpperCase();stats[name]||={orders:0,total:0,code};stats[name].orders++;stats[name].total+=orderCustomerPaid(o)});
    countryList.innerHTML=Object.entries(stats).sort((a,b)=>b[1].orders-a[1].orders).map(([name,stat])=>`<button type="button" class="international-country-card" onclick="filterInternationalCountry('${name.replace(/'/g,"\'")}')"><span class="international-flag">${countryFlag(stat.code)}</span><span><strong>${name}</strong><small>${stat.orders} paid order${stat.orders===1?'':'s'}</small></span><b>${BF.money(stat.total)}</b></button>`).join('')||'<div class="empty-help">No international payments yet. When a customer outside Ghana pays successfully, the order will appear here automatically.</div>';
  }

  table.innerHTML=rows.map(o=>{const state=internationalPaymentState(o),country=internationalCountryName(o),flag=countryFlag(o.countryCode);return `<tr onclick="openOrder('${o.id}')" style="cursor:pointer"><td data-label="#">${rowNumberBadge(orderAdminNumber(o))}</td><td data-label="Date">${fmtDate(o.createdAt||o.submittedAt)}</td><td data-label="Order"><strong>${orderLabel(o)}</strong><small class="international-reference">${o.paystackReference||'No reference saved'}</small></td><td data-label="Customer">${o.name||'Customer'}<small>${o.email||o.phone||''}</small></td><td data-label="Country"><span class="country-cell"><i>${flag}</i><strong>${country}</strong></span></td><td data-label="Subtotal"><strong>${BF.money(orderSubtotal(o))}</strong></td><td data-label="Fee recorded">${BF.money(orderProcessingFee(o))}</td><td data-label="Total charged"><strong>${BF.money(orderCustomerPaid(o))}</strong><small>Charged in GHS</small></td><td data-label="Payment check"><span class="badge ${state.className}">${state.label}</span><small>${state.help}</small></td></tr>`}).join('')||`<tr><td colspan="9">${selected==='all'?'No international paid orders yet.':'No paid orders from this country yet.'}</td></tr>`;
}
function filterInternationalCountry(country){
  const filter=document.getElementById('internationalCountryFilter');if(!filter)return;
  filter.value=country;renderInternationalPayments();
  document.getElementById('internationalPaymentsTable')?.closest('.admin-panel')?.scrollIntoView({behavior:'smooth',block:'start'});
}
window.filterInternationalCountry=filterInternationalCountry;


function orderLabel(o={}){return o.displayId||o.id||'—'}
async function ensureChronologicalOrderIds(){
  if(DATA.sequence?.migrated===true)return;
  const rows=[...DATA.orders].sort((a,b)=>orderDate(a)-orderDate(b)||String(a.id).localeCompare(String(b.id)));
  const changes=[];
  rows.forEach((o,index)=>{const displayId=`BF-${String(index+1).padStart(5,'0')}`;o.displayId=displayId;changes.push(BFStore.update('orders',o.id,{displayId}));});
  const existing=Math.max(0,Number(DATA.sequence?.lastNumber||0));
  changes.push(BFStore.setDoc('settings/orderSequence',{lastNumber:Math.max(existing,rows.length),migrated:true},true));
  await Promise.allSettled(changes);DATA.sequence={lastNumber:Math.max(existing,rows.length),migrated:true};
}
function selectedPaidOrderIds(){return [...document.querySelectorAll('.order-select:checked')].map(x=>x.dataset.orderId)}
function syncBatchSelection(){
  const ids=selectedPaidOrderIds(),count=document.getElementById('selectedOrderCount'),button=document.getElementById('printSelectedOrders'),all=document.getElementById('selectAllOrders');
  if(count)count.textContent=`${ids.length} selected`;if(button)button.disabled=!ids.length;
  const boxes=[...document.querySelectorAll('.order-select')];if(all){all.checked=boxes.length>0&&boxes.every(x=>x.checked);all.indeterminate=boxes.some(x=>x.checked)&&!all.checked;}
}

function receiptEscape(value=''){
  return String(value??'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

function packingAddress(o={}){
  if(o.fulfilment==='pickup'){
    return {
      title:'Pickup',
      lines:[
        o.pickupAddress||'Band Factory pickup point',
        o.pickupDate?`Pickup date: ${fmtDate(o.pickupDate)}`:''
      ].filter(Boolean)
    };
  }

  return {
    title:'Delivery',
    lines:[
      o.address,
      o.address2,
      [o.city,o.region].filter(Boolean).join(', '),
      o.postalCode,
      o.country,
      o.landmark?`Landmark: ${o.landmark}`:''
    ].filter(Boolean)
  };
}


/*
 * Older wholesale orders did not always save bundlePieces.
 * This tries several saved fields and finally reads the number
 * from product names such as "10 Piece Smooth Twisted...".
 */
function wholesalePiecesPerBundle(item={}){
  const direct=[
    item.bundlePieces,
    item.pieces,
    item.pieceCount,
    item.quantityPerBundle
  ]
    .map(Number)
    .find(n=>Number.isFinite(n)&&n>0);

  if(direct)return direct;

  const text=`${item.name||''} ${item.summary||''}`;

  const match=text.match(/(\d+)\s*(?:piece|pieces|pcs)\b/i);

  if(match){
    return Number(match[1]);
  }

  // Last fallback: calculate the saved custom allocations.
  if(item.allocations){
    if(item.style==='mixed'){
      return ['flat','twisted'].reduce((total,style)=>{
        return total+Object.values(item.allocations?.[style]||{})
          .reduce((sum,n)=>sum+Number(n||0),0);
      },0);
    }

    return Object.values(item.allocations||{})
      .reduce((sum,n)=>sum+Number(n||0),0);
  }

  return 0;
}


function packingColourBreakdown(item={},qty=1){
  if(item.wholesaleMode!=='custom'||!item.allocations){
    return '';
  }

  if(item.style==='mixed'){
    return ['flat','twisted']
      .map(style=>{
        const colours=Object.entries(item.allocations?.[style]||{})
          .filter(([,amount])=>Number(amount)>0)
          .map(([colour,amount])=>
            `${receiptEscape(colour)} × ${Number(amount)*qty}`
          )
          .join(', ');

        return colours
          ? `<div class="receipt-allocation-row">
               <strong>${receiptEscape(titleCase(style))}:</strong>
               <span>${colours}</span>
             </div>`
          : '';
      })
      .filter(Boolean)
      .join('');
  }

  const colours=Object.entries(item.allocations||{})
    .filter(([,amount])=>Number(amount)>0)
    .map(([colour,amount])=>
      `${receiptEscape(colour)} × ${Number(amount)*qty}`
    )
    .join(', ');

  return colours
    ? `<div class="receipt-allocation-row">
         <strong>Colours:</strong>
         <span>${colours}</span>
       </div>`
    : '';
}


function packingItems(o={}){
  return (o.items||[]).map((item,index)=>{

    const qty=Math.max(1,Number(item.qty||1));
    const unitPrice=Number(item.price||0);
    const lineTotal=unitPrice*qty;

    /*
     * RETAIL / NORMAL PRODUCTS
     */
    if(item.type!=='wholesale'){
      const details=[
        item.color?receiptEscape(item.color):'',
        item.style?receiptEscape(titleCase(item.style)):''
      ].filter(Boolean).join(' · ');

      return `
        <div class="receipt-item">
          <div class="receipt-item-main">
            <span class="receipt-item-number">${index+1}</span>

            <div class="receipt-item-name">
              <strong>${receiptEscape(item.name||'Hairband')}</strong>
              ${details?`<small>${details}</small>`:''}
            </div>
          </div>

          <div class="receipt-item-qty">
            <small>QTY</small>
            <strong>${qty}</strong>
          </div>

          <div class="receipt-item-price">
            <small>AMOUNT</small>
            <strong>${BF.money(lineTotal)}</strong>
          </div>
        </div>
      `;
    }


    /*
     * WHOLESALE
     */
    const piecesPerBundle=wholesalePiecesPerBundle(item);
    const totalPieces=piecesPerBundle*qty;

    const style=item.style==='mixed'
      ? 'Mixed Flat + Twisted'
      : titleCase(item.style||'flat');

    const wholesaleType=item.wholesaleMode==='custom'
      ? 'Custom colours'
      : 'Standard mix';

    let split='';

    if(item.style==='mixed'&&item.styleAllocations){
      const flat=Number(item.styleAllocations.flat||0)*qty;
      const twisted=Number(item.styleAllocations.twisted||0)*qty;

      if(flat||twisted){
        split=`${flat} Flat + ${twisted} Twisted`;
      }
    }

    const colourBreakdown=packingColourBreakdown(item,qty);

    return `
      <div class="receipt-item wholesale-receipt-item">

        <div class="receipt-item-main">
          <span class="receipt-item-number">${index+1}</span>

          <div class="receipt-item-name">
            <strong>${receiptEscape(item.name||'Wholesale bundle')}</strong>

            <small>
              ${receiptEscape(style)}
              ·
              ${receiptEscape(wholesaleType)}
            </small>
          </div>
        </div>

        <div class="receipt-item-qty">
          <small>BUNDLES</small>
          <strong>${qty}</strong>
        </div>

        <div class="receipt-item-price">
          <small>AMOUNT</small>
          <strong>${BF.money(lineTotal)}</strong>
        </div>

        <div class="receipt-wholesale-details">

          <div>
            <small>PIECES PER BUNDLE</small>
            <strong>${piecesPerBundle||'—'}</strong>
          </div>

          <div>
            <small>TOTAL PIECES</small>
            <strong>${totalPieces||'—'}</strong>
          </div>

          <div>
            <small>STYLE</small>
            <strong>${receiptEscape(style)}</strong>
          </div>

          <div>
            <small>TYPE</small>
            <strong>${receiptEscape(wholesaleType)}</strong>
          </div>

        </div>

        ${
          split
            ? `<div class="receipt-detail-note">
                 <strong>Style split:</strong> ${receiptEscape(split)}
               </div>`
            : ''
        }

        ${
          colourBreakdown
            ? `<div class="receipt-colour-box">
                 <small>COLOUR BREAKDOWN</small>
                 ${colourBreakdown}
               </div>`
            : item.wholesaleMode==='standard'
              ? `<div class="receipt-detail-note standard">
                   <strong>Colour selection:</strong>
                   Standard Band Factory colour mix.
                 </div>`
              : ''
        }

      </div>
    `;
  }).join('');
}

function printOrders(ids=[]){

  const orders=ids
    .map(id=>DATA.orders.find(o=>o.id===id))
    .filter(o=>o&&o.payment==='Paid');

  if(!orders.length){
    return BF.toast('Select at least one paid order to print.');
  }


  const pages=orders.map(o=>{

    const delivery=packingAddress(o);

    const deliveryHtml=delivery.lines.length
      ? delivery.lines.map(line=>`<div>${receiptEscape(line)}</div>`).join('')
      : '<div>No delivery address provided</div>';

    const subtotal=orderSubtotal(o);
    const processingFee=orderProcessingFee(o);
    const totalPaid=orderCustomerPaid(o);

    const paymentReference=
      o.paystackReference||
      o.reference||
      o.paymentReference||
      'Not recorded';

    return `
      <section class="print-page">
        <div class="packing-slip">

        <!-- HEADER -->
        <header class="receipt-header">

          <div class="receipt-brand">
            <div class="brand">BΛND FΛCTORY</div>
            <span>ORDER RECEIPT &amp; PACKING SLIP</span>
          </div>

          <div class="receipt-order-number">
            <small>ORDER NUMBER</small>
            <strong>${receiptEscape(orderLabel(o))}</strong>
          </div>

        </header>


        <!-- THANK YOU -->
        <div class="receipt-intro">
          <div>
            <span class="receipt-kicker">THANK YOU FOR YOUR ORDER ♡</span>
            <h1>We've got your order.</h1>
            <p>
              Thank you for shopping with Band Factory.
              Your support means a lot to us.
            </p>
          </div>

          <div class="receipt-status">
            <small>PAYMENT</small>
            <strong>PAID</strong>
            <span>${receiptEscape(o.status||'Preparing')}</span>
          </div>
        </div>


        <!-- BASIC DETAILS -->
        <div class="receipt-info-grid">

          <div class="receipt-info-card">
            <small>CUSTOMER</small>

            <strong>${receiptEscape(o.name||'Customer')}</strong>

            ${
              o.phone
                ? `<span>${receiptEscape(o.phone)}</span>`
                : '<span>No phone provided</span>'
            }

            ${
              o.email
                ? `<span>${receiptEscape(o.email)}</span>`
                : '<span>No email provided</span>'
            }
          </div>


          <div class="receipt-info-card">
            <small>ORDER DETAILS</small>

            <strong>${receiptEscape(orderLabel(o))}</strong>

            <span>
              ${fmtDate(o.createdAt||o.submittedAt)}
            </span>

            <span>
              ${receiptEscape(o.type||'Retail')}
              ·
              ${receiptEscape(o.status||'Preparing')}
            </span>
          </div>

        </div>


        <!-- DELIVERY -->
        <div class="receipt-delivery-card">

          <div class="receipt-section-heading">
            <small>${delivery.title.toUpperCase()} DETAILS</small>
          </div>

          <div class="receipt-delivery-content">

            <strong>${receiptEscape(delivery.title)}</strong>

            ${deliveryHtml}

          </div>

        </div>


        <!-- ITEMS -->
        <section class="receipt-products">

          <div class="receipt-section-title">
            <div>
              <small>ORDER CONTENTS</small>
              <h2>Items in this order</h2>
            </div>

            <span>
              ${(o.items||[]).length}
              item${(o.items||[]).length===1?'':'s'}
            </span>
          </div>


          <div class="receipt-item-head">
            <span>ITEM</span>
            <span>QTY</span>
            <span>AMOUNT</span>
          </div>


          <div class="receipt-items">
            ${
              packingItems(o)||
              '<p class="receipt-empty">No product information was saved for this order.</p>'
            }
          </div>

        </section>


        <!-- TOTALS -->
        <section class="receipt-payment">

          <div class="receipt-payment-reference">

            <small>PAYMENT REFERENCE</small>

            <strong>
              ${receiptEscape(paymentReference)}
            </strong>

            <span>
              Payment confirmed
            </span>

          </div>


          <div class="receipt-totals">

            <div>
              <span>Subtotal</span>
              <strong>${BF.money(subtotal)}</strong>
            </div>

            <div>
              <span>Processing fee</span>
              <strong>${BF.money(processingFee)}</strong>
            </div>

            <div class="receipt-total-paid">
              <span>TOTAL PAID</span>
              <strong>${BF.money(totalPaid)}</strong>
            </div>

          </div>

        </section>


        ${
          o.notes
            ? `
              <section class="receipt-note">

                <small>ORDER NOTE</small>

                <p>
                  ${receiptEscape(o.notes)}
                </p>

              </section>
            `
            : ''
        }


        <!-- FOOTER -->
        <footer class="receipt-footer">

          <div>
            <strong>Thank you for choosing Band Factory ♡</strong>
            <span>
              We appreciate your support and hope you love every piece.
            </span>
          </div>

          <div class="receipt-footer-brand">
            BΛND FΛCTORY
          </div>

        </footer>

        </div>
      </section>
    `;
  }).join('');


  const win=window.open('','_blank');

  if(!win){
    return BF.toast(
      'Please allow pop-ups so the packing slips can open for printing.'
    );
  }


  win.document.write(`
<!doctype html>
<html>

<head>

<meta charset="utf-8">

<title>Band Factory Orders</title>

<style>

@page{
  size:A4;
  margin:0;
}

*{
  box-sizing:border-box;
}

html,
body{
  margin:0;
  padding:0;
}

body{
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Arial,
    sans-serif;

  color:#21191c;
  background:#eee8ea;
  font-size:13px;
}


/* -------------------------
   PAGE
   One order is always exactly one A4 sheet.
   Long receipts are measured and scaled before printing.
------------------------- */

.print-page{
  width:210mm;
  height:297mm;
  margin:0 auto 20px;
  padding:10mm 11mm;
  position:relative;
  overflow:hidden;
  background:#fff;
  page-break-after:always;
  break-after:page;
}

.print-page:last-child{
  page-break-after:auto;
  break-after:auto;
}

.packing-slip{
  width:100%;
  margin:0;
  padding:0;
  background:#fff;
  transform-origin:top left;
}


/* -------------------------
   HEADER
------------------------- */

.receipt-header{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:25px;

  padding-bottom:18px;

  border-bottom:2px solid #261c20;
}

.brand{
  font-size:25px;
  font-weight:900;
  letter-spacing:.14em;
}

.receipt-brand span{
  display:block;
  margin-top:6px;

  font-size:9px;
  font-weight:700;
  letter-spacing:.17em;

  color:#8a747c;
}

.receipt-order-number{
  text-align:right;
}

.receipt-order-number small,
.receipt-info-card>small,
.receipt-section-heading small,
.receipt-section-title small,
.receipt-payment-reference small,
.receipt-note small{
  display:block;

  font-size:9px;
  font-weight:800;
  letter-spacing:.16em;

  color:#987681;
}

.receipt-order-number strong{
  display:block;
  margin-top:5px;

  font-size:20px;
}


/* -------------------------
   INTRO
------------------------- */

.receipt-intro{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:30px;

  padding:18px 0 16px;
}

.receipt-intro h1{
  margin:5px 0 7px;

  font-family:Georgia,serif;
  font-size:30px;
  line-height:1.1;
}

.receipt-intro p{
  margin:0;

  max-width:460px;

  color:#68575e;
  line-height:1.55;
}

.receipt-kicker{
  font-size:9px;
  font-weight:800;
  letter-spacing:.15em;

  color:#ad667d;
}

.receipt-status{
  min-width:115px;

  padding:12px 15px;

  border:1px solid #e9dde1;
  border-radius:11px;

  text-align:center;
}

.receipt-status small{
  display:block;

  font-size:8px;
  font-weight:800;
  letter-spacing:.14em;

  color:#927a82;
}

.receipt-status strong{
  display:block;

  margin:5px 0 3px;

  font-size:16px;
}

.receipt-status span{
  color:#76646a;
  font-size:11px;
}


/* -------------------------
   CUSTOMER
------------------------- */

.receipt-info-grid{
  display:grid;
  grid-template-columns:1fr 1fr;

  gap:12px;

  margin-bottom:12px;
}

.receipt-info-card{
  padding:14px 15px;

  border:1px solid #e6dade;
  border-radius:11px;
}

.receipt-info-card strong{
  display:block;

  margin:7px 0 4px;

  font-size:15px;
}

.receipt-info-card span{
  display:block;

  margin-top:3px;

  color:#514348;

  line-height:1.35;

  overflow-wrap:anywhere;
}


/* -------------------------
   DELIVERY
------------------------- */

.receipt-delivery-card{
  display:grid;
  grid-template-columns:145px 1fr;

  margin-bottom:18px;

  border:1px solid #e6dade;
  border-radius:11px;

  overflow:hidden;
}

.receipt-section-heading{
  padding:15px;

  background:#f8f3f5;
}

.receipt-delivery-content{
  padding:14px 16px;

  line-height:1.45;
}

.receipt-delivery-content strong{
  display:block;

  margin-bottom:4px;
}


/* -------------------------
   ITEMS
------------------------- */

.receipt-products{
  margin-top:5px;
}

.receipt-section-title{
  display:flex;
  align-items:flex-end;
  justify-content:space-between;

  gap:15px;

  margin-bottom:13px;
}

.receipt-section-title h2{
  margin:4px 0 0;

  font-family:Georgia,serif;
  font-size:23px;
}

.receipt-section-title>span{
  font-size:11px;

  color:#806b72;
}

.receipt-item-head{
  display:grid;
  grid-template-columns:minmax(0,1fr) 75px 110px;

  padding:8px 11px;

  border-radius:7px;

  background:#f7f2f4;

  font-size:8px;
  font-weight:800;
  letter-spacing:.14em;

  color:#8a737b;
}

.receipt-item-head span:nth-child(2),
.receipt-item-head span:nth-child(3){
  text-align:right;
}

.receipt-item{
  display:grid;
  grid-template-columns:minmax(0,1fr) 75px 110px;

  column-gap:10px;

  padding:10px 8px;

  border-bottom:1px solid #eee4e7;

  break-inside:avoid;
  page-break-inside:avoid;
}

.receipt-item-main{
  display:flex;
  gap:10px;

  min-width:0;
}

.receipt-item-number{
  display:flex;
  align-items:center;
  justify-content:center;

  flex:0 0 25px;

  width:25px;
  height:25px;

  border-radius:50%;

  background:#f5ecef;

  font-size:10px;
  font-weight:800;
}

.receipt-item-name{
  min-width:0;
}

.receipt-item-name strong{
  display:block;

  font-size:13px;
  line-height:1.35;
}

.receipt-item-name small{
  display:block;

  margin-top:4px;

  color:#7b676e;
}

.receipt-item-qty,
.receipt-item-price{
  text-align:right;
}

.receipt-item-qty small,
.receipt-item-price small{
  display:none;
}

.receipt-item-qty strong,
.receipt-item-price strong{
  font-size:13px;
}


/* WHOLESALE DETAILS */

.receipt-wholesale-details{
  grid-column:1 / -1;

  display:grid;
  grid-template-columns:repeat(4,1fr);

  gap:8px;

  margin:9px 0 0 35px;
}

.receipt-wholesale-details>div{
  padding:9px 10px;

  border-radius:7px;

  background:#faf7f8;
}

.receipt-wholesale-details small{
  display:block;

  font-size:7px;
  font-weight:800;
  letter-spacing:.1em;

  color:#937b84;
}

.receipt-wholesale-details strong{
  display:block;

  margin-top:4px;

  font-size:11px;
}

.receipt-colour-box,
.receipt-detail-note{
  grid-column:1 / -1;

  margin:8px 0 0 35px;

  padding:10px 12px;

  border-left:3px solid #c68198;

  background:#fbf7f8;

  font-size:11px;

  line-height:1.5;
}

.receipt-colour-box>small{
  display:block;

  margin-bottom:6px;

  font-size:8px;
  font-weight:800;
  letter-spacing:.13em;

  color:#987581;
}

.receipt-allocation-row{
  display:flex;

  gap:8px;

  margin-top:3px;
}

.receipt-detail-note.standard{
  color:#67545b;
}

.receipt-empty{
  padding:15px;

  color:#775f68;
}


/* -------------------------
   PAYMENT
------------------------- */

.receipt-payment{
  display:grid;
  grid-template-columns:1fr 260px;

  gap:25px;

  margin-top:16px;
  padding-top:14px;

  border-top:2px solid #2c2024;

  break-inside:avoid;
  page-break-inside:avoid;
}

.receipt-payment-reference strong{
  display:block;

  margin-top:6px;

  font-size:12px;

  overflow-wrap:anywhere;
}

.receipt-payment-reference span{
  display:block;

  margin-top:5px;

  font-size:10px;

  color:#79656c;
}

.receipt-totals>div{
  display:flex;
  align-items:center;
  justify-content:space-between;

  gap:18px;

  padding:6px 0;
}

.receipt-totals span{
  color:#67555c;
}

.receipt-total-paid{
  margin-top:5px;
  padding-top:10px !important;

  border-top:1px solid #dacbd0;
}

.receipt-total-paid span{
  font-size:11px;
  font-weight:800;

  color:#21191c;
}

.receipt-total-paid strong{
  font-size:20px;
}


/* -------------------------
   NOTES
------------------------- */

.receipt-note{
  margin-top:18px;

  padding:12px 14px;

  border-radius:8px;

  background:#f8f3f5;

  break-inside:avoid;
}

.receipt-note p{
  margin:7px 0 0;

  line-height:1.5;
}


/* -------------------------
   FOOTER
------------------------- */

.receipt-footer{
  display:flex;
  align-items:flex-end;
  justify-content:space-between;

  gap:20px;

  margin-top:18px;
  padding-top:10px;

  border-top:1px solid #e2d5da;

  color:#765f67;
}

.receipt-footer strong{
  display:block;

  margin-bottom:4px;

  color:#38292e;
}

.receipt-footer span{
  font-size:10px;
}

.receipt-footer-brand{
  font-size:11px;
  font-weight:900;
  letter-spacing:.13em;

  white-space:nowrap;
}


/* -------------------------
   PRINT
------------------------- */

@media print{

  html,
  body{
    width:210mm;
    margin:0 !important;
    padding:0 !important;
    background:#fff !important;
  }

  .print-page{
    width:210mm;
    height:297mm;
    margin:0 !important;
    padding:10mm 11mm;
    overflow:hidden;
    page-break-after:always;
    break-after:page;
  }

  .print-page:last-child{
    page-break-after:auto;
    break-after:auto;
  }

  .packing-slip{
    margin:0;
    box-shadow:none;
  }

}

</style>

</head>

<body>

${pages}

<script>
function fitPackingSlipsToOnePage(){
  document.querySelectorAll('.print-page').forEach(page=>{
    const slip=page.querySelector('.packing-slip');
    if(!slip)return;

    // Always measure the receipt at its natural size first.
    slip.style.transform='none';

    const availableWidth=page.clientWidth
      - parseFloat(getComputedStyle(page).paddingLeft||0)
      - parseFloat(getComputedStyle(page).paddingRight||0);
    const availableHeight=page.clientHeight
      - parseFloat(getComputedStyle(page).paddingTop||0)
      - parseFloat(getComputedStyle(page).paddingBottom||0);

    const naturalWidth=Math.max(slip.scrollWidth,1);
    const naturalHeight=Math.max(slip.scrollHeight,1);
    const scale=Math.min(1,availableWidth/naturalWidth,availableHeight/naturalHeight);

    if(scale<1){
      // Transform affects print visually without changing document flow.
      // This guarantees the complete order remains inside this A4 sheet.
      slip.style.transform='scale('+scale+')';
    }
  });
}

window.onload=()=>{
  // Give fonts/layout a moment to settle, then fit every order separately.
  setTimeout(()=>{
    fitPackingSlipsToOnePage();
    setTimeout(()=>window.print(),180);
  },250);
};
<\/script>

</body>

</html>
  `);

  win.document.close();
}

window.printOrders=printOrders;

function renderOrders(){
  const q=(document.getElementById('orderSearch')?.value||'').toLowerCase(),f=document.getElementById('orderFilter')?.value||'All';
  const rows=DATA.orders.filter(o=>o.payment==='Paid'&&(f==='All'||o.status===f)&&(`${o.id} ${orderLabel(o)} ${o.name} ${o.email}`.toLowerCase().includes(q))).sort((a,b)=>orderDate(b)-orderDate(a));
  document.getElementById('allOrders').innerHTML=rows.map(o=>`<tr onclick="openOrder('${o.id}')" style="cursor:pointer"><td data-label="Select" onclick="event.stopPropagation()"><input class="order-select" type="checkbox" data-order-id="${o.id}" aria-label="Select ${orderLabel(o)}"></td><td data-label="#">${rowNumberBadge(orderAdminNumber(o))}</td><td data-label="Order"><strong>${orderLabel(o)}</strong></td><td data-label="Customer">${o.name||'—'}<br><small>${o.email||'No email'}</small></td><td data-label="Date">${fmtDate(o.createdAt||o.submittedAt)}</td><td data-label="Net sales">${moneyCell(o)}</td><td data-label="Type">${o.type||'Retail'}</td><td data-label="Payment"><span class="badge paid">${o.payment||'Paid'}</span></td><td data-label="Status"><span class="badge ${String(o.status).toLowerCase()}">${o.status||'Preparing'}</span></td></tr>`).join('')||'<tr><td colspan="9">No matching paid orders.</td></tr>';
  document.querySelectorAll('.order-select').forEach(x=>x.onchange=syncBatchSelection);syncBatchSelection();
}
function renderPendingPayments(){
  const table=document.getElementById('pendingPayments');if(!table)return;
  const rows=DATA.orders.filter(o=>o.payment!=='Paid').sort((a,b)=>orderDate(b)-orderDate(a));
  table.innerHTML=rows.map(o=>`<tr onclick="openOrder('${o.id}')" style="cursor:pointer"><td data-label="#">${rowNumberBadge(orderAdminNumber(o))}</td><td data-label="Order"><strong>${orderLabel(o)}</strong></td><td data-label="Customer">${o.name||'—'}<br><small>${o.phone||o.email||'No contact saved'}</small></td><td data-label="Date">${fmtDate(o.createdAt||o.submittedAt)}</td><td data-label="Total"><strong>${BF.money(orderCustomerPaid(o))}</strong></td><td data-label="Fulfilment">${o.fulfilment==='pickup'?'Pickup':'Delivery'}</td><td data-label="Payment"><span class="badge preparing">${o.payment||'Pending'}</span></td></tr>`).join('')||'<tr><td colspan="7">No pending payments.</td></tr>';
}

function openOrder(id){
  const o=DATA.orders.find(x=>x.id===id);if(!o)return;
  const items=o.items||[],pieceCount=items.reduce((sum,item)=>sum+retailUnits(item),0),itemsHtml=items.map(renderOrderItem).join('');
  document.getElementById('orderDrawer').innerHTML=`
    <div class="order-drawer-head"><span>Order details</span><button class="drawer-close" type="button" onclick="closeOrder()" aria-label="Close order details"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="order-drawer-content">
      <div class="order-title-row"><div><div class="drawer-record-kicker">${o.payment==='Paid'?'Order':'Pending'} ${rowNumberBadge(orderAdminNumber(o))}</div><h2>${orderLabel(o)}</h2><p><strong>${o.name||'Customer'}</strong><br>${o.email||'No email provided'}<br>${o.phone||''}</p></div><div class="order-title-badges"><span class="badge ${o.payment==='Paid'?'paid':'preparing'}">${o.payment||'Pending'}</span><span class="badge ${String(o.status).toLowerCase()}">${o.status||'Awaiting Payment'}</span></div></div>
      <div class="order-quick-summary"><div><small>Products</small><strong>${items.length}</strong></div><div><small>Total pieces</small><strong>${pieceCount}</strong></div><div class="primary"><small>Net sales</small><strong>${BF.money(orderSubtotal(o))}</strong></div></div>
      <div class="drawer-section-label order-products-label">Products ordered</div>
      <div class="order-products-list">${itemsHtml||'<p class="empty-help">No product details were saved for this order.</p>'}</div>
      <div class="order-totals-admin"><div class="order-net-total"><span>Net sales <small>Product amount received; processing fees excluded</small></span><strong>${BF.money(orderSubtotal(o))}</strong></div><p><span>Processing fee</span><strong>${BF.money(orderProcessingFee(o))}</strong></p><p><span>Customer paid</span><strong>${BF.money(orderCustomerPaid(o))}</strong></p></div>
      <div class="order-info-card"><strong>${o.fulfilment==='pickup'?'Pickup':'Delivery'}</strong><p>${o.fulfilmentDate?fmtDate(o.fulfilmentDate):''}${o.address?`<br>${o.address}`:''}${o.address2?`<br>${o.address2}`:''}${o.city?`<br>${o.city}`:''}${o.region?`, ${o.region}`:''}${o.postalCode?` ${o.postalCode}`:''}${o.country?`<br><strong>${o.country}</strong>`:''}${o.landmark?`<br>${o.landmark}`:''}</p></div>
      <div class="customer-contact-card"><strong>Customer source</strong><p>${sourceLabel(o)}</p><small>${o.reportedSource?'Customer selected this at checkout.':'Detected from campaign/referrer where available.'}</small></div>
      <div class="drawer-section-label">Payment confirmation reference</div><div class="payment-reference">${o.paystackReference||'No reference saved'}</div>${o.serverVerified===false?'<p class="field-help"><strong>Please check this order:</strong> the automatic stock update could not be confirmed. Compare the quantities here with your stock count and adjust Inventory if needed.</p>':''}
      ${o.payment==='Paid'?`<div class="admin-field order-status-field"><label>Order status</label><select id="drawerStatus"><option>Preparing</option><option>Ready</option><option>Dispatched</option><option>Delivered</option><option>Cancelled</option></select><p class="field-help">Choose the stage this order has reached, then save.</p></div><div class="drawer-save-row"><button class="small-btn primary" onclick="saveOrderStatus('${o.id}')">Save order status</button><button class="small-btn packing-print-btn" onclick="printOrders(['${o.id}'])"><i class="fa-solid fa-print"></i> Print packing slip</button></div>`:`<div class="settings-explainer"><i class="fa-solid fa-clock"></i><div><strong>Payment is still pending</strong><p>This checkout has been saved for recovery, but it is not a confirmed sale. Fulfilment controls will appear after Paystack confirms payment.</p></div></div>`}
    </div>`;
  if(o.payment==='Paid'&&document.getElementById('drawerStatus'))document.getElementById('drawerStatus').value=o.status||'Preparing';
  document.getElementById('drawerScreen').classList.add('show');document.getElementById('orderDrawer').classList.add('open');
}
window.openOrder=openOrder;
function closeOrder(){document.getElementById('drawerScreen').classList.remove('show');document.getElementById('orderDrawer').classList.remove('open')}
window.closeOrder=closeOrder;
async function saveOrderStatus(id){
  return withAdminLoading(async()=>{const v=document.getElementById('drawerStatus').value;await BFStore.update('orders',id,{status:v});await BFStore.log('Order status updated',{orderId:id,status:v});closeOrder();await loadAll();BF.toast('Order status saved')},'Saving order…');
}
window.saveOrderStatus=saveOrderStatus;

function renderProducts(){
  document.getElementById('retailPrice').value=DATA.settings.retailPrice||10;document.getElementById('twistedRetailPrice').value=DATA.settings.twistedRetailPrice??DATA.settings.retailPrice??10;document.getElementById('lowStockThreshold').value=DATA.settings.lowStockThreshold||10;document.getElementById('smoothAvailable').value=String(DATA.settings.smoothAvailable!==false);document.getElementById('smoothFlatAvailable').value=String(DATA.settings.smoothFlatAvailable!==false);document.getElementById('smoothTwistedAvailable').value=String(DATA.settings.smoothTwistedAvailable!==false);document.getElementById('ribbedAvailable').value=String(DATA.settings.ribbedAvailable===true);document.getElementById('matchingSetsAvailable').value=String(DATA.settings.matchingSetsAvailable===true);document.getElementById('ribbedPrice').value=Number(DATA.settings.ribbedPrice||0)||'';document.getElementById('smoothSetPrice').value=Number(DATA.settings.smoothSetPrice||0)||'';document.getElementById('ribbedSetPrice').value=Number(DATA.settings.ribbedSetPrice||0)||'';
  document.getElementById('colorAdminGrid').innerHTML=BF.colors.map(([n,c])=>{const legacy=DATA.colors[n]||{},flat=DATA.products.styles?.flat?.colors?.[n]||legacy,twisted=DATA.products.styles?.twisted?.colors?.[n]||legacy;return `<article class="color-admin-card"><img src="${BF.imageForColor(n)}" alt="${n}"><div class="body"><div class="color-line"><i class="color-dot" style="background:${c}"></i><strong>${n}</strong></div><div class="admin-field" style="margin-top:10px"><label>Flat stock</label><input class="stock-input" data-stock-style="flat" data-stock-color="${n}" type="number" min="0" value="${flat.stock??100}"></div><label class="availability-check"><input type="checkbox" data-available-style="flat" data-available-color="${n}" ${flat.available===false?'':'checked'}><span>Sell ${n} Flat</span></label><div class="admin-field" style="margin-top:12px"><label>Twisted stock</label><input class="stock-input" data-stock-style="twisted" data-stock-color="${n}" type="number" min="0" value="${twisted.stock??100}"></div><label class="availability-check"><input type="checkbox" data-available-style="twisted" data-available-color="${n}" ${twisted.available===false?'':'checked'}><span>Sell ${n} Twisted</span></label></div></article>`}).join('');
}
async function saveProducts(){
  return withAdminLoading(async()=>{const styles={flat:{colors:{}},twisted:{colors:{}}};BF.colors.forEach(([n])=>{for(const style of ['flat','twisted']){const stock=document.querySelector(`[data-stock-style="${style}"][data-stock-color="${n}"]`),avail=document.querySelector(`[data-available-style="${style}"][data-available-color="${n}"]`);styles[style].colors[n]={stock:Number(stock?.value||0),available:!!avail?.checked}}});const colors=styles.flat.colors;await BFStore.setDoc('products/smooth',{colors,styles});await BFStore.setDoc('settings/store',{retailPrice:Number(document.getElementById('retailPrice').value),twistedRetailPrice:Number(document.getElementById('twistedRetailPrice').value||document.getElementById('retailPrice').value),smoothFlatAvailable:document.getElementById('smoothFlatAvailable').value==='true',smoothTwistedAvailable:document.getElementById('smoothTwistedAvailable').value==='true',lowStockThreshold:Number(document.getElementById('lowStockThreshold').value),smoothAvailable:document.getElementById('smoothAvailable').value==='true',ribbedAvailable:document.getElementById('ribbedAvailable').value==='true',matchingSetsAvailable:document.getElementById('matchingSetsAvailable').value==='true',ribbedPrice:Number(document.getElementById('ribbedPrice').value||0),smoothSetPrice:Number(document.getElementById('smoothSetPrice').value||0),ribbedSetPrice:Number(document.getElementById('ribbedSetPrice').value||0)});await BFStore.log('Product settings updated');BF.toast('Product changes saved');await loadAll()},'Saving product changes…');
}
function renderWholesale(){
  const vals=[[30,'standardWholesale30Price',150,'Standard','wholesale30Price'],[50,'standardWholesale50Price',250,'Standard','wholesale50Price'],[100,'standardWholesale100Price',480,'Standard','wholesale100Price'],[200,'standardWholesale200Price',900,'Standard','wholesale200Price'],[30,'customWholesale30Price',210,'Custom Colour'],[50,'customWholesale50Price',350,'Custom Colour'],[100,'customWholesale100Price',700,'Custom Colour'],[200,'customWholesale200Price',1400,'Custom Colour']];
  document.getElementById('wholesaleFields').innerHTML=vals.map(([p,k,d,label,legacy])=>`<div class="admin-field"><label>${label}: total price for ${p} pieces (GHS)</label><input data-wholesale-key="${k}" type="number" min="0" value="${DATA.settings[k]??(legacy?DATA.settings[legacy]:undefined)??d}"><p class="field-help">This is the full amount the customer pays for the ${p}-piece ${label} bundle.</p></div>`).join('');
}
async function saveWholesale(){
  return withAdminLoading(async()=>{const data={};document.querySelectorAll('[data-wholesale-key]').forEach(i=>data[i.dataset.wholesaleKey]=Number(i.value));await BFStore.setDoc('settings/store',data);await BFStore.log('Wholesale pricing updated',data);BF.toast('Wholesale prices saved');await loadAll()},'Saving wholesale prices…');
}

function renderReviews(){
  document.getElementById('reviewsAdmin').innerHTML=DATA.reviews.length?DATA.reviews.map(r=>`<article class="review-admin-card" data-review-id="${r.id}"><div><div style="color:#e890ae">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div><strong>${r.name} — ${r.city||''}</strong><p>${r.review}</p><small>${r.email||''} · ${r.purchased?'Customer says this was a purchase':'Purchase not confirmed by customer'} · <span class="badge ${r.status}">${r.status}</span></small></div><div class="review-actions">${r.status!=='approved'?`<button class="small-btn pink" onclick="setReview('${r.id}','approved')">Approve & show</button>`:''}${r.status!=='rejected'?`<button class="small-btn" onclick="setReview('${r.id}','rejected')">Reject & hide</button>`:''}<button class="small-btn" onclick="deleteReview('${r.id}')">Delete review</button></div></article>`).join(''):'<p>No reviews yet.</p>';
}
async function setReview(id,status){return withAdminLoading(async()=>{await BFStore.update('reviews',id,{status});await BFStore.log('Review status updated',{reviewId:id,status});await loadAll();BF.toast(status==='approved'?'Review approved':'Review hidden')},status==='approved'?'Approving review…':'Updating review…')}
window.setReview=setReview;
async function deleteReview(id){if(!confirm('Delete this review permanently?'))return;return withAdminLoading(async()=>{await BFStore.remove('reviews',id);await loadAll();BF.toast('Review deleted')},'Deleting review…')}
window.deleteReview=deleteReview;

function normalizePhone(value=''){
  let digits=String(value||'').replace(/\D/g,'');
  if(digits.startsWith('0')&&digits.length>=10)digits='233'+digits.slice(1);
  return digits;
}
function orderDate(o){
  const v=o.createdAt||o.submittedAt||o.lastOrderAt;
  if(!v)return new Date(0);

  const d=v.toDate?v.toDate():new Date(v);
  return isNaN(d)?new Date(0):d;
}

function numberedOrders(paymentState='paid'){
  return DATA.orders
    .filter(o=>paymentState==='paid'
      ? o.payment==='Paid'
      : o.payment!=='Paid'
    )
    .sort((a,b)=>orderDate(b)-orderDate(a));
}

function orderAdminNumber(o={}){
  const label=String(o.displayId||o.id||'');
  const match=label.match(/^BF-(\d+)$/i);

  if(match){
    return Number(match[1]);
  }

  return null;
}

function customerAdminNumber(c={}){
  const rows=customerGroups();
  const index=rows.findIndex(x=>x.key===c.key);
  return index>=0?index+1:null;
}

function rowNumberBadge(value){
  return `<span class="admin-row-number">#${value||'—'}</span>`;
}
function sourceLabel(o={}){
  const raw=o.reportedSource||o.source||o.utmSource||o.detectedSource||'Direct / Unknown';
  const value=String(raw).trim();if(!value)return 'Direct / Unknown';
  return value.replace(/_/g,' ').replace(/\b\w/g,m=>m.toUpperCase());
}
function customerGroups(){
  const grouped={};
  DATA.orders.filter(o=>o.payment==='Paid').sort((a,b)=>orderDate(a)-orderDate(b)).forEach(o=>{
    const phone=normalizePhone(o.phone),email=String(o.email||'').toLowerCase();
    const key=phone?`p:${phone}`:email?`e:${email}`:`n:${String(o.name||'unknown').toLowerCase()}`;
    if(!grouped[key])grouped[key]={key,name:o.name||'Customer',phone:o.phone||'',email:o.email||'',orders:[],spend:0,first:orderDate(o),last:orderDate(o),source:sourceLabel(o),types:new Set()};
    const c=grouped[key];c.orders.push(o);c.spend+=orderSubtotal(o);c.last=orderDate(o)>c.last?orderDate(o):c.last;c.types.add(o.type||'Retail');
    if(!c.email&&o.email)c.email=o.email;if(!c.phone&&o.phone)c.phone=o.phone;
  });
  return Object.values(grouped).sort((a,b)=>b.last-a.last);
}
function renderCustomers(){
  const rows=customerGroups();
  document.getElementById('customersTable').innerHTML=rows.map(c=>`<tr class="customer-row" onclick="openCustomer('${encodeURIComponent(c.key)}')"><td data-label="#">${rowNumberBadge(customerAdminNumber(c))}</td><td><strong>${c.name}</strong><br><small>${c.email||'No email provided'}</small></td><td>${c.phone||'—'}</td><td><span class="badge ${c.orders.length>1?'paid':'preparing'}">${c.orders.length>1?'Returning':'New'}</span></td><td>${c.orders.length}</td><td>${BF.money(c.spend)}</td><td>${c.source}</td><td>${fmtDate(c.last)}</td></tr>`).join('')||'<tr><td colspan="8">No paid customers yet.</td></tr>';
}
function openCustomer(encodedKey){
  const key=decodeURIComponent(encodedKey),c=customerGroups().find(x=>x.key===key);if(!c)return;
  const history=[...c.orders].sort((a,b)=>orderDate(b)-orderDate(a)).map(o=>`<button class="customer-order-card" type="button" onclick="openOrder('${o.id}')"><span><strong>${rowNumberBadge(orderAdminNumber(o))} ${orderLabel(o)}</strong><small>${fmtDate(o.createdAt)} · ${o.status||'Preparing'}</small></span><span class="history-money"><strong>${BF.money(orderSubtotal(o))}</strong><small>Net sales</small></span></button>`).join('');
  document.getElementById('orderDrawer').innerHTML=`<div class="order-drawer-head"><span>Customer profile</span><button class="drawer-close" type="button" onclick="closeOrder()" aria-label="Close customer profile"><i class="fa-solid fa-xmark"></i></button></div><div class="order-drawer-content"><div class="drawer-record-kicker">Customer ${rowNumberBadge(customerAdminNumber(c))}</div><h2>${c.name}</h2><div class="customer-profile-grid"><div><span>Customer status</span><strong>${c.orders.length>1?'Returning customer':'New customer'}</strong></div><div><span>Total orders</span><strong>${c.orders.length}</strong></div><div><span>Lifetime net sales</span><strong>${BF.money(c.spend)}</strong></div><div><span>Average net order</span><strong>${BF.money(c.spend/c.orders.length)}</strong></div></div><div class="customer-contact-card"><strong>Contact</strong><p>${c.phone||'No phone'}<br>${c.email||'No email provided'}</p></div><div class="customer-contact-card"><strong>First known source</strong><p>${c.source}</p><small>This comes from campaign/referrer tracking or the shopper’s checkout answer.</small></div><div class="drawer-section-label">Order history</div><div class="customer-order-history">${history}</div></div>`;
  document.getElementById('drawerScreen').classList.add('show');document.getElementById('orderDrawer').classList.add('open');
}
window.openCustomer=openCustomer;
function renderSubscribers(){document.getElementById('subscriberTable').innerHTML=DATA.subscribers.map(s=>`<tr><td>${s.email}</td><td>${s.name||'—'}</td><td><span class="badge">${s.status==='inactive'?'Unsubscribed':'Subscribed'}</span></td><td>${fmtDate(s.createdAt)}</td></tr>`).join('')||'<tr><td colspan="4">No subscribers yet.</td></tr>'}
async function sendBroadcast(){
  const subject=document.getElementById('broadcastSubject').value.trim(),message=document.getElementById('broadcastMessage').value.trim(),list=DATA.subscribers.filter(s=>s.status!=='inactive'&&s.email);
  if(!subject||!message||!list.length)return BF.toast('Add a subject, a message and at least one active subscriber.');
  if(!confirm(`Send this message to ${list.length} subscriber(s)?`))return;
  return withAdminLoading(async()=>{const button=document.getElementById('sendBroadcast');button.disabled=true;let sent=0;document.getElementById('broadcastProgress').style.width='0%';try{for(const s of list){try{await BFEmail.sendBroadcastToSubscriber({email:s.email,name:s.name||'there',subject,message});sent++}catch(e){console.error(e)}document.getElementById('broadcastProgress').style.width=`${Math.round(sent/list.length*100)}%`;document.getElementById('broadcastStatus').textContent=`Sent ${sent} of ${list.length}`;await new Promise(r=>setTimeout(r,1100))}await BFStore.log('Subscriber broadcast sent',{subject,recipients:sent});BF.toast(`Message sent to ${sent} subscriber${sent===1?'':'s'}`)}finally{button.disabled=false}},'Sending subscriber update…');
}

function renderDelivery(){document.getElementById('pickupAddressAdmin').value=DATA.settings.pickupAddress||BF_CONFIG.pickup.address;document.getElementById('sameDayDispatchOpen').value=String(DATA.settings.sameDayDispatchOpen!==false);document.getElementById('deliveryFeeAdmin').value=DATA.settings.deliveryFee||0}
async function saveDelivery(){return withAdminLoading(async()=>{await BFStore.setDoc('settings/store',{pickupAddress:document.getElementById('pickupAddressAdmin').value,sameDayDispatchOpen:document.getElementById('sameDayDispatchOpen').value==='true',deliveryFee:Number(document.getElementById('deliveryFeeAdmin').value||0)});await BFStore.log('Delivery settings updated');BF.toast('Delivery settings saved');await loadAll()},'Saving delivery settings…')}
function renderMessages(){document.getElementById('messagesList').innerHTML=DATA.messages.length?DATA.messages.map(m=>`<article class="message-card"><div><strong>${m.name||'Customer'}</strong> · ${m.email||''}<p>${m.message||''}</p><small>${fmtDate(m.createdAt)}</small></div><button class="small-btn" onclick="markMessage('${m.id}')" ${m.status==='read'?'disabled':''}>${m.status==='read'?'Read':'Mark as read'}</button></article>`).join(''):'<p>No messages yet.</p>'}
async function markMessage(id){return withAdminLoading(async()=>{await BFStore.update('messages',id,{status:'read'});await loadAll()},'Marking message as read…')}
window.markMessage=markMessage;


function rangeStart(value){
  const now=new Date(),start=new Date(now);
  if(value==='all')return new Date(0);
  if(value==='month'){start.setDate(1);start.setHours(0,0,0,0);return start}
  if(value==='year'){start.setMonth(0,1);start.setHours(0,0,0,0);return start}
  start.setDate(now.getDate()-Number(value||30)+1);start.setHours(0,0,0,0);return start;
}
function retailUnits(item){return item.type==='wholesale'?Number(item.bundlePieces||0)*Number(item.qty||1):Number(item.qty||0)}
function forEachSoldSku(order,cb){
  (order.items||[]).forEach(i=>{
    if(i.type==='retail')cb({style:i.style||'flat',color:i.color,qty:Number(i.qty||0),label:`Smooth ${(i.style||'flat')[0].toUpperCase()+(i.style||'flat').slice(1)}`});
    else if(i.type==='simple')cb({style:'simple',color:'',qty:Number(i.qty||0),label:i.name||'Product'});
    else if(i.type==='wholesale'){
      const mult=Number(i.qty||1);
      if(i.wholesaleMode==='custom'&&i.allocations){
        if(i.style==='mixed') Object.entries(i.allocations).forEach(([style,colors])=>Object.entries(colors||{}).forEach(([color,qty])=>cb({style,color,qty:Number(qty||0)*mult,label:`Wholesale ${style}`})));
        else Object.entries(i.allocations||{}).forEach(([color,qty])=>cb({style:i.style||'flat',color,qty:Number(qty||0)*mult,label:`Wholesale ${i.style||'flat'}`}));
      } else cb({style:i.style||'mixed',color:'Standard mix',qty:Number(i.bundlePieces||0)*mult,label:i.name||'Wholesale bundle'});
    }
  });
}
function renderAnalytics(){
  const el=document.getElementById('analyticsRange');if(!el)return;
  const start=rangeStart(el.value),orders=DATA.orders.filter(o=>o.payment==='Paid'&&orderDate(o)>=start);
  const revenue=orders.reduce((s,o)=>s+orderSubtotal(o),0),units=orders.reduce((s,o)=>s+(o.items||[]).reduce((n,i)=>n+retailUnits(i),0),0);
  document.getElementById('analyticsRevenue').textContent=BF.money(revenue);document.getElementById('analyticsOrders').textContent=orders.length;document.getElementById('analyticsUnits').textContent=units;document.getElementById('analyticsAov').textContent=BF.money(orders.length?revenue/orders.length:0);
  const allCustomers=customerGroups(),periodKeys=new Set(orders.map(o=>normalizePhone(o.phone)||String(o.email||o.name||'').toLowerCase()));
  const returning=allCustomers.filter(c=>periodKeys.has(c.key.slice(2))&&c.orders.length>1).length;
  // More reliable period customer calculation using matching orders.
  const periodCustomers=new Set(orders.map(o=>normalizePhone(o.phone)||String(o.email||o.name||'').toLowerCase()));
  const returningCount=[...periodCustomers].filter(k=>allCustomers.some(c=>(c.key===`p:${k}`||c.key===`e:${k}`||c.key===`n:${k}`)&&c.orders.length>1)).length;
  document.getElementById('analyticsReturning').textContent=`${periodCustomers.size?Math.round(returningCount/periodCustomers.size*100):0}%`;document.getElementById('analyticsNew').textContent=Math.max(0,periodCustomers.size-returningCount);
  const colours={},items={},sources={},days={};
  orders.forEach(o=>{const day=orderDate(o).toISOString().slice(0,10);days[day]=(days[day]||0)+orderSubtotal(o);const src=sourceLabel(o);sources[src]=(sources[src]||0)+1;forEachSoldSku(o,x=>{if(x.color)colours[x.color]=(colours[x.color]||0)+x.qty;items[x.label]=(items[x.label]||0)+x.qty})});
  renderRankList('bestColours',colours,'units sold');renderRankList('bestItems',items,'units');renderRankList('sourceBreakdown',sources,'orders');renderRevenueBars(days);
}
function renderRankList(id,map,suffix){const el=document.getElementById(id);if(!el)return;const rows=Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,8),max=rows[0]?.[1]||1;el.innerHTML=rows.length?rows.map(([name,value],i)=>`<div class="rank-row"><span class="rank-number">${i+1}</span><div class="rank-copy"><strong>${name}</strong><i style="--rank:${Math.round(value/max*100)}%"></i></div><b>${value} ${suffix}</b></div>`).join(''):'<p class="empty-help">No paid sales in this period yet.</p>'}
function renderRevenueBars(days){const el=document.getElementById('revenueBars');if(!el)return;const rows=Object.entries(days).sort((a,b)=>a[0].localeCompare(b[0])).slice(-14),max=Math.max(1,...rows.map(x=>x[1]));el.innerHTML=rows.length?rows.map(([date,value])=>`<div class="revenue-bar-row"><span>${new Intl.DateTimeFormat('en-GH',{day:'numeric',month:'short'}).format(new Date(date+'T12:00:00'))}</span><i><b style="width:${Math.max(4,value/max*100)}%"></b></i><strong>${BF.money(value)}</strong></div>`).join(''):'<p class="empty-help">No net sales to chart yet.</p>'}
function renderInventorySummary(){
  const el=document.getElementById('inventorySummary');if(!el)return;let total=0,low=0,out=0;const threshold=Number(DATA.settings.lowStockThreshold||10);
  for(const style of ['flat','twisted'])for(const [name] of BF.colors){const stock=Number(DATA.products.styles?.[style]?.colors?.[name]?.stock??DATA.colors[name]?.stock??0);total+=stock;if(stock<=0)out++;else if(stock<=threshold)low++}
  const sold30=DATA.orders.filter(o=>o.payment==='Paid'&&orderDate(o)>=rangeStart('30')).reduce((sum,o)=>sum+(o.items||[]).reduce((n,i)=>n+retailUnits(i),0),0);
  el.innerHTML=`<article class="stat-card"><i class="fa-solid fa-boxes-stacked"></i><span>Total stock</span><strong>${total}</strong><small>Flat + Twisted pieces recorded</small></article><article class="stat-card"><i class="fa-solid fa-triangle-exclamation"></i><span>Low-stock variants</span><strong>${low}</strong><small>At or below your warning level</small></article><article class="stat-card"><i class="fa-solid fa-ban"></i><span>Out of stock</span><strong>${out}</strong><small>Variants with zero pieces</small></article><article class="stat-card"><i class="fa-solid fa-arrow-trend-up"></i><span>Units sold · 30 days</span><strong>${sold30}</strong><small>Use this to plan restocks</small></article>`;
}
function cartAgeText(c){const d=orderDate({createdAt:c.updatedAt||c.createdAt});if(!d.getTime())return 'Recently';const mins=Math.max(0,Math.round((Date.now()-d)/60000));if(mins<60)return `${mins} min ago`;if(mins<1440)return `${Math.floor(mins/60)}h ago`;return `${Math.floor(mins/1440)}d ago`}
function recoveryUrl(c){return `${location.origin}/checkout.html?recover=${encodeURIComponent(c.id)}`}
function recoveryMessage(c){return `Hi ${c.name||'there'}! You left some Band Factory items in your bag (${BF.money(c.total||c.subtotal||0)}). If you still want them, your saved bag is here: ${recoveryUrl(c)}`}
function renderAbandonedCarts(){const el=document.getElementById('abandonedList');if(!el)return;const filter=document.getElementById('abandonedFilter')?.value||'active';let rows=DATA.abandonedCarts.filter(c=>{if(filter==='all')return true;if(filter==='recovered')return c.status==='recovered';const age=Date.now()-orderDate({createdAt:c.updatedAt||c.createdAt}).getTime();return !['recovered','dismissed'].includes(c.status)&&age>=30*60000});el.innerHTML=rows.length?rows.map(c=>`<article class="abandoned-card"><div class="abandoned-main"><div class="abandoned-top"><div><strong>${c.name||'Checkout visitor'}</strong><small>${c.phone||'No phone'}${c.email?` · ${c.email}`:''}</small></div><span class="badge ${c.status==='recovered'?'paid':'preparing'}">${c.status==='recovered'?'Recovered':'Needs follow-up'}</span></div><p>${c.itemsSummary||`${(c.items||[]).length} cart item(s)`}</p><div class="abandoned-meta"><span>${BF.money(c.total||0)}</span><span>${sourceLabel(c)}</span><span>${cartAgeText(c)}</span></div></div><div class="abandoned-actions">${c.phone&&c.status!=='recovered'?`<a class="small-btn primary" target="_blank" rel="noopener" href="https://wa.me/${normalizePhone(c.phone)}?text=${encodeURIComponent(recoveryMessage(c))}"><i class="fa-brands fa-whatsapp"></i> WhatsApp reminder</a>`:''}${c.email&&c.status!=='recovered'?`<button class="small-btn" onclick="sendAbandonedEmail('${c.id}')"><i class="fa-regular fa-envelope"></i> Email reminder</button>`:''}<button class="small-btn" onclick="setAbandonedStatus('${c.id}','${c.status==='recovered'?'active':'dismissed'}')">${c.status==='recovered'?'Mark active':'Dismiss'}</button></div></article>`).join(''):'<div class="empty-help">No carts match this filter. New carts only appear under “Needs follow-up” after 30 minutes without a completed payment.</div>'}
async function sendAbandonedEmail(id){
  const c=DATA.abandonedCarts.find(x=>x.id===id);if(!c?.email)return;
  return withAdminLoading(async()=>{await BFEmail.sendCustomerEmail({toEmail:c.email,toName:c.name||'there',subject:'Your Band Factory bag is still saved',message:`Hi ${c.name||'there'}, you left a few items in your Band Factory bag. If you still want them, your saved bag is ready for you.`,details:`Saved bag value: ${BF.money(c.total||0)}.`,actionText:'Return to my bag',actionUrl:recoveryUrl(c)});await BFStore.update('abandonedCarts',id,{lastReminderAt:new Date().toISOString(),lastReminderChannel:'email'});BF.toast('Recovery email sent')},'Sending recovery email…')
}
window.sendAbandonedEmail=sendAbandonedEmail;
async function setAbandonedStatus(id,status){return withAdminLoading(async()=>{await BFStore.update('abandonedCarts',id,{status});await loadAll()},'Updating cart…')}
window.setAbandonedStatus=setAbandonedStatus;

function notificationRoute(n){
  if(n.type==='purchase')return {section:'ordersPanel',orderId:n.orderId};
  if(n.type==='review')return {section:'reviewsPanel',reviewId:n.reviewId};
  if(n.type==='message')return {section:'messagesPanel'};
  if(n.type==='subscriber')return {section:'subscribersPanel'};
  if(n.type==='inventory')return {section:'productsPanel'};
  return {section:'notificationsPanel'};
}

async function openNotification(id){
  const n=DATA.notifications.find(x=>x.id===id);if(!n)return;
  const route=notificationRoute(n);
  closeNotificationPopover();
  await withAdminLoading(async()=>{if(!n.read){try{await BFStore.update('notifications',id,{read:true});n.read=true}catch(e){console.error(e)}}},'Opening notification…');
  showSection(route.section);
  if(route.orderId)openOrder(route.orderId);
  else if(route.reviewId)requestAnimationFrame(()=>document.querySelector(`[data-review-id="${route.reviewId}"]`)?.scrollIntoView({behavior:'smooth',block:'center'}));
  renderNavCounts();renderNotifications();renderNotificationPopover();renderOverview();
}
window.openNotification=openNotification;

function renderNotifications(){
  const list=document.getElementById('notificationsList');if(!list)return;
  const rows=[...DATA.notifications].sort((a,b)=>orderDate(b)-orderDate(a));
  list.innerHTML=rows.length?rows.map(n=>`<article class="notification-card actionable-notification ${n.read?'':'unread'}" onclick="openNotification('${n.id}')" tabindex="0" role="button"><div class="notification-main"><strong>${n.title}</strong><p>${n.message||''}</p><div class="notification-meta"><small>${fmtDate(n.createdAt)}</small>${n.read?'':'<span class="badge pending">New</span>'}</div></div><i class="fa-solid fa-chevron-right notification-go"></i></article>`).join(''):'<p>No notifications yet.</p>';
}

async function markAll(){return withAdminLoading(async()=>{for(const n of DATA.notifications.filter(x=>!x.read))await BFStore.update('notifications',n.id,{read:true});await loadAll();BF.toast('All notifications marked as read')},'Marking notifications as read…')}

let notificationAutoCloseTimer=null;
let notificationAutoShown=false;

function notificationIcon(type){
  if(type==='purchase')return 'fa-bag-shopping';
  if(type==='review')return 'fa-star';
  if(type==='message')return 'fa-comment-dots';
  if(type==='subscriber')return 'fa-user-plus';
  if(type==='inventory')return 'fa-boxes-stacked';
  return 'fa-bell';
}
function notificationTone(type){return ['purchase','review','message','subscriber','inventory'].includes(type)?type:'default'}
function notificationTime(value){
  if(!value)return 'Recently';
  const date=value?.toDate?value.toDate():new Date(value);if(!date||Number.isNaN(date.getTime()))return 'Recently';
  const seconds=Math.max(0,Math.floor((Date.now()-date.getTime())/1000));
  if(seconds<60)return 'Just now';const minutes=Math.floor(seconds/60);if(minutes<60)return `${minutes}m ago`;
  const hours=Math.floor(minutes/60);if(hours<24)return `${hours}h ago`;const days=Math.floor(hours/24);if(days<7)return `${days}d ago`;return fmtDate(value);
}
function closeNotificationPopover(){
  const popover=document.getElementById('notificationPopover'),button=document.getElementById('headerNotifications');if(!popover)return;
  clearTimeout(notificationAutoCloseTimer);notificationAutoCloseTimer=null;popover.classList.remove('show');popover.setAttribute('aria-hidden','true');button?.setAttribute('aria-expanded','false');
}
function openNotificationPopover({autoClose=false}={}){
  const popover=document.getElementById('notificationPopover'),button=document.getElementById('headerNotifications');if(!popover)return;
  clearTimeout(notificationAutoCloseTimer);notificationAutoCloseTimer=null;renderNotificationPopover();popover.classList.add('show');popover.setAttribute('aria-hidden','false');button?.setAttribute('aria-expanded','true');
  if(autoClose)notificationAutoCloseTimer=setTimeout(closeNotificationPopover,5000);
}
function toggleNotificationPopover(){
  const popover=document.getElementById('notificationPopover');if(!popover)return;
  if(popover.classList.contains('show'))closeNotificationPopover();else openNotificationPopover({autoClose:false});
}
function renderNotificationPopover(){
  const list=document.getElementById('notificationPopoverList'),count=document.getElementById('notificationPopoverCount');if(!list)return;
  const notifications=[...DATA.notifications].sort((a,b)=>orderDate(b)-orderDate(a)),unread=notifications.filter(n=>!n.read).length;
  if(count){count.textContent=unread>99?'99+':String(unread);count.classList.toggle('empty',unread===0)}
  const recent=notifications.slice(0,8);
  if(!recent.length){list.innerHTML='<div class="notification-popover-empty"><div class="notification-empty-icon"><i class="fa-regular fa-bell"></i></div><strong>You\'re all caught up</strong><p>New orders, messages and store updates will appear here.</p></div>';return}
  list.innerHTML=recent.map(n=>`<article class="notification-popover-item ${n.read?'':'unread'}" data-notification-id="${n.id}"><button type="button" class="notification-popover-open" onclick="openNotification('${n.id}')"><span class="notification-popover-icon ${notificationTone(n.type)}"><i class="fa-solid ${notificationIcon(n.type)}"></i></span><span class="notification-popover-copy"><span class="notification-popover-title"><strong>${n.title||'Notification'}</strong>${n.read?'':'<i class="notification-unread-dot"></i>'}</span><span class="notification-popover-message">${n.message||'Tap to view'}</span><small>${notificationTime(n.createdAt)}</small></span></button><button type="button" class="notification-popover-delete" aria-label="Delete notification" title="Delete notification" onclick="deleteAdminNotification('${n.id}',event)"><i class="fa-solid fa-xmark"></i></button></article>`).join('');
}
async function deleteAdminNotification(id,event){
  event?.preventDefault();event?.stopPropagation();const row=document.querySelector(`[data-notification-id="${id}"]`);row?.classList.add('removing');
  try{await BFStore.remove('notifications',id);DATA.notifications=DATA.notifications.filter(n=>n.id!==id);renderNavCounts();renderNotifications();renderNotificationPopover();renderOverview()}
  catch(error){console.error('[Band Factory] Notification could not be deleted:',error);row?.classList.remove('removing');BF.toast('Notification could not be deleted. Please try again.')}
}
window.deleteAdminNotification=deleteAdminNotification;
function setupNotificationPopover(){
  const button=document.getElementById('headerNotifications'),menu=document.getElementById('notificationMenu'),viewAll=document.getElementById('viewAllNotifications');if(!button||!menu)return;
  button.addEventListener('click',event=>{event.stopPropagation();toggleNotificationPopover()});
  menu.addEventListener('click',event=>event.stopPropagation());
  document.addEventListener('click',event=>{if(!menu.contains(event.target))closeNotificationPopover()});
  viewAll?.addEventListener('click',()=>{closeNotificationPopover();showSection('notificationsPanel')});
}
function showNotificationPopoverOnLoad(){
  if(notificationAutoShown||!DATA.notifications.length)return;notificationAutoShown=true;
  setTimeout(()=>openNotificationPopover({autoClose:true}),350);
}

function friendlyActivity(action=''){
  const map={'Product settings updated':'Products and colour settings changed','Wholesale pricing updated':'Wholesale prices changed','Review status updated':'A review decision was saved','Subscriber broadcast sent':'An update was sent to subscribers','Homepage content updated':'Homepage wording changed','Delivery settings updated':'Delivery settings changed','Store settings updated':'Store settings changed','Order status updated':'An order status changed'};
  return map[action]||action;
}
function renderActivity(){document.getElementById('activityList').innerHTML=DATA.activity.length?DATA.activity.map(a=>`<div class="notification-card"><div><strong>${friendlyActivity(a.action)}</strong><br><small>${fmtDate(a.createdAt)}</small></div></div>`).join(''):'<p>No activity recorded yet.</p>'}
function renderSettings(){document.getElementById('storeEmail').value=DATA.settings.storeEmail||BF_CONFIG.emailjs.adminEmail;document.getElementById('instagramUrl').value=DATA.settings.instagramUrl||BF_CONFIG.socials.instagram;document.getElementById('tiktokUrl').value=DATA.settings.tiktokUrl||BF_CONFIG.socials.tiktok;const current=document.getElementById('currentAdminEmail');if(current&&window.__bfAuth?.currentUser)current.textContent=window.__bfAuth.currentUser.email||'Admin'}
async function saveSettings(){return withAdminLoading(async()=>{await BFStore.setDoc('settings/store',{storeEmail:document.getElementById('storeEmail').value,instagramUrl:document.getElementById('instagramUrl').value,tiktokUrl:document.getElementById('tiktokUrl').value});await BFStore.log('Store settings updated');BF.toast('Store settings saved');await loadAll()},'Saving store settings…')}

function authFriendlyError(error){
  const code=String(error?.code||'');
  if(code.includes('wrong-password')||code.includes('invalid-credential'))return 'The current password is incorrect.';
  if(code.includes('email-already-in-use'))return 'That email address is already being used by another account.';
  if(code.includes('invalid-email'))return 'Please enter a valid email address.';
  if(code.includes('weak-password'))return 'Choose a stronger password with at least 6 characters.';
  if(code.includes('too-many-requests'))return 'Too many attempts. Please wait a little and try again.';
  if(code.includes('requires-recent-login'))return 'For security, please sign out, sign back in, then try again.';
  return error?.message||'Something went wrong. Please try again.';
}

function setSecurityMessage(id,message,type=''){
  const el=document.getElementById(id);if(!el)return;el.textContent=message||'';el.className=`security-message${type?` ${type}`:''}`;
}

async function submitAdminEmailChange(event){
  event.preventDefault();
  const form=event.currentTarget,button=form.querySelector('button[type="submit"]');
  const newEmail=document.getElementById('newAdminEmail').value.trim();
  const password=document.getElementById('emailCurrentPassword').value;
  setSecurityMessage('emailSecurityMessage','');button.disabled=true;button.textContent='Sending verification…';
  try{
    await BFStore.requestEmailChange(newEmail,password);
    setSecurityMessage('emailSecurityMessage',`Verification sent to ${newEmail}. Open that email and confirm the change. You can keep using the dashboard meanwhile.`,'success');
    document.getElementById('emailCurrentPassword').value='';
    document.getElementById('newAdminEmail').value='';
  }catch(error){setSecurityMessage('emailSecurityMessage',authFriendlyError(error),'error')}
  finally{button.disabled=false;button.textContent='Send verification link'}
}

async function submitAdminPasswordChange(event){
  event.preventDefault();
  const form=event.currentTarget,button=form.querySelector('button[type="submit"]');
  const current=document.getElementById('passwordCurrentPassword').value;
  const next=document.getElementById('newAdminPassword').value;
  const confirm=document.getElementById('confirmAdminPassword').value;
  setSecurityMessage('passwordSecurityMessage','');
  if(next!==confirm){setSecurityMessage('passwordSecurityMessage','The new passwords do not match.','error');return}
  if(next.length<6){setSecurityMessage('passwordSecurityMessage','Your new password must be at least 6 characters.','error');return}
  button.disabled=true;button.textContent='Updating password…';
  try{
    await BFStore.changePassword(current,next);
    form.reset();
    setSecurityMessage('passwordSecurityMessage','Password updated successfully. You remain signed in on this device.','success');
  }catch(error){setSecurityMessage('passwordSecurityMessage',authFriendlyError(error),'error')}
  finally{button.disabled=false;button.textContent='Update password'}
}

document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){closeSidebar();closeOrder();closeNotificationPopover()}
  if((e.key==='Enter'||e.key===' ')&&e.target.matches('.clickable-stat')){e.preventDefault();showSection(e.target.dataset.go)}
  if((e.key==='Enter'||e.key===' ')&&e.target.matches('.actionable-notification')){e.preventDefault();e.target.click()}
});

document.addEventListener('DOMContentLoaded',()=>{
  BFStore.onAuth(async admin=>{if(!admin){location.href='admin-login.html';return}document.getElementById('profileEmail').textContent=admin.email;document.getElementById('adminName').textContent=admin.name||admin.email;await loadAll();showNotificationPopoverOnLoad()});
  document.getElementById('adminMenu').onclick=toggleSidebar;
  document.getElementById('adminSideClose').onclick=closeSidebar;
  document.getElementById('adminSideScreen').onclick=closeSidebar;
  document.getElementById('drawerScreen').onclick=closeOrder;
  setupNotificationPopover();
  document.querySelectorAll('.admin-nav button').forEach(b=>b.onclick=()=>showSection(b.dataset.section));
  document.querySelectorAll('.clickable-stat').forEach(card=>card.onclick=()=>showSection(card.dataset.go));
  document.getElementById('signOutBtn').onclick=async()=>withAdminLoading(async()=>{await BFStore.signOut();location.href='admin-login.html'},'Signing out…');
  document.getElementById('orderSearch').oninput=renderOrders;document.getElementById('orderFilter').onchange=renderOrders;document.getElementById('selectAllOrders').onchange=e=>{document.querySelectorAll('.order-select').forEach(x=>x.checked=e.target.checked);syncBatchSelection()};document.getElementById('printSelectedOrders').onclick=()=>printOrders(selectedPaidOrderIds());document.getElementById('analyticsRange').onchange=renderAnalytics;document.getElementById('abandonedFilter').onchange=renderAbandonedCarts;const internationalFilter=document.getElementById('internationalCountryFilter');if(internationalFilter)internationalFilter.onchange=renderInternationalPayments;
  document.getElementById('saveProductSettings').onclick=saveProducts;document.getElementById('saveWholesale').onclick=saveWholesale;document.getElementById('sendBroadcast').onclick=sendBroadcast;document.getElementById('saveDelivery').onclick=saveDelivery;document.getElementById('markAllRead').onclick=markAll;document.getElementById('saveSettings').onclick=saveSettings;document.getElementById('changeEmailForm')?.addEventListener('submit',submitAdminEmailChange);document.getElementById('changePasswordForm')?.addEventListener('submit',submitAdminPasswordChange);
});
