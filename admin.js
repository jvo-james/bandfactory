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
    const [orders,reviews,customers,subs,notifs,msgs,activity,abandonedCarts,settings,colors]=await Promise.all([
      BFStore.list('orders'),BFStore.list('reviews'),BFStore.list('customers'),BFStore.list('subscribers'),
      BFStore.list('notifications'),BFStore.list('messages'),BFStore.list('activity'),BFStore.list('abandonedCarts','updatedAt','desc'),
      BFStore.getDoc('settings/store',{}),BFStore.getDoc('products/smooth',{colors:{}})
    ]);
    DATA={orders,reviews,customers,subscribers:subs,notifications:notifs,messages:msgs,activity,abandonedCarts,settings,colors:colors.colors||{},products:colors||{colors:{},styles:{}}};
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
  document.getElementById('recentOrders').innerHTML=paid.slice(0,7).map(o=>`<tr onclick="openOrder('${o.id}')" style="cursor:pointer"><td data-label="#">${rowNumberBadge(orderAdminNumber(o))}</td><td data-label="Order"><strong>${o.id}</strong></td><td data-label="Customer">${o.name||'—'}</td><td data-label="Net sales">${moneyCell(o)}</td><td data-label="Type">${o.type||'Retail'}</td><td data-label="Status"><span class="badge ${String(o.status).toLowerCase()}">${o.status||'Preparing'}</span></td></tr>`).join('')||'<tr><td colspan="6">No paid orders yet.</td></tr>';
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
  el.innerHTML=rows.map(o=>`<tr onclick="openOrder('${o.id}')" style="cursor:pointer"><td data-label="#">${rowNumberBadge(orderAdminNumber(o))}</td><td data-label="Date">${fmtDate(o.createdAt||o.submittedAt)}</td><td data-label="Order"><strong>${o.id}</strong></td><td data-label="Customer">${o.name||'Customer'}</td><td data-label="Subtotal"><strong>${BF.money(orderSubtotal(o))}</strong></td><td data-label="Processing fee">${BF.money(orderProcessingFee(o))}<small class="fee-split">1.95% Paystack + 1% MTN MoMo</small></td><td data-label="Total paid"><strong>${BF.money(orderCustomerPaid(o))}</strong></td></tr>`).join('')||'<tr><td colspan="7">No paid transactions yet.</td></tr>';
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

  table.innerHTML=rows.map(o=>{const state=internationalPaymentState(o),country=internationalCountryName(o),flag=countryFlag(o.countryCode);return `<tr onclick="openOrder('${o.id}')" style="cursor:pointer"><td data-label="#">${rowNumberBadge(orderAdminNumber(o))}</td><td data-label="Date">${fmtDate(o.createdAt||o.submittedAt)}</td><td data-label="Order"><strong>${o.id}</strong><small class="international-reference">${o.paystackReference||'No reference saved'}</small></td><td data-label="Customer">${o.name||'Customer'}<small>${o.email||o.phone||''}</small></td><td data-label="Country"><span class="country-cell"><i>${flag}</i><strong>${country}</strong></span></td><td data-label="Subtotal"><strong>${BF.money(orderSubtotal(o))}</strong></td><td data-label="Fee recorded">${BF.money(orderProcessingFee(o))}</td><td data-label="Total charged"><strong>${BF.money(orderCustomerPaid(o))}</strong><small>Charged in GHS</small></td><td data-label="Payment check"><span class="badge ${state.className}">${state.label}</span><small>${state.help}</small></td></tr>`}).join('')||`<tr><td colspan="9">${selected==='all'?'No international paid orders yet.':'No paid orders from this country yet.'}</td></tr>`;
}
function filterInternationalCountry(country){
  const filter=document.getElementById('internationalCountryFilter');if(!filter)return;
  filter.value=country;renderInternationalPayments();
  document.getElementById('internationalPaymentsTable')?.closest('.admin-panel')?.scrollIntoView({behavior:'smooth',block:'start'});
}
window.filterInternationalCountry=filterInternationalCountry;

function renderOrders(){
  const q=(document.getElementById('orderSearch')?.value||'').toLowerCase(),f=document.getElementById('orderFilter')?.value||'All';
  const rows=DATA.orders
    .filter(o=>o.payment==='Paid'&&(f==='All'||o.status===f)&&(`${o.id} ${o.name} ${o.email}`.toLowerCase().includes(q)))
    .sort((a,b)=>orderDate(b)-orderDate(a));
  document.getElementById('allOrders').innerHTML=rows.map(o=>`<tr onclick="openOrder('${o.id}')" style="cursor:pointer"><td data-label="#">${rowNumberBadge(orderAdminNumber(o))}</td><td data-label="Order"><strong>${o.id}</strong></td><td data-label="Customer">${o.name||'—'}<br><small>${o.email||'No email'}</small></td><td data-label="Date">${fmtDate(o.createdAt||o.submittedAt)}</td><td data-label="Net sales">${moneyCell(o)}</td><td data-label="Type">${o.type||'Retail'}</td><td data-label="Payment"><span class="badge paid">${o.payment||'Paid'}</span></td><td data-label="Status"><span class="badge ${String(o.status).toLowerCase()}">${o.status||'Preparing'}</span></td></tr>`).join('')||'<tr><td colspan="8">No matching paid orders.</td></tr>';
}

function renderPendingPayments(){
  const table=document.getElementById('pendingPayments');if(!table)return;
  const rows=DATA.orders.filter(o=>o.payment!=='Paid').sort((a,b)=>orderDate(b)-orderDate(a));
  table.innerHTML=rows.map(o=>`<tr onclick="openOrder('${o.id}')" style="cursor:pointer"><td data-label="#">${rowNumberBadge(orderAdminNumber(o))}</td><td data-label="Order"><strong>${o.id}</strong></td><td data-label="Customer">${o.name||'—'}<br><small>${o.phone||o.email||'No contact saved'}</small></td><td data-label="Date">${fmtDate(o.createdAt||o.submittedAt)}</td><td data-label="Total"><strong>${BF.money(orderCustomerPaid(o))}</strong></td><td data-label="Fulfilment">${o.fulfilment==='pickup'?'Pickup':'Delivery'}</td><td data-label="Payment"><span class="badge preparing">${o.payment||'Pending'}</span></td></tr>`).join('')||'<tr><td colspan="7">No pending payments.</td></tr>';
}

function openOrder(id){
  const o=DATA.orders.find(x=>x.id===id);if(!o)return;
  const items=o.items||[],pieceCount=items.reduce((sum,item)=>sum+retailUnits(item),0),itemsHtml=items.map(renderOrderItem).join('');
  document.getElementById('orderDrawer').innerHTML=`
    <div class="order-drawer-head"><span>Order details</span><button class="drawer-close" type="button" onclick="closeOrder()" aria-label="Close order details"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="order-drawer-content">
      <div class="order-title-row"><div><div class="drawer-record-kicker">${o.payment==='Paid'?'Order':'Pending'} ${rowNumberBadge(orderAdminNumber(o))}</div><h2>${o.id}</h2><p><strong>${o.name||'Customer'}</strong><br>${o.email||'No email provided'}<br>${o.phone||''}</p></div><div class="order-title-badges"><span class="badge ${o.payment==='Paid'?'paid':'preparing'}">${o.payment||'Pending'}</span><span class="badge ${String(o.status).toLowerCase()}">${o.status||'Awaiting Payment'}</span></div></div>
      <div class="order-quick-summary"><div><small>Products</small><strong>${items.length}</strong></div><div><small>Total pieces</small><strong>${pieceCount}</strong></div><div class="primary"><small>Net sales</small><strong>${BF.money(orderSubtotal(o))}</strong></div></div>
      <div class="drawer-section-label order-products-label">Products ordered</div>
      <div class="order-products-list">${itemsHtml||'<p class="empty-help">No product details were saved for this order.</p>'}</div>
      <div class="order-totals-admin"><div class="order-net-total"><span>Net sales <small>Product amount received; processing fees excluded</small></span><strong>${BF.money(orderSubtotal(o))}</strong></div><p><span>Processing fee</span><strong>${BF.money(orderProcessingFee(o))}</strong></p><p><span>Customer paid</span><strong>${BF.money(orderCustomerPaid(o))}</strong></p></div>
      <div class="order-info-card"><strong>${o.fulfilment==='pickup'?'Pickup':'Delivery'}</strong><p>${o.fulfilmentDate?fmtDate(o.fulfilmentDate):''}${o.address?`<br>${o.address}`:''}${o.address2?`<br>${o.address2}`:''}${o.city?`<br>${o.city}`:''}${o.region?`, ${o.region}`:''}${o.postalCode?` ${o.postalCode}`:''}${o.country?`<br><strong>${o.country}</strong>`:''}${o.landmark?`<br>${o.landmark}`:''}</p></div>
      <div class="customer-contact-card"><strong>Customer source</strong><p>${sourceLabel(o)}</p><small>${o.reportedSource?'Customer selected this at checkout.':'Detected from campaign/referrer where available.'}</small></div>
      <div class="drawer-section-label">Payment confirmation reference</div><div class="payment-reference">${o.paystackReference||'No reference saved'}</div>${o.serverVerified===false?'<p class="field-help"><strong>Please check this order:</strong> the automatic stock update could not be confirmed. Compare the quantities here with your stock count and adjust Inventory if needed.</p>':''}
      ${o.payment==='Paid'?`<div class="admin-field order-status-field"><label>Order status</label><select id="drawerStatus"><option>Preparing</option><option>Ready</option><option>Dispatched</option><option>Delivered</option><option>Cancelled</option></select><p class="field-help">Choose the stage this order has reached, then save.</p></div><div class="drawer-save-row"><button class="small-btn primary" onclick="saveOrderStatus('${o.id}')">Save order status</button></div>`:`<div class="settings-explainer"><i class="fa-solid fa-clock"></i><div><strong>Payment is still pending</strong><p>This checkout has been saved for recovery, but it is not a confirmed sale. Fulfilment controls will appear after Paystack confirms payment.</p></div></div>`}
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
function orderDate(o){const v=o.createdAt||o.submittedAt||o.lastOrderAt;if(!v)return new Date(0);const d=v.toDate?v.toDate():new Date(v);return isNaN(d)?new Date(0):d}

function numberedOrders(paymentState='paid'){
  return DATA.orders
    .filter(o=>paymentState==='paid'?o.payment==='Paid':o.payment!=='Paid')
    .sort((a,b)=>orderDate(b)-orderDate(a));
}
function orderAdminNumber(o={}){
  const rows=numberedOrders(o.payment==='Paid'?'paid':'pending');
  const index=rows.findIndex(x=>x.id===o.id);
  return index>=0?index+1:null;
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
  const history=[...c.orders].sort((a,b)=>orderDate(b)-orderDate(a)).map(o=>`<button class="customer-order-card" type="button" onclick="openOrder('${o.id}')"><span><strong>${rowNumberBadge(orderAdminNumber(o))} ${o.id}</strong><small>${fmtDate(o.createdAt)} · ${o.status||'Preparing'}</small></span><span class="history-money"><strong>${BF.money(orderSubtotal(o))}</strong><small>Net sales</small></span></button>`).join('');
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
  document.getElementById('orderSearch').oninput=renderOrders;document.getElementById('orderFilter').onchange=renderOrders;document.getElementById('analyticsRange').onchange=renderAnalytics;document.getElementById('abandonedFilter').onchange=renderAbandonedCarts;const internationalFilter=document.getElementById('internationalCountryFilter');if(internationalFilter)internationalFilter.onchange=renderInternationalPayments;
  document.getElementById('saveProductSettings').onclick=saveProducts;document.getElementById('saveWholesale').onclick=saveWholesale;document.getElementById('sendBroadcast').onclick=sendBroadcast;document.getElementById('saveDelivery').onclick=saveDelivery;document.getElementById('markAllRead').onclick=markAll;document.getElementById('saveSettings').onclick=saveSettings;document.getElementById('changeEmailForm')?.addEventListener('submit',submitAdminEmailChange);document.getElementById('changePasswordForm')?.addEventListener('submit',submitAdminPasswordChange);
});
