(function(){
  const raw = sessionStorage.getItem('bf_payment_success');
  let payload = null;
  try{ payload = raw ? JSON.parse(raw) : null; }catch{}

  // This page is intentionally inaccessible unless checkout has just recorded a successful Paystack payment.
  if(!payload?.verifiedClientSuccess || !payload?.order || Date.now() - Number(payload.createdAt||0) > 30*60*1000){
    location.replace('checkout.html');
    return;
  }

  const order = payload.order;
  const esc = v => String(v ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const money = v => `GHS ${Number(v||0).toLocaleString('en-GH',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const deliveryDisplay = () => order.deliveryFeeStatus || (order.fulfilment === 'delivery' ? 'To be communicated' : 'Not applicable');
  const date = v => { if(!v || v==='Pickup') return ''; const d=new Date(v); return isNaN(d)?String(v):new Intl.DateTimeFormat('en-GH',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d); };
  const dateTime = v => { const d=new Date(v); return isNaN(d)?'':new Intl.DateTimeFormat('en-GH',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(d); };

  function itemDescription(i){
    if(i.type==='wholesale') return i.summary || `${i.bundlePieces||''} pieces`;
    if(i.type==='wholesale-product') return `Wholesale${i.color?` · ${i.color}`:''}${i.size?` · Size ${i.size} · `:' · '}${`Quantity ${i.qty||1}`}`;
    if(i.type==='apparel') return `Black · Size ${i.size||'-'} · Quantity ${i.qty||1}`;
    if(i.type==='simple') return `Quantity ${i.qty||1}`;
    return `${i.color||''} · Quantity ${i.qty||1}`;
  }

  function fulfilmentReceiptHtml(){
    const info=window.BFFulfilment?.summary?.(order)||{groups:[]},groups=info.groups||[];
    if(!groups.length)return '';
    const title=order.fulfilment==='pickup'?'Pickup schedule':info.split?'Delivery schedule':'Fulfilment schedule';
    const intro=info.split
      ? `Your order is scheduled across ${groups.length} deliveries. Each part is listed below with its planned date.`
      : (info.hasPreorder&&info.plan==='together'&&order.fulfilment==='delivery' ? 'We’ll hold the ready items until the pre-order date and deliver everything together.' : 'Your fulfilment details are below.');
    const cards=groups.map((group,index)=>{const items=(group.items||[]).map(i=>`${esc(i.name)}${i.color?` · ${esc(i.color)}`:''}${i.size?` · ${esc(i.size)}`:''} × ${Number(i.qty||1)}`).join('<br>');return `<div class="receipt-fulfilment-group"><div><span>${esc(group.label||`Delivery ${index+1}`)}</span><strong>${esc(date(group.date))}</strong></div><p>${items||'Item details saved with your order.'}</p></div>`}).join('');
    return `<p class="receipt-fulfilment-intro">${esc(intro)}</p><div class="receipt-fulfilment-groups">${cards}</div>`;
  }

  function receiptHTML(){
    const fulfilmentTitle = order.fulfilment === 'pickup' ? 'Pickup' : 'Delivery';
    const fulfilmentCopy = order.fulfilment === 'pickup'
      ? `${esc(order.pickupAddress || BF_CONFIG.pickup.address || 'Band Factory pickup point')}`
      : `${esc(date(order.fulfilmentDate))}${order.address?`<br>${esc(order.address)}`:''}${order.address2?`<br>${esc(order.address2)}`:''}${order.city||order.region?`<br>${order.city?esc(order.city):''}${order.city&&order.region?', ':''}${order.region?esc(order.region):''}`:''}${order.country?`<br>${esc(order.country)}`:''}${order.landmark?`<br><span class="receipt-muted">Landmark: ${esc(order.landmark)}</span>`:''}`;
    const itemRows = (order.items||[]).map((i,index)=>`
      <div class="receipt-item">
        <span class="receipt-item-index">${String(index+1).padStart(2,'0')}</span>
        <div class="receipt-item-copy">
          <strong>${esc(i.name||'Item')}</strong>
          <p>${esc(itemDescription(i))}</p>
        </div>
        <strong class="receipt-item-price">${money(Number(i.price||0)*Number(i.qty||1))}</strong>
      </div>`).join('') || '<p class="receipt-empty">No item details were saved for this order.</p>';

    return `
      <header class="receipt-hero">
        <div class="receipt-brand-lockup">
          <span class="receipt-monogram">BF</span>
          <div><strong>Band Factory</strong><small>Payment receipt</small></div>
        </div>
        <span class="receipt-paid"><i class="fa-solid fa-check"></i> Paid</span>
      </header>

      <section class="receipt-order-intro">
        <div>
          <span class="receipt-eyebrow">Order confirmed</span>
          <h2>Thank you, ${esc((order.name||'there').split(' ')[0])}.</h2>
          <p>Your payment was received successfully. Keep this receipt for your records.</p>
        </div>
        <div class="receipt-reference-card">
          <span>Order number</span>
          <strong>${esc(order.id)}</strong>
          <small>${esc(dateTime(order.createdAt))}</small>
        </div>
      </section>

      <section class="receipt-info-grid">
        <div class="receipt-info-card"><span>Customer</span><strong>${esc(order.name||'Customer')}</strong><small>${esc(order.phone||'Phone not provided')}</small></div>
        <div class="receipt-info-card"><span>Email</span><strong>${esc(order.email||'Not provided')}</strong><small>Used for order updates</small></div>
        <div class="receipt-info-card"><span>Payment</span><strong>Paystack</strong><small>${esc(order.paystackReference||'Reference unavailable')}</small></div>
        <div class="receipt-info-card"><span>Fulfilment</span><strong>${fulfilmentTitle}</strong><small>${order.fulfilment==='delivery'?'Scheduled delivery':'Collection from pickup point'}</small></div>
      </section>

      <section class="receipt-products">
        <div class="receipt-section-head"><div><span class="receipt-eyebrow">Your order</span><h3>Order details</h3></div><span>${(order.items||[]).length} ${(order.items||[]).length===1?'item':'items'}</span></div>
        <div class="receipt-items">${itemRows}</div>
      </section>

      <section class="receipt-bottom-grid">
        <div class="receipt-fulfilment">
          <span class="receipt-eyebrow">${fulfilmentTitle}</span>
          <h3>${order.fulfilment==='pickup'?'Pickup details':'Delivery details'}</h3>
          <p>${fulfilmentCopy}</p>
          ${fulfilmentReceiptHtml()}
        </div>
        <div class="receipt-totals">
          <div class="receipt-total-row"><span>Subtotal</span><strong>${money(order.subtotal ?? order.total)}</strong></div>
          <div class="receipt-total-row"><span>Processing fee</span><strong>${money(order.processingFee||0)}</strong></div>
          <div class="receipt-total-row"><span>Delivery fee</span><strong>${esc(deliveryDisplay())}</strong></div>
          <div class="receipt-total-row grand"><span>Total paid</span><strong>${money(order.total)}</strong></div>
        </div>
      </section>

      <footer class="receipt-foot">
        <div><strong>Band Factory</strong><span>Made with care in Ghana</span></div>
        <p>Payment processed securely through Paystack. This receipt confirms payment for order ${esc(order.id)}.</p>
      </footer>`;
  }

  function downloadHtmlReceipt(){
    const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Band Factory Receipt ${esc(order.id)}</title><style>
      *{box-sizing:border-box}body{margin:0;background:#f8f4f6;color:#151214;font-family:Arial,Helvetica,sans-serif;padding:28px}.sheet{max-width:760px;margin:auto;background:#fff;border:1px solid #eadfe3;border-radius:24px;overflow:hidden;box-shadow:0 18px 60px rgba(40,20,30,.08)}
      .receipt-hero{padding:28px 32px;background:#f7cedd;display:flex;justify-content:space-between;align-items:center}.receipt-brand-lockup{display:flex;gap:12px;align-items:center}.receipt-monogram{width:42px;height:42px;border-radius:50%;background:#111;color:#fff;display:grid;place-items:center;font-weight:800}.receipt-brand-lockup strong{display:block;font-size:20px}.receipt-brand-lockup small,.receipt-info-card small,.receipt-reference-card small{display:block;color:#6b5d63;font-size:11px;margin-top:4px}.receipt-paid{background:#fff;padding:9px 13px;border-radius:999px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}
      .receipt-order-intro{display:grid;grid-template-columns:1.35fr .65fr;gap:24px;padding:34px 32px 26px}.receipt-eyebrow,.receipt-info-card span{font-size:9px;text-transform:uppercase;letter-spacing:.14em;color:#8f7e85;font-weight:700}.receipt-order-intro h2{font-family:Georgia,serif;font-size:34px;margin:7px 0 9px}.receipt-order-intro p{font-size:13px;line-height:1.7;color:#645b5f;margin:0}.receipt-reference-card{background:#161315;color:#fff;padding:18px;border-radius:18px}.receipt-reference-card span{font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:#d7ccd0}.receipt-reference-card strong{display:block;font-size:16px;margin:9px 0;word-break:break-word}.receipt-reference-card small{color:#b9adb2}
      .receipt-info-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:0 32px 30px}.receipt-info-card{border:1px solid #eee4e8;border-radius:16px;padding:16px}.receipt-info-card strong{display:block;font-size:12px;margin-top:6px;word-break:break-word}.receipt-products{padding:26px 32px;border-top:1px solid #f0e8eb}.receipt-section-head{display:flex;justify-content:space-between;align-items:end;margin-bottom:12px}.receipt-section-head h3,.receipt-fulfilment h3{font-family:Georgia,serif;font-size:22px;margin:5px 0 0}.receipt-section-head>span{font-size:10px;color:#887a80}.receipt-item{display:grid;grid-template-columns:34px 1fr auto;gap:12px;align-items:center;padding:14px 0;border-bottom:1px solid #f2ecef}.receipt-item-index{width:30px;height:30px;border-radius:50%;background:#fff1f6;display:grid;place-items:center;font-size:9px;font-weight:800}.receipt-item-copy strong,.receipt-item-price{font-size:12px}.receipt-item-copy p{margin:4px 0 0;color:#7b7075;font-size:10px;line-height:1.5}.receipt-bottom-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;padding:5px 32px 30px}.receipt-fulfilment{background:#fff4f8;border-radius:18px;padding:20px}.receipt-fulfilment p{font-size:11px;line-height:1.7;margin:8px 0 0}.receipt-total-row{display:flex;justify-content:space-between;gap:20px;padding:8px 0;font-size:11px}.receipt-total-row.grand{border-top:2px solid #111;margin-top:6px;padding-top:14px;font-family:Georgia,serif;font-size:20px}.receipt-foot{border-top:1px solid #eee4e8;padding:20px 32px;display:flex;justify-content:space-between;gap:20px;align-items:center;color:#8c7e84}.receipt-foot strong{display:block;color:#111;font-size:11px}.receipt-foot span{font-size:9px}.receipt-foot p{max-width:370px;text-align:right;font-size:9px;line-height:1.5;margin:0}
      @media(max-width:620px){body{padding:8px}.sheet{border-radius:16px}.receipt-hero,.receipt-order-intro,.receipt-info-grid,.receipt-products,.receipt-bottom-grid,.receipt-foot{padding-left:18px;padding-right:18px}.receipt-order-intro,.receipt-bottom-grid{grid-template-columns:1fr}.receipt-info-grid{grid-template-columns:1fr}.receipt-foot{align-items:flex-start;flex-direction:column}.receipt-foot p{text-align:left}.receipt-order-intro h2{font-size:29px}}
      @media print{body{padding:0;background:#fff}.sheet{box-shadow:none;border:0;border-radius:0;max-width:none}}
    </style></head><body><main class="sheet">${receiptHTML()}</main></body></html>`;
    const blob=new Blob([html],{type:'text/html'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`Band-Factory-Receipt-${order.id}.html`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  function pdfReceipt(auto=false){
    if(!window.jspdf?.jsPDF){ downloadHtmlReceipt(); return; }
    const {jsPDF}=window.jspdf, doc=new jsPDF({unit:'mm',format:'a4'});
    const pageW=210, pageH=297, margin=17, contentW=176;
    const pink=[247,206,221], softPink=[255,244,248], black=[21,18,20], grey=[116,103,109], line=[235,226,230], white=[255,255,255];
    const clean=v=>String(v??'').replace(/[•·]/g,'|').replace(/[–—]/g,'-');
    const label=(txt,x,y)=>{doc.setTextColor(...grey);doc.setFont('helvetica','bold');doc.setFontSize(6.7);doc.text(clean(txt).toUpperCase(),x,y)};
    const val=(txt,x,y,size=9,opts={})=>{doc.setTextColor(...black);doc.setFont('helvetica','bold');doc.setFontSize(size);doc.text(clean(txt||'-'),x,y,opts)};
    const paragraph=(txt,x,y,w,size=8,color=grey)=>{doc.setTextColor(...color);doc.setFont('helvetica','normal');doc.setFontSize(size);const lines=doc.splitTextToSize(clean(txt||''),w);doc.text(lines,x,y);return lines.length*4;};
    const ensure=(needed)=>{if(y+needed>pageH-18){doc.addPage();y=20;}};

    doc.setFillColor(...pink);doc.rect(0,0,pageW,48,'F');
    doc.setFillColor(...black);doc.circle(margin+7,19,7,'F');doc.setTextColor(...white);doc.setFont('helvetica','bold');doc.setFontSize(8);doc.text('BF',margin+7,21.5,{align:'center'});
    doc.setTextColor(...black);doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text('BAND FACTORY',margin+19,18);
    doc.setFont('helvetica','normal');doc.setFontSize(7);doc.text('PAYMENT RECEIPT',margin+19,24);
    doc.setFillColor(...white);doc.roundedRect(163,14,30,10,5,5,'F');doc.setFont('helvetica','bold');doc.setFontSize(7);doc.text('PAID',178,20.5,{align:'center'});

    let y=61;
    label('Order confirmed',margin,y); y+=7;
    doc.setFont('times','bold');doc.setTextColor(...black);doc.setFontSize(24);doc.text(`Thank you, ${clean((order.name||'there').split(' ')[0])}.`,margin,y); y+=8;
    paragraph('Your payment was received successfully. Keep this receipt for your records.',margin,y,105,8); 
    doc.setFillColor(...black);doc.roundedRect(135,55,58,28,4,4,'F');doc.setTextColor(205,194,199);doc.setFont('helvetica','bold');doc.setFontSize(6.5);doc.text('ORDER NUMBER',141,63);doc.setTextColor(...white);doc.setFontSize(9);doc.text(clean(order.id),141,70,{maxWidth:46});doc.setFont('helvetica','normal');doc.setFontSize(6.5);doc.setTextColor(190,180,184);doc.text(clean(dateTime(order.createdAt)),141,77,{maxWidth:46});
    y=94;

    const cards=[
      ['Customer',order.name||'Customer',order.phone||'Phone not provided'],
      ['Email',order.email||'Not provided','Used for order updates'],
      ['Payment','Paystack',order.paystackReference||'Reference unavailable'],
      ['Fulfilment',order.fulfilment==='pickup'?'Pickup':'Delivery',order.fulfilment==='delivery'?'Scheduled delivery':'Collection from pickup point']
    ];
    cards.forEach((c,i)=>{const x=margin+(i%2)*89, yy=y+Math.floor(i/2)*27;doc.setDrawColor(...line);doc.roundedRect(x,yy,85,22,3,3,'S');label(c[0],x+5,yy+6);val(c[1],x+5,yy+12,8);doc.setTextColor(...grey);doc.setFont('helvetica','normal');doc.setFontSize(6.5);doc.text(clean(c[2]),x+5,yy+17,{maxWidth:74});});
    y+=61;

    label('Your order',margin,y);doc.setFont('times','bold');doc.setTextColor(...black);doc.setFontSize(15);doc.text('Order details',margin,y+7);doc.setFont('helvetica','normal');doc.setTextColor(...grey);doc.setFontSize(7);doc.text(`${(order.items||[]).length} ${(order.items||[]).length===1?'item':'items'}`,193,y+7,{align:'right'});y+=16;
    (order.items||[]).forEach((i,idx)=>{
      ensure(18);
      doc.setFillColor(...softPink);doc.circle(margin+5,y+3,4.5,'F');doc.setTextColor(...black);doc.setFont('helvetica','bold');doc.setFontSize(6.5);doc.text(String(idx+1).padStart(2,'0'),margin+5,y+5,{align:'center'});
      val(i.name||'Item',margin+14,y+2,8.5);doc.setTextColor(...grey);doc.setFont('helvetica','normal');doc.setFontSize(6.7);const dlines=doc.splitTextToSize(clean(itemDescription(i)),105);doc.text(dlines,margin+14,y+7);val(money(Number(i.price||0)*Number(i.qty||1)),193,y+2,8,{align:'right'});
      const rowH=Math.max(15,9+dlines.length*3);doc.setDrawColor(...line);doc.line(margin,y+rowH-2,193,y+rowH-2);y+=rowH;
    });
    y+=5; ensure(58);

    const boxY=y;
    doc.setFillColor(...softPink);doc.roundedRect(margin,boxY,84,44,4,4,'F');label(order.fulfilment==='pickup'?'Pickup':'Delivery',margin+6,boxY+8);doc.setFont('times','bold');doc.setTextColor(...black);doc.setFontSize(12);doc.text(order.fulfilment==='pickup'?'Pickup details':'Delivery details',margin+6,boxY+16);
    const fulfilment = order.fulfilment==='pickup'
      ? (order.pickupAddress||BF_CONFIG.pickup.address||'Band Factory pickup point')
      : `${date(order.fulfilmentDate)}\n${order.address||''}${order.address2?`, ${order.address2}`:''}${order.city?`\n${order.city}`:''}${order.region?`, ${order.region}`:''}${order.country?`\n${order.country}`:''}${order.landmark?`\nLandmark: ${order.landmark}`:''}`;
    paragraph(fulfilment,margin+6,boxY+23,71,7.2,grey);

    const tx=112;label('Subtotal',tx,boxY+6);val(money(order.subtotal ?? order.total),193,boxY+6,7.5,{align:'right'});label('Processing fee',tx,boxY+15);val(money(order.processingFee||0),193,boxY+15,7.5,{align:'right'});label('Delivery fee',tx,boxY+24);val(deliveryDisplay(),193,boxY+24,7.5,{align:'right'});doc.setDrawColor(...black);doc.line(tx,boxY+29,193,boxY+29);doc.setFont('times','bold');doc.setTextColor(...black);doc.setFontSize(12);doc.text('Total paid',tx,boxY+39);doc.setFontSize(13);doc.text(money(order.total),193,boxY+39,{align:'right'});y+=56;

    ensure(25);doc.setDrawColor(...line);doc.line(margin,y,193,y);y+=9;doc.setFont('helvetica','bold');doc.setTextColor(...black);doc.setFontSize(7.5);doc.text('BAND FACTORY',margin,y);doc.setFont('helvetica','normal');doc.setTextColor(...grey);doc.setFontSize(6.5);doc.text('Made with care in Ghana',margin,y+5);const foot=`Payment processed securely through Paystack. This receipt confirms payment for order ${clean(order.id)}.`;const footLines=doc.splitTextToSize(foot,88);doc.text(footLines,193,y,{align:'right'});
    doc.save(`Band-Factory-Receipt-${order.id}.pdf`);
  }

  document.getElementById('orderReference').textContent=order.id;
  document.getElementById('successLead').textContent=`Payment confirmed for ${order.name}. ${order.email?(order.emailStatus==='sent'?'Your confirmation email is on its way.':'Your order is safely recorded even if email delivery is delayed.'):'You checked out without an email, so keep this confirmation page or download your receipt for your records.'}`;
  if(order.fulfilment==='pickup'){
    document.getElementById('nextTitle').textContent='We’ll get your pickup ready.';
    document.getElementById('fulfilmentStepTitle').textContent='Pickup preparation';
    document.getElementById('fulfilmentStepCopy').textContent=`Wait until your order is marked ready before collecting from ${order.pickupAddress||'the Band Factory pickup point'}.`;
  }else{
    document.getElementById('fulfilmentStepTitle').textContent='Delivery preparation';
    document.getElementById('fulfilmentStepCopy').textContent=`Your closest scheduled delivery day is ${date(order.fulfilmentDate)}.`;
  }
  document.getElementById('receiptSheet').innerHTML=receiptHTML();
  document.getElementById('confirmationShell').hidden=false;

  const modal=document.getElementById('receiptModal');
  const open=()=>{modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden'};
  const close=()=>{modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.style.overflow=''};
  document.getElementById('viewReceipt').onclick=open;
  document.getElementById('closeReceipt').onclick=close;
  document.getElementById('closeReceiptBackdrop').onclick=close;
  document.getElementById('downloadReceipt').onclick=()=>pdfReceipt(false);
  document.getElementById('downloadReceiptModal').onclick=()=>pdfReceipt(false);
  document.getElementById('printReceipt').onclick=()=>window.print();
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});

  // Auto-download once per successful order, even if the confirmation page is refreshed.
  const downloadFlag=`bf_receipt_downloaded_${order.id}`;
  if(!sessionStorage.getItem(downloadFlag)){
    setTimeout(()=>{pdfReceipt(true);sessionStorage.setItem(downloadFlag,'1')},700);
  }
})();
