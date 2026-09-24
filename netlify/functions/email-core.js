const admin = require('firebase-admin');
const crypto = require('crypto');
const BFFulfilment = require('../../fulfilment');

function initFirebase(){
  if(!admin.apps.length){
    admin.initializeApp({credential:admin.credential.cert({
      projectId:process.env.FIREBASE_PROJECT_ID,
      clientEmail:process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:String(process.env.FIREBASE_PRIVATE_KEY||'').replace(/\\n/g,'\n')
    })});
  }
  return admin.firestore();
}

const db=initFirebase();
const ADMIN_EMAIL=process.env.RESEND_ADMIN_EMAIL||'bandfactoryy@gmail.com';
const FROM_EMAIL=process.env.RESEND_FROM_EMAIL||'Band Factory <onboarding@resend.dev>';
const SITE_URL=()=>String(process.env.URL||process.env.DEPLOY_PRIME_URL||'').replace(/\/$/,'');

const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const money=v=>`GHS ${Number(v||0).toLocaleString('en-GH',{minimumFractionDigits:0,maximumFractionDigits:2})}`;
const date=v=>{const d=v?.toDate?v.toDate():new Date(v||Date.now());return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat('en-GH',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Accra'}).format(d)};
const normalizePhone=value=>{let d=String(value||'').replace(/\D/g,'');if(d.startsWith('0')&&d.length>=10)d='233'+d.slice(1);return d};
const statusKey=s=>String(s||'Preparing').toLowerCase().replace(/[^a-z0-9]+/g,'-');

async function resend({to,subject,html,text,replyTo}){
  const key=process.env.RESEND_API_KEY;
  if(!key) throw new Error('RESEND_API_KEY is not configured.');
  const recipients=(Array.isArray(to)?to:[to]).filter(Boolean);
  if(!recipients.length) return {skipped:true};
  const payload={from:FROM_EMAIL,to:recipients,subject,html,text:text||plainFromHtml(html)};
  if(replyTo) payload.reply_to=replyTo;
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const out=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(out.message||out.error||`Resend returned ${r.status}`);
  return out;
}

function plainFromHtml(html=''){
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<br\s*\/?\s*>/gi,'\n')
    .replace(/<\/p>|<\/div>|<\/tr>|<\/h\d>/gi,'\n')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/g,' ')
    .replace(/&amp;/g,'&')
    .replace(/&lt;/g,'<')
    .replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"')
    .replace(/&#039;/g,"'")
    .replace(/[ \t]+/g,' ')
    .replace(/\n\s+/g,'\n')
    .replace(/\n{3,}/g,'\n\n')
    .trim();
}

function shell({eyebrow='BAND FACTORY',title,lead='',body='',cta='',ctaUrl='',accent='#F4B6CA',footer='Hairbands, basics and colour for everyday wear.'}){
  const button=cta&&ctaUrl?`<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 2px"><tr><td bgcolor="#111111"><a href="${esc(ctaUrl)}" style="display:inline-block;padding:15px 22px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.2;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#ffffff;text-decoration:none">${esc(cta)} &nbsp;→</a></td></tr></table>`:'';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no">
  <meta name="color-scheme" content="light only">
  <title>${esc(title)}</title>
  <style>
    @media only screen and (max-width:620px){
      .bf-page{padding:0!important}.bf-shell{width:100%!important}.bf-mast{padding:26px 20px 58px!important}.bf-panel{margin:-34px 14px 0!important}.bf-panel-cell{padding:28px 20px 30px!important}.bf-title{font-size:36px!important;line-height:1.02!important}.bf-grid-label,.bf-grid-value{display:block!important;width:100%!important;text-align:left!important;box-sizing:border-box!important}.bf-grid-label{padding:12px 14px 3px!important;border-bottom:0!important}.bf-grid-value{padding:0 14px 12px!important}.bf-footer{padding:24px 20px!important}.bf-item-price{padding-left:10px!important}.bf-hide-mobile{display:none!important}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#F7F1F3;color:#111111;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(lead||title)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#F7F1F3">
    <tr><td align="center" class="bf-page" style="padding:28px 14px 34px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="bf-shell" style="width:100%;max-width:620px">
        <tr><td class="bf-mast" style="background:${accent};padding:30px 38px 76px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
            <td valign="top"><div style="font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:.9;font-weight:400;letter-spacing:.18em">BΛND</div><div style="margin-top:7px;font-family:Arial,Helvetica,sans-serif;font-size:7px;line-height:1;font-weight:400;letter-spacing:.34em">FΛCTORY</div></td>
            <td align="right" valign="top" style="font-size:9px;line-height:1.4;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#5E4450">${esc(eyebrow)}</td>
          </tr></table>
        </td></tr>
        <tr><td>
          <table role="presentation" width="calc(100% - 36px)" cellspacing="0" cellpadding="0" border="0" class="bf-panel" style="width:calc(100% - 36px);margin:-46px 18px 0;background:#FFFEFD;border:1px solid #E7DCE0">
            <tr><td class="bf-panel-cell" style="padding:38px 38px 40px">
              <h1 class="bf-title" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:44px;line-height:1.02;font-weight:400;letter-spacing:-.035em;color:#111111">${esc(title)}</h1>
              ${lead?`<p style="margin:15px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#675E61">${esc(lead)}</p>`:''}
              ${body}
              ${button}
            </td></tr>
          </table>
        </td></tr>
        <tr><td class="bf-footer" style="padding:26px 38px 0">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #D9CED2"><tr><td style="padding-top:20px;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.65;color:#776D71">
            <strong style="color:#111111">Band Factory</strong><br>${esc(footer)}<br><a href="${esc(SITE_URL()||'https://bandfactory.store')}" style="color:#111111;text-decoration:underline">bandfactory.store</a>
          </td></tr></table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function infoGrid(rows=[]){
  const valid=rows.filter(([,v])=>v!==undefined&&v!==null&&String(v).trim()!=='');
  if(!valid.length)return '';
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 0;border-top:1px solid #E7DCE0">${valid.map(([k,v])=>`<tr><td class="bf-grid-label" width="38%" style="padding:12px 4px;border-bottom:1px solid #E7DCE0;font-family:Arial,Helvetica,sans-serif;font-size:9px;line-height:1.4;letter-spacing:.11em;text-transform:uppercase;color:#93878C">${esc(k)}</td><td class="bf-grid-value" align="right" style="padding:12px 4px;border-bottom:1px solid #E7DCE0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;font-weight:700;color:#111111">${esc(v||'Not available')}</td></tr>`).join('')}</table>`;
}
function paragraph(text){return `<p style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.72;color:#554D50">${esc(text)}</p>`}
function quote(text){return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:22px 0 0;background:#FFF2F7"><tr><td style="padding:18px 20px;border-left:3px solid #E890AE;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.6;color:#43383C">${esc(text)}</td></tr></table>`}

function orderItemDetailLines(item = {}) {
  if (Array.isArray(item.variants) && item.variants.length) {
    return item.variants.map(v => `${number(v.qty || 0)} × ${esc(v.color || v.variantColor || 'Colour')}${v.size ? ` · Size ${esc(v.size)}` : ''}`).join('<br>');
  }
  return [item.color, item.size ? `Size ${item.size}` : '', item.style ? item.style : '', item.qty ? `Qty ${item.qty}` : ''].filter(Boolean).map(esc).join(' · ');
}
function orderItemShortText(item = {}) {
  if (Array.isArray(item.variants) && item.variants.length) return item.variants.map(v => `${Number(v.qty || 0)} × ${v.color || 'Colour'}${v.size ? ` · ${v.size}` : ''}`).join(', ');
  return [item.color, item.size ? `Size ${item.size}` : '', item.qty ? `Qty ${item.qty}` : ''].filter(Boolean).join(' · ');
}
function orderItems(order={}){
  const rows=(order.items||[]).map(item=>{const qty=Number(item.qty||1);return `<tr><td><strong>${esc(item.name||'Band Factory item')}</strong><br><span style="color:#8c7d83;font-size:12px">${orderItemShortText(item)}</span></td><td style="text-align:right">${money(Number(item.price||0)*qty)}</td></tr>`}).join('');
  return `<div style="margin-top:22px"><h3 style="font:600 20px Georgia,serif;margin:0 0 10px">Order details</h3><table style="width:100%;border-collapse:collapse">${rows||'<tr><td>No item details saved.</td></tr>'}</table></div>`;
}


function fulfilmentEmailBlock(order={}){
  const info=BFFulfilment.summary(order),groups=info.groups||[],pickup=String(order.fulfilment||'').toLowerCase()==='pickup';
  if(!groups.length)return '';

  let heading='Your fulfilment plan is below.';
  if(pickup){
    heading='Your pickup plan is below.';
  }else if(info.split){
    heading=`You chose separate deliveries for this order. We’ll send each part on its planned date. ${order.deliveryFeeStatus||`${groups.length} delivery fees apply.`}`;
  }else if(info.hasPreorder&&info.plan==='together'){
    heading='You chose to receive everything together. We’ll hold the ready items until the pre-order date and send the complete order then.';
  }else if(info.hasPreorder){
    heading='This order includes a pre-order item. The planned fulfilment date is shown below.';
  }

  const intro=paragraph(heading);
  const cards=groups.map((group,index)=>{
    const itemNames=(group.items||[]).map(item=>`${esc(item.name||'Band Factory item')}${item.color?` · ${esc(item.color)}`:''}${item.size?` · ${esc(item.size)}`:''} × ${Number(item.qty||1)}`).join('<br>')||'Items saved with your order';
    const label=pickup?'Pickup':(info.split?`Delivery ${index+1}`:'Delivery');
    return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:10px 0 0;background:#FFF7FA;border:1px solid #EBDDE3"><tr><td style="padding:14px 16px"><div style="font-family:Arial,Helvetica,sans-serif;font-size:9px;line-height:1.4;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#9A7280">${label}</div><div style="margin-top:4px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;font-weight:700;color:#111111">${esc(BFFulfilment.formatDate(group.date))}</div><div style="margin-top:7px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#756A6E">${itemNames}</div></td></tr></table>`;
  }).join('');

  return `${intro}<div style="margin-top:16px"><div style="margin-bottom:7px;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#8E6A78">Fulfilment</div>${cards}</div>`;
}

async function ensureTrackingToken(orderId,existingOrder){
  const ref=db.collection('orders').doc(orderId);
  let order=existingOrder;
  if(!order){const snap=await ref.get();if(!snap.exists)return null;order={id:snap.id,...snap.data()};}
  if(order.trackingToken)return {order,token:order.trackingToken};
  const token=crypto.randomBytes(28).toString('base64url');
  await ref.set({trackingToken:token,trackingTokenCreatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
  return {order:{...order,trackingToken:token},token};
}
function trackingUrl(token){const base=SITE_URL();return `${base||''}/index.html?track=${encodeURIComponent(token)}`;}

async function sendPurchase(order){
  if(!order?.id)return;
  const access=await ensureTrackingToken(order.id,order);order=access?.order||order;
  const total=money(order.total),ref=order.id;
  const customerName=String(order.name||'there').trim();
  const customerBody=`${paragraph(`Hi ${customerName}, thanks for your order. Your payment has been received and ${ref} is confirmed.`)}${orderItems(order)}${fulfilmentEmailBlock(order)}${infoGrid([['Order number',ref],['Status',order.status||'Preparing'],['Fulfilment',order.fulfilment||'Delivery'],['Delivery fee',order.deliveryFeeStatus||'To be communicated'],['Total paid',total],['Placed',date(order.createdAt)]])}${paragraph('We will email you when your order status changes. You can also track it on the Band Factory website at any time.')}`;
  const jobs=[];
  if(order.email)jobs.push(resend({to:order.email,subject:`Order ${ref} confirmed | Band Factory`,html:shell({eyebrow:'Order confirmed',title:'Thank you for your order.',lead:'Payment received. We are getting your Band Factory order ready.',body:customerBody,cta:'Track your order',ctaUrl:trackingUrl(access.token),accent:'#F4B6CA',footer:'Keep this email for your order reference and tracking link.'})}));
  jobs.push(resend({to:ADMIN_EMAIL,replyTo:order.email||undefined,subject:`New paid order ${ref} | ${total}`,html:shell({eyebrow:'New paid order',title:'A new order is in.',lead:`${order.name||'A customer'} completed payment on the website.`,body:`${infoGrid([['Order number',ref],['Customer',order.name],['Email',order.email],['Phone',order.phone],['Order type',order.type||'Retail'],['Fulfilment',order.fulfilment||'Delivery'],['Delivery fee',order.deliveryFeeStatus||'To be communicated'],['Total',total]])}${fulfilmentEmailBlock(order)}${orderItems(order)}`,cta:'Open admin',ctaUrl:`${SITE_URL()}/admin.html`,accent:'#E890AE',footer:'Band Factory website notification.'})}));
  return Promise.allSettled(jobs);
}

const statusCopy={
  Preparing:['We are preparing your order.','Your order is being checked and prepared before it moves to the next stage.','#F4B6CA'],
  Ready:['Your order is ready.','Everything is packed and ready for the next step.','#D8CFEF'],
  Dispatched:['Your order is on the way.','Your order has been dispatched. Keep your phone nearby for delivery updates.','#CFE7D5'],
  Delivered:['Your order has been delivered.','We hope you love it. Thank you for shopping with Band Factory.','#F4D6A8'],
  Cancelled:['There is an update on your order.','This order has been marked as cancelled. If you were not expecting this, reply to this email and we will help.','#E9DDE1']
};
async function sendStatus(order,status){
  if(!order?.email)return {skipped:true};
  const access=await ensureTrackingToken(order.id,order);const [title,lead,accent]=statusCopy[status]||['Your order has an update.',`Your order is now ${status}.`,'#F4B6CA'];
  const body=`${infoGrid([['Order number',order.id],['Current status',status],['Fulfilment',order.fulfilment||'Delivery'],['Delivery fee',order.deliveryFeeStatus||'To be communicated'],['Order total',money(order.total)]])}${fulfilmentEmailBlock(order)}${paragraph('Use the button below to open this order directly on the Band Factory website.')}`;
  return resend({to:order.email,subject:`Order ${order.id}: ${status} | Band Factory`,html:shell({eyebrow:'Order update',title,lead,body,cta:'Track your order',ctaUrl:trackingUrl(access.token),accent,footer:'You are receiving this because this email address was used for this order.'})});
}

async function sendSubscriber(doc){
  const customer=doc.email?resend({to:doc.email,subject:'Welcome to Band Factory updates',html:shell({eyebrow:'Band Factory updates',title:'You are on the list.',lead:'Thanks for signing up for Band Factory updates.',body:paragraph('We will send you new drops, restocks and product updates from time to time.'),cta:'Shop Band Factory',ctaUrl:`${SITE_URL()}/shop.html`,accent:'#F4B6CA',footer:'You signed up for updates on bandfactory.store.'})}):Promise.resolve({skipped:true});
  const admin=resend({to:ADMIN_EMAIL,replyTo:doc.email||undefined,subject:`New subscriber | ${doc.email||'Band Factory'}`,html:shell({eyebrow:'New subscriber',title:'Someone joined the list.',lead:'A new email subscriber signed up on the website.',body:infoGrid([['Name',doc.name||'Not provided'],['Email',doc.email],['Joined',date(doc.createdAt)]]),cta:'Open admin',ctaUrl:`${SITE_URL()}/admin.html#subscribersPanel`,accent:'#D8CFEF',footer:'Band Factory website notification.'})});
  return Promise.allSettled([customer,admin]);
}

async function sendContact(doc){
  const customer=doc.email?resend({to:doc.email,subject:'We received your message | Band Factory',html:shell({eyebrow:'Message received',title:'Thanks for getting in touch.',lead:'Your message has reached Band Factory. We will reply as soon as we can.',body:quote(doc.message||''),cta:'Visit Band Factory',ctaUrl:`${SITE_URL()}/index.html`,accent:'#D8CFEF',footer:'You received this confirmation after sending a message on bandfactory.store.'})}):Promise.resolve({skipped:true});
  const admin=resend({to:ADMIN_EMAIL,replyTo:doc.email||undefined,subject:`New website message | ${doc.name||'Customer'}`,html:shell({eyebrow:'New message',title:'A customer sent a message.',lead:`Message from ${doc.name||'a website visitor'}.`,body:`${infoGrid([['Name',doc.name],['Email',doc.email],['Phone',doc.phone],['Received',date(doc.createdAt)]])}${quote(doc.message||'')}`,cta:'Open admin',ctaUrl:`${SITE_URL()}/admin.html#messagesPanel`,accent:'#CFE7D5',footer:'Band Factory website notification.'})});
  return Promise.allSettled([customer,admin]);
}

async function sendReview(doc){
  const stars='★'.repeat(Math.max(0,Math.min(5,Number(doc.rating)||0)));
  const rating=`<div style="margin-top:22px;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:1;letter-spacing:4px;color:#B76E87">${stars}</div>`;
  const customer=doc.email?resend({to:doc.email,subject:'Thanks for your review | Band Factory',html:shell({eyebrow:'Review received',title:'Thanks for sharing your thoughts.',lead:'We received your review and it is waiting for approval.',body:`${rating}${quote(doc.review||'')}${paragraph('Once approved, your review may appear on the Band Factory website.')}`,cta:'Keep shopping',ctaUrl:`${SITE_URL()}/shop.html`,accent:'#F4B6CA',footer:'You received this confirmation after submitting a review on bandfactory.store.'})}):Promise.resolve({skipped:true});
  const admin=resend({to:ADMIN_EMAIL,replyTo:doc.email||undefined,subject:`New ${doc.rating||0} star review | ${doc.name||'Customer'}`,html:shell({eyebrow:'New review',title:'A new review is waiting.',lead:'A customer submitted a review on the website.',body:`${rating}${infoGrid([['Name',doc.name],['Email',doc.email],['City',doc.city],['Purchased?',doc.purchased?'Yes':'Not confirmed'],['Status',doc.status||'pending']])}${quote(doc.review||'')}`,cta:'Review in admin',ctaUrl:`${SITE_URL()}/admin.html#reviewsPanel`,accent:'#E890AE',footer:'Band Factory website notification.'})});
  return Promise.allSettled([customer,admin]);
}

async function sendGenericCustomer({to,name,subject,message,details,actionText,actionUrl}){
  return resend({to,subject,html:shell({eyebrow:'Band Factory',title:subject,lead:name?`Hi ${name},`:'Hello,',body:`${paragraph(message||'')}${details?quote(details):''}`,cta:actionText||'Visit Band Factory',ctaUrl:actionUrl||`${SITE_URL()}/index.html`,accent:'#D8CFEF'})});
}
async function sendBroadcast({to,name,subject,message}){
  return resend({to,subject,html:shell({eyebrow:'Band Factory update',title:subject,lead:name?`Hi ${name},`:'Hello,',body:`${paragraph(message)}${paragraph('You are receiving this because you joined the Band Factory email list.')}`,cta:'Shop Band Factory',ctaUrl:`${SITE_URL()}/shop.html`,accent:'#F4B6CA',footer:'Band Factory email list.'})});
}

async function getAdmin(event){
 const raw=event.headers.authorization||event.headers.Authorization||'';const token=raw.startsWith('Bearer ')?raw.slice(7):'';if(!token)throw Object.assign(new Error('Admin authentication required.'),{statusCode:401});
 const decoded=await admin.auth().verifyIdToken(token);const snap=await db.collection('admins').doc(decoded.uid).get();if(!snap.exists||snap.data().active===false)throw Object.assign(new Error('Admin access required.'),{statusCode:403});return decoded;
}

async function dispatchStoredEvent(type,id){
  const collections={purchase:'orders',subscriber:'subscribers',contact:'messages',review:'reviews'};
  const collection=collections[type];id=String(id||'').trim();
  if(!collection||!id)throw new Error('Invalid email event.');
  const eventRef=db.collection('emailEvents').doc(`${type}-${id}`);
  const sourceRef=db.collection(collection).doc(id);
  const sourceSnap=await sourceRef.get();
  if(!sourceSnap.exists)throw Object.assign(new Error('Record not found.'),{statusCode:404});
  const doc={id:sourceSnap.id,...sourceSnap.data()};
  if(type==='purchase'&&doc.payment!=='Paid')throw Object.assign(new Error('Order is not paid.'),{statusCode:400});
  const shouldSend=await db.runTransaction(async tx=>{
    const eventSnap=await tx.get(eventRef);
    if(eventSnap.exists&&eventSnap.data()?.status==='sent')return false;
    tx.set(eventRef,{type,sourceId:id,status:'sending',attempts:admin.firestore.FieldValue.increment(1),updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
    return true;
  });
  if(!shouldSend)return {ok:true,alreadySent:true};
  try{
    let result;if(type==='purchase')result=await sendPurchase(doc);else if(type==='subscriber')result=await sendSubscriber(doc);else if(type==='contact')result=await sendContact(doc);else result=await sendReview(doc);
    const failures=Array.isArray(result)?result.filter(x=>x.status==='rejected'):[];
    await eventRef.set({status:failures.length?'partial':'sent',failures:failures.map(x=>String(x.reason?.message||x.reason||'Email failed')).slice(0,4),sentAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
    return {ok:true,partial:failures.length>0};
  }catch(error){
    await eventRef.set({status:'failed',lastError:String(error.message||error),updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
    throw error;
  }
}

module.exports={admin,db,ADMIN_EMAIL,FROM_EMAIL,SITE_URL,esc,money,date,normalizePhone,statusKey,resend,shell,infoGrid,paragraph,quote,fulfilmentEmailBlock,ensureTrackingToken,trackingUrl,sendPurchase,sendStatus,sendSubscriber,sendContact,sendReview,sendGenericCustomer,sendBroadcast,getAdmin,dispatchStoredEvent};
