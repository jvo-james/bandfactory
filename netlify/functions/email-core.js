const admin = require('firebase-admin');
const crypto = require('crypto');

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

async function resend({to,subject,html,replyTo}){
  const key=process.env.RESEND_API_KEY;
  if(!key) throw new Error('RESEND_API_KEY is not configured.');
  const recipients=(Array.isArray(to)?to:[to]).filter(Boolean);
  if(!recipients.length) return {skipped:true};
  const payload={from:FROM_EMAIL,to:recipients,subject,html};
  if(replyTo) payload.reply_to=replyTo;
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const out=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(out.message||out.error||`Resend returned ${r.status}`);
  return out;
}

function shell({eyebrow='BAND FACTORY',title,lead='',body='',cta='',ctaUrl='',accent='#E890AE',footer='Wear it. Sell it. Build something.'}){
  const button=cta&&ctaUrl?`<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 6px"><tr><td bgcolor="${accent}" style="border-radius:999px"><a href="${esc(ctaUrl)}" style="display:inline-block;padding:14px 24px;font-family:Arial,sans-serif;font-size:14px;font-weight:800;letter-spacing:.04em;color:#171315;text-decoration:none">${esc(cta)} &nbsp;→</a></td></tr></table>`:'';
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><style>@media(max-width:620px){.bf-wrap{padding:14px!important}.bf-card{border-radius:24px!important}.bf-pad{padding:28px 20px!important}.bf-title{font-size:35px!important;line-height:.98!important}.bf-grid td{display:block!important;width:100%!important;box-sizing:border-box!important}.bf-grid td+td{padding-top:8px!important}.bf-item-img{width:66px!important;height:78px!important}.bf-hide-mobile{display:none!important}}</style></head><body style="margin:0;background:#F7F1F3;padding:0"><div style="display:none;max-height:0;overflow:hidden">${esc(lead||title)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F7F1F3"><tr><td align="center" class="bf-wrap" style="padding:34px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:660px"><tr><td style="padding:0 8px 16px"><div style="font-family:Arial,sans-serif;font-size:12px;letter-spacing:.26em;font-weight:900;color:#171315">BΛND <span style="font-weight:500">FΛCTORY</span></div></td></tr><tr><td class="bf-card" style="background:#FFFEFD;border:1px solid #E7DCE0;border-radius:34px;overflow:hidden;box-shadow:0 18px 60px rgba(23,19,21,.08)"><div style="height:8px;background:${accent}"></div><div class="bf-pad" style="padding:42px 44px"><div style="font-family:Arial,sans-serif;font-size:11px;line-height:1.3;letter-spacing:.2em;text-transform:uppercase;font-weight:900;color:#A87587">${esc(eyebrow)}</div><h1 class="bf-title" style="margin:13px 0 14px;font-family:Arial,sans-serif;font-size:46px;line-height:.96;letter-spacing:-.045em;color:#171315">${esc(title)}</h1>${lead?`<p style="margin:0 0 26px;font-family:Arial,sans-serif;font-size:16px;line-height:1.65;color:#685D61">${esc(lead)}</p>`:''}${body}${button}</div><div style="background:#171315;padding:25px 44px"><p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:1.6;color:#F9EDF1">${esc(footer)}</p><p style="margin:7px 0 0;font-family:Arial,sans-serif;font-size:11px;line-height:1.5;color:#BFAFB5">Band Factory · Ghana</p></div></td></tr></table></td></tr></table></body></html>`;
}

function pill(text,bg='#FFF0F5'){return `<span style="display:inline-block;margin:0 6px 6px 0;padding:7px 11px;border-radius:999px;background:${bg};font-family:Arial,sans-serif;font-size:11px;font-weight:800;color:#5F4C53">${esc(text)}</span>`}
function infoGrid(rows=[]){return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="bf-grid" style="margin:20px 0;background:#FFF8FA;border:1px solid #F0E1E6;border-radius:20px">${rows.map(([k,v])=>`<tr><td style="width:42%;padding:14px 16px;border-bottom:1px solid #F0E1E6;font-family:Arial,sans-serif;font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:800;color:#9A858C">${esc(k)}</td><td style="padding:14px 16px;border-bottom:1px solid #F0E1E6;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#171315">${esc(v||'—')}</td></tr>`).join('')}</table>`}
function paragraph(text){return `<p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:15px;line-height:1.68;color:#554A4E">${esc(text)}</p>`}
function quote(text){return `<div style="margin:20px 0;padding:20px 22px;border-radius:20px;background:#FFF2F7;border-left:4px solid #E890AE;font-family:Arial,sans-serif;font-size:15px;line-height:1.65;color:#43383C">${esc(text)}</div>`}

function orderItems(order={}){
  const items=Array.isArray(order.items)?order.items:[];
  if(!items.length)return paragraph('Your order items are saved with your order.');
  return `<div style="margin:24px 0"><div style="margin-bottom:10px;font-family:Arial,sans-serif;font-size:11px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:#A87587">Your pieces</div>${items.map(i=>{const qty=Number(i.qty||1),meta=[i.color,i.size,i.style&&`${i.style} style`,qty>1?`Qty ${qty}`:''].filter(Boolean).join(' · ');return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 8px;background:#FFF9FB;border:1px solid #F0E1E6;border-radius:17px"><tr><td style="padding:14px 15px"><div style="font-family:Arial,sans-serif;font-size:14px;font-weight:900;color:#171315">${esc(i.name||'Band Factory item')}</div><div style="margin-top:4px;font-family:Arial,sans-serif;font-size:12px;line-height:1.45;color:#88757C">${esc(meta)}</div></td><td align="right" style="padding:14px 15px;font-family:Arial,sans-serif;font-size:13px;font-weight:900;color:#171315;white-space:nowrap">${money(Number(i.price||0)*qty)}</td></tr></table>`}).join('')}</div>`;
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
  const body=`${paragraph(`Hi ${order.name||'there'}, your payment is confirmed and order ${ref} is officially with us.`)}${orderItems(order)}${infoGrid([['Order',ref],['Status',order.status||'Preparing'],['Fulfilment',order.fulfilment||'Delivery'],['Order total',total],['Placed',date(order.createdAt)]])}${paragraph('We’ll email you whenever your order moves to a new stage. You can also check it anytime without creating an account.')}`;
  const jobs=[];
  if(order.email)jobs.push(resend({to:order.email,subject:`We’ve got your order ${ref} ♡`,html:shell({eyebrow:'ORDER CONFIRMED',title:'It’s officially yours.',lead:'Payment received. Your Band Factory order is now in motion.',body,cta:'Track my order',ctaUrl:trackingUrl(access.token),accent:'#F4B6CA'})}));
  jobs.push(resend({to:ADMIN_EMAIL,replyTo:order.email||undefined,subject:`New paid order · ${ref} · ${total}`,html:shell({eyebrow:'NEW SALE',title:'A new order just landed.',lead:`${order.name||'A customer'} completed payment.`,body:`${infoGrid([['Order',ref],['Customer',order.name],['Email',order.email],['Phone',order.phone],['Type',order.type||'Retail'],['Fulfilment',order.fulfilment||'Delivery'],['Total',total]])}${orderItems(order)}`,cta:'Open admin dashboard',ctaUrl:`${SITE_URL()}/admin.html`,accent:'#E890AE'})}));
  return Promise.allSettled(jobs);
}

const statusCopy={
  Preparing:['We’re getting it together.','Your order is being prepared and checked before it moves to the next stage.','#F4B6CA'],
  Ready:['Your order is ready.','Your pieces are packed and ready for the next step.','#D8CFEF'],
  Dispatched:['It’s on the move.','Your order has been dispatched. Keep your phone close for delivery updates.','#C9E6D1'],
  Delivered:['Made it to you ♡','Your order has been marked as delivered. We hope you love every piece.','#F7D6A5'],
  Cancelled:['Order update.','This order has been marked as cancelled. If this looks unexpected, reply to this email and we’ll help.','#E8DDE1']
};
async function sendStatus(order,status){
  if(!order?.email)return {skipped:true};
  const access=await ensureTrackingToken(order.id,order);const [title,lead,accent]=statusCopy[status]||['Your order has an update.',`Your order is now ${status}.`,'#F4B6CA'];
  return resend({to:order.email,subject:`${order.id} is now ${status}`,html:shell({eyebrow:`ORDER ${String(status).toUpperCase()}`,title,lead,body:`${infoGrid([['Order',order.id],['Current status',status],['Fulfilment',order.fulfilment||'Delivery'],['Order total',money(order.total)]])}${paragraph('Tap below to open this exact order. No email, phone number or account sign-in is needed from this link.')}`,cta:'Track this order',ctaUrl:trackingUrl(access.token),accent})});
}

async function sendSubscriber(doc){
 const customer=doc.email?resend({to:doc.email,subject:'You’re on the Band Factory list ♡',html:shell({eyebrow:'YOU’RE IN',title:'First dibs look good on you.',lead:'You’re now on the Band Factory updates list.',body:`${paragraph('Expect new drops, restocks, colour news and the occasional very good reason to refresh your wardrobe.')}${infoGrid([['Email',doc.email],['Status','Subscribed']])}`,cta:'See what’s new',ctaUrl:`${SITE_URL()}/shop.html`,accent:'#F4B6CA'})}):Promise.resolve({skipped:true});
 const admin=resend({to:ADMIN_EMAIL,replyTo:doc.email||undefined,subject:`New subscriber · ${doc.email||'Band Factory list'}`,html:shell({eyebrow:'AUDIENCE GROWTH',title:'Someone joined the list.',lead:'A new shopper subscribed for Band Factory updates.',body:infoGrid([['Name',doc.name||'Not provided'],['Email',doc.email],['Joined',date(doc.createdAt)]]),cta:'Open subscribers',ctaUrl:`${SITE_URL()}/admin.html#subscribersPanel`,accent:'#D8CFEF'})});
 return Promise.allSettled([customer,admin]);
}

async function sendContact(doc){
 const customer=doc.email?resend({to:doc.email,subject:'Message received · Band Factory',html:shell({eyebrow:'MESSAGE RECEIVED',title:'Your note made it to us.',lead:'Thanks for reaching out. We’ll get back to you as soon as we can.',body:`${quote(doc.message||'')}${paragraph('You can reply to this email if you need to add anything else.')}`,cta:'Back to Band Factory',ctaUrl:`${SITE_URL()}/index.html`,accent:'#D8CFEF'})}):Promise.resolve({skipped:true});
 const admin=resend({to:ADMIN_EMAIL,replyTo:doc.email||undefined,subject:`New website message · ${doc.name||'Customer'}`,html:shell({eyebrow:'NEW MESSAGE',title:'Your inbox has company.',lead:`${doc.name||'A visitor'} sent a message from the website.`,body:`${infoGrid([['Name',doc.name],['Email',doc.email],['Phone',doc.phone],['Received',date(doc.createdAt)]])}${quote(doc.message||'')}`,cta:'Open messages',ctaUrl:`${SITE_URL()}/admin.html#messagesPanel`,accent:'#C9E6D1'})});
 return Promise.allSettled([customer,admin]);
}

async function sendReview(doc){
 const stars='★'.repeat(Math.max(0,Math.min(5,Number(doc.rating)||0)));
 const customer=doc.email?resend({to:doc.email,subject:'We received your review ♡',html:shell({eyebrow:'REVIEW RECEIVED',title:'Thank you for saying it.',lead:'Your review is in and waiting for approval.',body:`<div style="font-family:Arial,sans-serif;font-size:24px;letter-spacing:3px;color:#E890AE;margin:20px 0">${stars}</div>${quote(doc.review||'')}${paragraph('Once approved, your review may appear on the Band Factory website.')}`,cta:'Keep browsing',ctaUrl:`${SITE_URL()}/shop.html`,accent:'#F4B6CA'})}):Promise.resolve({skipped:true});
 const admin=resend({to:ADMIN_EMAIL,replyTo:doc.email||undefined,subject:`New ${doc.rating||0}-star review · ${doc.name||'Customer'}`,html:shell({eyebrow:'NEW REVIEW',title:'A customer left a little love.',lead:'A new review is waiting for approval.',body:`<div style="font-family:Arial,sans-serif;font-size:24px;letter-spacing:3px;color:#E890AE;margin:20px 0">${stars}</div>${infoGrid([['Name',doc.name],['Email',doc.email],['City',doc.city],['Purchased?',doc.purchased?'Yes':'Not confirmed'],['Status',doc.status||'pending']])}${quote(doc.review||'')}`,cta:'Review it in admin',ctaUrl:`${SITE_URL()}/admin.html#reviewsPanel`,accent:'#E890AE'})});
 return Promise.allSettled([customer,admin]);
}

async function sendGenericCustomer({to,name,subject,message,details,actionText,actionUrl}){
 return resend({to,subject,html:shell({eyebrow:'FROM BAND FACTORY',title:subject,lead:`Hi ${name||'there'},`,body:`${paragraph(message||'')}${details?quote(details):''}`,cta:actionText||'Visit Band Factory',ctaUrl:actionUrl||`${SITE_URL()}/index.html`,accent:'#D8CFEF'})});
}
async function sendBroadcast({to,name,subject,message}){
 return resend({to,subject,html:shell({eyebrow:'BAND FACTORY UPDATE',title:subject,lead:`Hi ${name||'there'},`,body:`${paragraph(message)}${paragraph('You’re receiving this because you joined the Band Factory email list.')}`,cta:'Shop Band Factory',ctaUrl:`${SITE_URL()}/shop.html`,accent:'#F4B6CA'})});
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

module.exports={admin,db,ADMIN_EMAIL,FROM_EMAIL,SITE_URL,esc,money,date,normalizePhone,statusKey,resend,shell,infoGrid,paragraph,quote,ensureTrackingToken,trackingUrl,sendPurchase,sendStatus,sendSubscriber,sendContact,sendReview,sendGenericCustomer,sendBroadcast,getAdmin,dispatchStoredEvent};
