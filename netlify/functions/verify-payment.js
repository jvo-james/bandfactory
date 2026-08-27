const admin=require('firebase-admin');
const {number,applyOrderToStock,defaultCatalog,orderUsesManagedStock,orderUsesSmoothStock,orderUsesApparelStock,orderUsesCatalogStock}=require('./order-stock');
if(!admin.apps.length){admin.initializeApp({credential:admin.credential.cert({projectId:process.env.FIREBASE_PROJECT_ID,clientEmail:process.env.FIREBASE_CLIENT_EMAIL,privateKey:String(process.env.FIREBASE_PRIVATE_KEY||'').replace(/\\n/g,'\n')})});}
const db=admin.firestore();
const normalizePhone=value=>{let digits=String(value||'').replace(/\D/g,'');if(digits.startsWith('0')&&digits.length>=10)digits='233'+digits.slice(1);return digits};
exports.handler=async event=>{
 const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'};
 if(event.httpMethod==='OPTIONS')return {statusCode:204,headers,body:''};
 if(event.httpMethod!=='POST')return {statusCode:405,headers,body:JSON.stringify({ok:false,error:'POST required'})};
 try{
  const secret=process.env.PAYSTACK_SECRET_KEY;if(!secret)return {statusCode:500,headers,body:JSON.stringify({ok:false,error:'Payment verification is not configured yet.'})};
  const body=JSON.parse(event.body||'{}'),order=body.order||{},reference=String(body.reference||'').trim();if(!order.id||!reference)return {statusCode:400,headers,body:JSON.stringify({ok:false,error:'Order details are incomplete.'})};
  const response=await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,{headers:{Authorization:`Bearer ${secret}`}});const verification=await response.json().catch(()=>({})),data=verification?.data;
  if(!response.ok||!verification.status||data?.status!=='success')return {statusCode:400,headers,body:JSON.stringify({ok:false,error:'Paystack could not confirm this payment.'})};
  const expected=Math.round(number(order.total)*100),paid=number(data.amount),currency=String(data.currency||'').toUpperCase();if(paid!==expected||currency!=='GHS')return {statusCode:400,headers,body:JSON.stringify({ok:false,error:'The confirmed payment does not match this order.'})};
  const paymentRef=db.collection('paymentReferences').doc(reference),orderRef=db.collection('orders').doc(order.id),productRef=db.doc('products/smooth'),apparelRef=db.doc('products/spandexTubeTop'),catalogRef=db.doc('products/catalog'),reservationRef=db.collection('stockReservations').doc(order.id);
  await db.runTransaction(async tx=>{
   const seen=await tx.get(paymentRef);if(seen.exists)return;
   const reservationSnap=await tx.get(reservationRef);
   const hasReservation=reservationSnap.exists&&['reserved','finalized'].includes(reservationSnap.data()?.status);
   let stockResult=null,productSnap=null,apparelSnap=null,catalogSnap=null;
   if(orderUsesManagedStock(order)&&!hasReservation){if(orderUsesSmoothStock(order))productSnap=await tx.get(productRef);if(orderUsesApparelStock(order))apparelSnap=await tx.get(apparelRef);if(orderUsesCatalogStock(order))catalogSnap=await tx.get(catalogRef);if((!orderUsesSmoothStock(order)||productSnap?.exists)&&(!orderUsesApparelStock(order)||apparelSnap?.exists))stockResult=applyOrderToStock(order,productSnap?.data()||{},apparelSnap?.data()||{},catalogSnap?.exists?catalogSnap.data():defaultCatalog());}
   if(stockResult?.shortages?.length)throw new Error(`Paid order ${order.id} has insufficient stock: ${stockResult.shortages.join('; ')}`);
   const t=admin.firestore.FieldValue.serverTimestamp(),stockSyncStatus=orderUsesManagedStock(order)?(hasReservation?'updated':(stockResult?'updated':'needs-review')):'not-required';
   tx.set(orderRef,{...order,payment:'Paid',status:'Preparing',serverVerified:true,stockSyncStatus,verification:{reference,amount:paid,currency,paidAt:data.paid_at||null,channel:data.channel||''},verifiedAt:t},{merge:false});
   tx.set(paymentRef,{orderId:order.id,amount:paid,currency,createdAt:t},{merge:false});
   if(stockResult&&orderUsesSmoothStock(order))tx.set(productRef,{styles:stockResult.styles,colors:stockResult.styles.flat?.colors||{},updatedAt:t},{merge:true});if(stockResult&&orderUsesApparelStock(order))tx.set(apparelRef,{sizes:stockResult.sizes,updatedAt:t},{merge:true});if(stockResult&&orderUsesCatalogStock(order))tx.set(catalogRef,{...stockResult.catalog,updatedAt:t},{merge:false});
   if(hasReservation&&reservationSnap.data()?.status==='reserved')tx.set(reservationRef,{status:'finalized',paymentReference:reference,finalizedAt:t},{merge:true});
   const customerRef=db.collection('customers').doc();tx.set(customerRef,{name:order.name||'',email:order.email||'',phone:order.phone||'',normalizedPhone:normalizePhone(order.phone),orderId:order.id,total:number(order.total),type:order.type||'Retail',city:order.city||'',region:order.region||'',country:order.country||'',countryCode:order.countryCode||'',source:order.source||'Direct / Unknown',lastOrderAt:t,createdAt:t});
   tx.set(db.collection('notifications').doc(),{type:'purchase',title:'New paid order',message:`${order.name||'Customer'} placed ${order.id} for GHS ${number(order.total).toFixed(2)}.`,orderId:order.id,read:false,createdAt:t});
   tx.set(db.collection('activity').doc(),{action:'Paid order created',orderId:order.id,total:number(order.total),paystackReference:reference,source:order.source||'Direct / Unknown',createdAt:t});
   if(order.abandonedCartId)tx.set(db.collection('abandonedCarts').doc(order.abandonedCartId),{status:'recovered',orderId:order.id,recoveredAt:t,updatedAt:t},{merge:true});
   if(orderUsesManagedStock(order)&&!hasReservation&&((orderUsesSmoothStock(order)&&!productSnap?.exists)||(orderUsesApparelStock(order)&&!apparelSnap?.exists)))tx.set(db.collection('notifications').doc(),{type:'inventory',title:'Inventory setup needs attention',message:`${order.id} was paid, but a managed inventory document was not found. Please check stock manually.`,orderId:order.id,read:false,createdAt:t});
   else if(stockResult?.shortages?.length)tx.set(db.collection('notifications').doc(),{type:'inventory',title:'Stock count needs checking',message:`${order.id}: ${stockResult.shortages.join('; ')}`,orderId:order.id,read:false,createdAt:t});
  });
  return {statusCode:200,headers,body:JSON.stringify({ok:true,verification:{reference,status:data.status,amount:paid,currency,paidAt:data.paid_at||null,channel:data.channel||''}})};
 }catch(error){console.error('[Band Factory] verify-payment error',error);return {statusCode:500,headers,body:JSON.stringify({ok:false,error:'We received the payment response but could not finish saving the order automatically.'})};}
};
