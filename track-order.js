(function(){
  const statuses=['Preparing','Ready','Dispatched','Delivered'];
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const money=v=>`GHS ${Number(v||0).toLocaleString('en-GH',{maximumFractionDigits:2})}`;
  const date=v=>{const d=new Date(v||'');return Number.isNaN(d.getTime())?'To be confirmed':new Intl.DateTimeFormat('en-GH',{day:'numeric',month:'short',year:'numeric'}).format(d)};

  async function lookup(payload){
    const response=await fetch('/.netlify/functions/track-order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await response.json().catch(()=>({}));
    if(!response.ok||!data.ok) throw new Error(data.error||'We could not find an order with those details.');
    return data;
  }

  function addEntryPoints(){
    const desktopNav=document.querySelector('.site-header .nav-right');
    if(desktopNav&&!desktopNav.querySelector('[data-bf-track-nav]')){
      const button=document.createElement('button');
      button.type='button';
      button.className='nav-link bf-track-nav-link';
      button.dataset.bfTrackOpen='';
      button.dataset.bfTrackNav='';
      button.innerHTML='<i class="fa-solid fa-location-dot" aria-hidden="true"></i> Track order';
      const contact=desktopNav.querySelector('.account-label');
      desktopNav.insertBefore(button,contact||desktopNav.firstChild);
    }

    document.querySelectorAll('.mobile-menu').forEach(menu=>{
      if(menu.querySelector('[data-bf-track-mobile]'))return;
      const button=document.createElement('button');
      button.type='button';
      button.className='bf-track-mobile-link';
      button.dataset.bfTrackOpen='';
      button.dataset.bfTrackMobile='';
      button.textContent='Track order';
      const contact=[...menu.querySelectorAll('a')].find(a=>/contact/i.test(a.textContent));
      menu.insertBefore(button,contact||null);
    });

    document.querySelectorAll('.footer').forEach(footer=>{
      if(footer.querySelector('[data-bf-track-footer]'))return;
      const columns=[...footer.querySelectorAll('.footer-grid > div')];
      let helpColumn=columns.find(col=>/^help$/i.test(col.querySelector('h4')?.textContent.trim()||''));
      if(!helpColumn) helpColumn=columns[1]||columns[0];
      let links=helpColumn?.querySelector('.footer-links');
      if(links){
        const button=document.createElement('button');
        button.type='button';
        button.className='bf-track-footer-link';
        button.dataset.bfTrackOpen='';
        button.dataset.bfTrackFooter='';
        button.textContent='Track your order';
        links.appendChild(button);
      }
    });
  }

  function mount(){
    if(document.getElementById('bfTrackScreen')||document.body.classList.contains('admin-body'))return;
    addEntryPoints();

    document.body.insertAdjacentHTML('beforeend',`
      <div class="bf-track-screen" id="bfTrackScreen" aria-hidden="true">
        <button class="bf-track-backdrop" type="button" data-bf-track-close aria-label="Close order tracking"></button>
        <aside class="bf-track-drawer" role="dialog" aria-modal="true" aria-labelledby="bfTrackTitle">
          <div class="bf-track-head">
            <a class="bf-track-brand" href="index.html" aria-label="Band Factory home"><span>BΛND</span><small>FΛCTORY</small></a>
            <button class="bf-track-close" type="button" data-bf-track-close aria-label="Close order tracking"><span></span><span></span></button>
          </div>

          <div class="bf-track-body">
            <section class="bf-track-lookup-view" id="bfTrackLookupView">
              <p class="bf-track-kicker">Order tracking</p>
              <h2 class="bf-track-title" id="bfTrackTitle">Track your order.</h2>
              <p class="bf-track-copy">Enter your order number and the email address you used at checkout.</p>

              <form class="bf-track-form" id="bfTrackForm" novalidate>
                <div class="bf-track-field">
                  <label for="bfTrackOrder">Order number</label>
                  <input id="bfTrackOrder" name="orderId" autocomplete="off" placeholder="BF-00001" required>
                </div>
                <div class="bf-track-field" id="bfTrackEmailWrap">
                  <label for="bfTrackEmail">Email address</label>
                  <input id="bfTrackEmail" name="email" type="email" autocomplete="email" placeholder="Enter the email address you used at checkout" required>
                </div>
                <div class="bf-track-field" id="bfTrackPhoneWrap" hidden>
                  <label for="bfTrackPhone">Phone number</label>
                  <input id="bfTrackPhone" name="phone" type="tel" autocomplete="tel" placeholder="Enter the phone number you used at checkout">
                </div>
                <button class="bf-track-alt" type="button" id="bfTrackAlt"><span>Can't use your email?</span> Use your phone number</button>
                <button class="bf-track-submit" type="submit"><span>Track order</span><i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button>
                <div class="bf-track-note" id="bfTrackNote" aria-live="polite"></div>
              </form>

              <div class="bf-track-help">
                <i class="fa-regular fa-envelope" aria-hidden="true"></i>
                <p>We send order updates to the email address entered at checkout.</p>
              </div>
            </section>

            <section class="bf-track-order-view" id="bfTrackOrderView" hidden>
              <button class="bf-track-back" type="button" id="bfTrackBack"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Back</button>
              <div class="bf-track-result" id="bfTrackResult"></div>
            </section>
          </div>
        </aside>
      </div>`);

    const screen=document.getElementById('bfTrackScreen');
    const form=document.getElementById('bfTrackForm');
    const lookupView=document.getElementById('bfTrackLookupView');
    const orderView=document.getElementById('bfTrackOrderView');
    const result=document.getElementById('bfTrackResult');
    const note=document.getElementById('bfTrackNote');
    const alt=document.getElementById('bfTrackAlt');
    const emailWrap=document.getElementById('bfTrackEmailWrap');
    const phoneWrap=document.getElementById('bfTrackPhoneWrap');
    const email=document.getElementById('bfTrackEmail');
    const phone=document.getElementById('bfTrackPhone');
    const orderInput=document.getElementById('bfTrackOrder');
    let phoneMode=false;

    const cleanTrackQuery=()=>{
      const url=new URL(location.href);
      if(url.searchParams.has('track')){
        url.searchParams.delete('track');
        history.replaceState(null,'',url.pathname+(url.search?url.search:'')+url.hash);
      }
    };
    const showLookup=()=>{
      orderView.hidden=true;
      lookupView.hidden=false;
      result.innerHTML='';
      note.textContent='';
      cleanTrackQuery();
      setTimeout(()=>orderInput.focus(),50);
    };
    const showOrder=(order,token)=>{
      render(order,token,result);
      lookupView.hidden=true;
      orderView.hidden=false;
      orderView.scrollTop=0;
    };
    const open=()=>{
      screen.classList.add('is-open');
      screen.setAttribute('aria-hidden','false');
      document.body.classList.add('bf-track-open');
      if(!orderView.hidden)return;
      setTimeout(()=>orderInput.focus(),180);
    };
    const close=()=>{
      screen.classList.remove('is-open');
      screen.setAttribute('aria-hidden','true');
      document.body.classList.remove('bf-track-open');
    };

    document.querySelectorAll('[data-bf-track-open]').forEach(button=>button.addEventListener('click',open));
    screen.querySelectorAll('[data-bf-track-close]').forEach(button=>button.addEventListener('click',close));
    document.getElementById('bfTrackBack').addEventListener('click',showLookup);
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&screen.classList.contains('is-open'))close()});

    alt.addEventListener('click',()=>{
      phoneMode=!phoneMode;
      emailWrap.hidden=phoneMode;
      phoneWrap.hidden=!phoneMode;
      email.required=!phoneMode;
      phone.required=phoneMode;
      alt.innerHTML=phoneMode?'<span>Prefer email?</span> Use your email address':'<span>Can\'t use your email?</span> Use your phone number';
      note.textContent='';
      setTimeout(()=>(phoneMode?phone:email).focus(),40);
    });

    form.addEventListener('submit',async event=>{
      event.preventDefault();
      note.textContent='';
      const button=form.querySelector('.bf-track-submit');
      const buttonLabel=button.querySelector('span');
      button.disabled=true;
      button.classList.add('is-loading');
      buttonLabel.textContent='Finding your order';
      try{
        const data=await lookup({orderId:orderInput.value,email:phoneMode?'':email.value,phone:phoneMode?phone.value:''});
        showOrder(data.order,data.token);
        cleanTrackQuery();
      }catch(error){
        note.textContent=error.message;
      }finally{
        button.disabled=false;
        button.classList.remove('is-loading');
        buttonLabel.textContent='Track order';
      }
    });

    const token=new URLSearchParams(location.search).get('track');
    if(token){
      open();
      lookupView.classList.add('is-loading-order');
      note.textContent='Opening your order';
      lookup({token}).then(data=>{
        showOrder(data.order,data.token);
        cleanTrackQuery();
      }).catch(error=>{
        lookupView.classList.remove('is-loading-order');
        note.textContent=error.message;
      });
    }
  }

  function groupLifecycle(group,orderStatus){
    const explicit=String(group?.status||'').trim();
    const status=String(orderStatus||'Preparing');
    if(status==='Cancelled')return 'Cancelled';
    const d=new Date(group?.date||'');
    const future=(()=>{
      if(Number.isNaN(d.getTime()))return false;
      const now=new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` >
        `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    })();
    if(future&&['Ready','Dispatched','Delivered'].includes(status))return 'Scheduled';
    if(explicit&&explicit!=='Preparing'&&explicit!=='Awaiting Payment')return explicit;
    if(status==='Delivered')return 'Delivered';
    return status;
  }
  function groupScheduleMessage(groups,order){
    if(!groups.length)return '';
    if(groups.length>1){
      return order.fulfilmentPlan==='separate'
        ? 'You chose separate deliveries, so each part of your order has its own planned date.'
        : 'You chose one delivery, so ready items are being held until the latest fulfilment date.';
    }
    if(window.BFFulfilment?.isPreorder?.({fulfilmentType:order.fulfilmentType,fulfilmentDate:order.fulfilmentDate})||groups.some(g=>(g.items||[]).some(i=>i.fulfilmentType==='preorder'))){
      return 'This order includes a pre-order item. The date shown below is the planned fulfilment date.';
    }
    return 'Your planned fulfilment details are shown below.';
  }

  function render(order,token,target){
    const status=String(order.status||'Preparing');
    const idx=statuses.indexOf(status);
    const cancelled=status==='Cancelled';
    const progress=cancelled?0:Math.max(0,Math.min(100,((idx<0?0:idx)/(statuses.length-1))*100));
    const statusMessage={
      Preparing:['We have your order.','We are getting everything ready. Check back here anytime for the latest update.'],
      Ready:['Your order is ready.','Everything is packed and ready for the next step.'],
      Dispatched:['Your order is on the way.','Your order has left us. Keep your phone nearby for any delivery updates.'],
      Delivered:['Your order has been delivered.','We hope you love it. Thank you for shopping with Band Factory.'],
      Cancelled:['This order was cancelled.','If you were not expecting this, contact Band Factory and include your order number.']
    }[status]||['Your order has an update.',`The current status is ${status}.`];

    const steps=statuses.map((step,i)=>{
      const state=cancelled?'':i<idx?'done':i===idx?'current':'';
      return `<div class="bf-track-step ${state}"><span class="bf-track-step-dot">${i<idx?'<i class="fa-solid fa-check"></i>':i+1}</span><span class="bf-track-step-name">${esc(step)}</span></div>`;
    }).join('');

    const fulfilment=String(order.fulfilment||'Delivery');
    const groups=(Array.isArray(order.fulfilmentGroups)&&order.fulfilmentGroups.length?order.fulfilmentGroups:null)||(
      window.BFFulfilment?.orderGroups?.(order)||[]
    );
    const split=groups.length>1 || order.fulfilmentPlan==='separate';
    const when=fulfilment.toLowerCase()==='pickup'?(order.pickupDate?date(order.pickupDate):'To be confirmed'):(groups[0]?.date?date(groups[0].date):(order.fulfilmentDate?date(order.fulfilmentDate):'To be confirmed'));
    const latestWhen=fulfilment.toLowerCase()==='pickup'?'':(groups.length?date(groups[groups.length-1]?.date):order.latestFulfilmentDate?date(order.latestFulfilmentDate):'');
    const destination=fulfilment.toLowerCase()==='pickup'?(order.pickupAddress||'Pickup details will be confirmed'):[order.city,order.region,order.country].filter(Boolean).join(', ')||'Delivery details saved';
    const schedule=groups.map((group,index)=>{const groupItems=(group.items||[]).map(item=>{const detail=Array.isArray(item.variants)&&item.variants.length?item.variants.map(v=>`${Number(v.qty||0)} × ${v.color||'Colour'}${v.size?` · ${v.size}`:''}`).join(', '):[item.color,item.size].filter(Boolean).join(' · ');return `<div class="bf-track-schedule-item"><span>${esc(item.name||'Band Factory item')}${detail?` · ${esc(detail)}`:''}</span><strong>${Array.isArray(item.variants)?'':`×${Number(item.qty||1)}`}</strong></div>`;}).join('');const groupState=groupLifecycle(group,status);return `<div class="bf-track-schedule-group"><div class="bf-track-schedule-head"><strong>${esc(group.label||`Delivery ${index+1}`)}</strong><span>${esc(date(group.date))}</span></div>${groupItems||'<span class="bf-track-schedule-empty">Item details saved with your order.</span>'}<small>${esc(groupState)}</small></div>`}).join('');
    if(split && status==='Preparing') statusMessage[1]=groupScheduleMessage(groups,order);
    if(split && status==='Dispatched') statusMessage[1]=groupScheduleMessage(groups,order)+' We’ll show each planned date below so you can see what is still scheduled.';
    const items=(Array.isArray(order.items)?order.items:[]).map(item=>{
      const qty=Number(item.qty||1);
      const meta=Array.isArray(item.variants)&&item.variants.length?item.variants.map(v=>`${Number(v.qty||0)} × ${v.color||'Colour'}${v.size?` · ${v.size}`:''}`).join(', '):[item.color,item.size,item.style,qty>1?`Qty ${qty}`:''].filter(Boolean).join(' · ');
      return `<div class="bf-track-item"><div class="bf-track-item-copy"><strong>${esc(item.name||'Band Factory item')}</strong>${meta?`<span>${esc(meta)}</span>`:''}</div><b>${money(Number(item.price||0)*qty)}</b></div>`;
    }).join('');

    target.innerHTML=`
      <div class="bf-track-order-top">
        <div class="bf-track-order-ref"><span>Order</span><strong>${esc(order.id)}</strong></div>
        <span class="bf-track-status ${cancelled?'is-cancelled':''}">${esc(status)}</span>
      </div>

      <section class="bf-track-status-card ${cancelled?'is-cancelled':''}">
        <div class="bf-track-status-art" aria-hidden="true"><span></span><span></span><span></span></div>
        <p class="bf-track-kicker">Latest update</p>
        <h2>${esc(statusMessage[0])}</h2>
        <p>${esc(statusMessage[1])}</p>
        <div class="bf-track-status-date"><i class="fa-regular fa-clock"></i> Order placed ${date(order.createdAt)}</div>
      </section>

      ${cancelled?'':`<section class="bf-track-progress-card"><div class="bf-track-progress-head"><strong>Order progress</strong><span>${Math.round(progress)}%</span></div><div class="bf-track-progress-line"><i style="width:${progress}%"></i></div><div class="bf-track-timeline">${steps}</div></section>`}

      <section class="bf-track-details-card">
        <div class="bf-track-card-heading"><div><p class="bf-track-kicker">Fulfilment</p><h3>${esc(fulfilment)}</h3></div><i class="fa-solid ${fulfilment.toLowerCase()==='pickup'?'fa-bag-shopping':'fa-truck-fast'}"></i></div>
        <div class="bf-track-details-grid">
          <div><span>${fulfilment.toLowerCase()==='pickup'?'Pickup date':'First delivery'}</span><strong>${esc(when)}</strong></div>
          <div><span>${fulfilment.toLowerCase()==='pickup'?'Pickup point':'Destination'}</span><strong>${esc(destination)}</strong></div>
          <div><span>${split?'Delivery plan':'Payment'}</span><strong>${split?(order.fulfilmentPlan==='separate'?'Separate deliveries':'One delivery'):esc(order.payment||'Paid')}</strong></div>
          <div><span>${split?'Last delivery':'Order total'}</span><strong>${split?esc(latestWhen||when):money(order.total)}</strong></div>
        </div>
      </section>

      ${schedule?`<section class="bf-track-schedule-card"><div class="bf-track-card-heading"><div><p class="bf-track-kicker">Delivery plan</p><h3>${split?'Your order, by date':'Fulfilment schedule'}</h3></div><i class="fa-regular fa-calendar-days"></i></div><p class="bf-track-schedule-intro">${esc(groupScheduleMessage(groups,order))}</p><div class="bf-track-schedule-list">${schedule}</div></section>`:''}

      <details class="bf-track-order-items" open>
        <summary><span>Order summary</span><span>${Array.isArray(order.items)?order.items.length:0} item${Array.isArray(order.items)&&order.items.length===1?'':'s'} <i class="fa-solid fa-chevron-down"></i></span></summary>
        <div class="bf-track-items-list">${items||'<p class="bf-track-empty-items">Your order items are saved with this order.</p>'}<div class="bf-track-total"><span>Total</span><strong>${money(order.total)}</strong></div></div>
      </details>

      <div class="bf-track-support"><div><span>Need help with this order?</span><p>Send us a message and include <strong>${esc(order.id)}</strong>.</p></div><a href="contact.html">Contact us <i class="fa-solid fa-arrow-right"></i></a></div>`;
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
