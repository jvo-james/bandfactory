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
  const deliveryDisplay = () => order.fulfilment === 'delivery' ? 'To be communicated' : 'Not applicable';
  const date = v => { if(!v || v==='Pickup') return ''; const d=new Date(v); return isNaN(d)?String(v):new Intl.DateTimeFormat('en-GH',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d); };
  const dateTime = v => { const d=new Date(v); return isNaN(d)?'':new Intl.DateTimeFormat('en-GH',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(d); };

  function itemDescription(i){
    if(i.type==='wholesale') return i.summary || `${i.bundlePieces||''} pieces`;
    if(i.type==='apparel') return `Black · Size ${i.size||'—'} · Quantity ${i.qty||1}`;
    if(i.type==='simple') return `Quantity ${i.qty||1}`;
    return `${i.color||''} · Quantity ${i.qty||1}`;
  }

  function receiptHTML(){
    const fulfil = order.fulfilment === 'pickup'
      ? `<p><strong>Pickup</strong></p><p>${esc(order.pickupAddress || BF_CONFIG.pickup.address || 'Band Factory pickup point')}</p>`
      : `<p><strong>Delivery · ${esc(date(order.fulfilmentDate))}</strong></p><p>${esc(order.address||'')}${order.address2?`<br>${esc(order.address2)}`:''}<br>${order.city?esc(order.city):''}${order.region?`, ${esc(order.region)}`:''}${order.postalCode?` ${esc(order.postalCode)}`:''}${order.country?`<br>${esc(order.country)}`:''}</p>${order.landmark?`<p>Landmark: ${esc(order.landmark)}</p>`:''}`;
    return `
      <div class="receipt-brand-row"><div class="receipt-brand">Band Factory<small>Payment receipt</small></div><span class="receipt-paid">Paid</span></div>
      <div class="receipt-meta"><div><span>Order reference</span><strong>${esc(order.id)}</strong></div><div><span>Payment reference</span><strong>${esc(order.paystackReference||'-')}</strong></div><div><span>Date</span><strong>${esc(dateTime(order.createdAt))}</strong></div><div><span>Order type</span><strong>${esc(order.type||'Retail')}</strong></div></div>
      <div class="receipt-customer"><div><span>Customer</span><strong>${esc(order.name)}</strong></div><div><span>Phone</span><strong>${esc(order.phone)}</strong></div><div><span>Email</span><strong>${esc(order.email||'Not provided')}</strong></div><div><span>Fulfilment</span><strong>${esc(order.fulfilment==='pickup'?'Pickup':'Delivery')}</strong></div></div>
      <div class="receipt-items"><span class="receipt-section-label">Order details</span>${(order.items||[]).map(i=>`<div class="receipt-item"><div><strong>${esc(i.name)}</strong><p>${esc(itemDescription(i))}</p></div><strong>${money(Number(i.price||0)*Number(i.qty||1))}</strong></div>`).join('')}</div>
      <div class="receipt-totals"><div class="receipt-total-row"><span>Subtotal</span><strong>${money(order.subtotal ?? order.total)}</strong></div><div class="receipt-total-row"><span>Processing fee</span><strong>${money(order.processingFee||0)}</strong></div><div class="receipt-total-row"><span>Delivery fee</span><strong>${esc(deliveryDisplay())}</strong></div><div class="receipt-total-row grand"><span>Total</span><span>${money(order.total)}</span></div></div>
      <div class="receipt-fulfilment"><span class="receipt-section-label">Fulfilment</span>${fulfil}</div>
      <div class="receipt-foot"><strong>Thank you for choosing Band Factory.</strong>Keep this receipt as proof of payment. Payment processed securely through Paystack.</div>`;
  }

  function downloadHtmlReceipt(){
    const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Band Factory Receipt ${esc(order.id)}</title><style>body{font-family:Arial,sans-serif;background:#fff7fa;color:#111;padding:30px}.sheet{max-width:650px;margin:auto;background:white;padding:42px;border:1px solid #eadfe3}.brand{font-size:30px;font-weight:800;border-bottom:4px solid #111;padding-bottom:20px}.paid{float:right;background:#f7cedd;border-radius:999px;padding:8px 12px;font-size:11px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:20px 0;border-bottom:1px solid #ddd}.label{font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.12em}.item{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid #eee;padding:14px 0}.box{background:#fff3f7;padding:18px;margin-top:20px}.total{text-align:right;font-size:24px;font-weight:800;margin-top:20px}@media(max-width:600px){body{padding:8px}.sheet{padding:24px}.meta{grid-template-columns:1fr}}</style></head><body><div class="sheet"><div class="brand">BAND FACTORY <span class="paid">PAID</span></div>${receiptHTML()}<div class="total">TOTAL ${money(order.total)}</div></div></body></html>`;
    const blob=new Blob([html],{type:'text/html'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`Band-Factory-Receipt-${order.id}.html`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  function pdfReceipt(auto=false){
    if(!window.jspdf?.jsPDF){ downloadHtmlReceipt(); return; }
    const {jsPDF}=window.jspdf, doc=new jsPDF({unit:'mm',format:'a4'});
    const pageW=210, left=18, right=192;
    const pink=[247,206,221], black=[17,17,17], grey=[105,100,102];
    doc.setFillColor(...pink); doc.rect(0,0,pageW,42,'F');
    doc.setTextColor(...black); doc.setFont('helvetica','bold'); doc.setFontSize(23); doc.text('BAND FACTORY',left,20);
    doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.text('PAYMENT RECEIPT',left,28);
    doc.setFillColor(...black); doc.roundedRect(158,13,34,11,5,5,'F'); doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.text('PAID',175,20,{align:'center'});
    let y=55;
    const label=(txt,x,yy)=>{doc.setTextColor(...grey);doc.setFont('helvetica','normal');doc.setFontSize(7);doc.text(String(txt).toUpperCase(),x,yy)};
    const value=(txt,x,yy,opts={})=>{doc.setTextColor(...black);doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text(String(txt||'-'),x,yy,opts)};
    label('Order reference',left,y); value(order.id,left,y+6); label('Payment reference',105,y); value(order.paystackReference||'-',105,y+6); y+=20;
    label('Customer',left,y); value(order.name,left,y+6); label('Phone',105,y); value(order.phone,105,y+6); y+=18;
    label('Email',left,y); value(order.email||'Not provided',left,y+6); label('Order type',105,y); value(order.type||'Retail',105,y+6); y+=20;
    doc.setDrawColor(225,220,222); doc.line(left,y,right,y); y+=10;
    label('Order details',left,y); y+=7;
    (order.items||[]).forEach((i,idx)=>{
      if(y>245){doc.addPage();y=20;}
      doc.setFont('helvetica','bold');doc.setTextColor(...black);doc.setFontSize(9);doc.text(`${idx+1}. ${i.name||'Item'}`,left,y);
      doc.text(money(Number(i.price||0)*Number(i.qty||1)),right,y,{align:'right'});y+=5;
      doc.setFont('helvetica','normal');doc.setTextColor(...grey);doc.setFontSize(8);
      const lines=doc.splitTextToSize(itemDescription(i),140);doc.text(lines,left,y);y+=lines.length*4+5;
    });
    y+=2; doc.setDrawColor(...black);doc.line(105,y,right,y);y+=9;
    doc.setFont('helvetica','normal');doc.setTextColor(...grey);doc.setFontSize(9);doc.text('Subtotal',125,y);doc.setTextColor(...black);doc.text(money(order.subtotal ?? order.total),right,y,{align:'right'});y+=7;
    doc.setTextColor(...grey);doc.text('Processing fee',125,y);doc.setTextColor(...black);doc.text(money(order.processingFee||0),right,y,{align:'right'});y+=7;
    doc.setTextColor(...grey);doc.text('Delivery fee',125,y);doc.setTextColor(...black);doc.text(deliveryDisplay(),right,y,{align:'right'});y+=9;
    doc.setFont('helvetica','bold');doc.setFontSize(15);doc.text('TOTAL',125,y);doc.text(money(order.total),right,y,{align:'right'});y+=17;
    if(y>245){doc.addPage();y=20;}
    doc.setFillColor(255,243,247);doc.roundedRect(left,y,right-left,38,4,4,'F');
    label('Fulfilment',left+7,y+8);doc.setFont('helvetica','bold');doc.setTextColor(...black);doc.setFontSize(9);
    const fulfilment = order.fulfilment==='pickup' ? `Pickup - ${order.pickupAddress||BF_CONFIG.pickup.address||'Band Factory pickup point'}` : `Delivery - ${date(order.fulfilmentDate)}\n${order.address||''}${order.city?`, ${order.city}`:''}${order.landmark?`\nLandmark: ${order.landmark}`:''}`;
    doc.text(doc.splitTextToSize(fulfilment,150),left+7,y+16);y+=51;
    doc.setTextColor(...grey);doc.setFont('helvetica','normal');doc.setFontSize(7);doc.text(`Issued ${dateTime(order.createdAt)} · Secure payment via Paystack`,left,y);
    doc.setFont('helvetica','bold');doc.setTextColor(...black);doc.text('Thank you for choosing Band Factory.',right,y,{align:'right'});
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
