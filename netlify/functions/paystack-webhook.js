const crypto=require('crypto');
const admin=require('firebase-admin');
const {number,applyOrderToStock,orderUsesManagedStock,orderUsesSmoothStock,orderUsesApparelStock}=require('./order-stock');
if(!admin.apps.length){admin.initializeApp({credential:admin.credential.cert({projectId:process.env.FIREBASE_PROJECT_ID,clientEmail:process.env.FIREBASE_CLIENT_EMAIL,privateKey:String(process.env.FIREBASE_PRIVATE_KEY||'').replace(/\\n/g,'\n')})});}
const db=admin.firestore();
const normalizePhone=value=>{let digits=String(value||'').replace(/\D/g,'');if(digits.startsWith('0')&&digits.length>=10)digits='233'+digits.slice(1);return digits};
function getOrderId(metadata={}){if(metadata.order_id)return String(metadata.order_id).trim();const f=(Array.isArray(metadata.custom_fields)?metadata.custom_fields:[]).find(x=>x?.variable_name==='order_id');return String(f?.value||'').trim();}
exports.handler=async event=>{
 if(event.httpMethod!=='POST')return {statusCode:405,body:'Method Not Allowed'};
 try{
  const secret=process.env.PAYSTACK_SECRET_KEY;if(!secret)return {statusCode:500,body:'Webhook not configured'};
  const signature=event.headers['x-paystack-signature']||event.headers['X-Paystack-Signature']||'';const hash=crypto.createHmac('sha512',secret).update(event.body||'').digest('hex');if(!signature||hash!==signature)return {statusCode:401,body:'Invalid signature'};
  const payload=JSON.parse(event.body||'{}');if(payload.event!=='charge.success'||payload.data?.status!=='success')return {statusCode:200,body:'Event ignored'};
  const payment=payload.data||{},reference=String(payment.reference||'').trim(),orderId=getOrderId(payment.metadata);if(!reference||!orderId)return {statusCode:400,body:'Missing payment reference or order ID'};
  const orderRef=db.collection('orders').doc(orderId),paymentRef=db.collection('paymentReferences').doc(reference),productRef=db.doc('products/smooth'),apparelRef=db.doc('products/spandexTubeTop'),reservationRef=db.collection('stockReservations').doc(orderId);const snap=await orderRef.get();if(!snap.exists)return {statusCode:404,body:'Order not found'};
  const order=snap.data()||{},expected=Math.round(number(order.total)*100),paid=number(payment.amount),currency=String(payment.currency||'').toUpperCase();if(paid!==expected||currency!=='GHS')return {statusCode:400,body:'Payment does not match order'};
  await db.runTransaction(async tx=>{
   const seen=await tx.get(paymentRef);if(seen.exists)return;const latestSnap=await tx.get(orderRef);if(!latestSnap.exists)throw new Error('Order disappeared');const latest=latestSnap.data()||{};
   const reservationSnap=await tx.get(reservationRef);const hasReservation=reservationSnap.exists&&['reserved','finalized'].includes(reservationSnap.data()?.status);
   let stockResult=null,productSnap=null,apparelSnap=null;if(orderUsesManagedStock(latest)&&!hasReservation){if(orderUsesSmoothStock(latest))productSnap=await tx.get(productRef);if(orderUsesApparelStock(latest))apparelSnap=await tx.get(apparelRef);if((!orderUsesSmoothStock(latest)||productSnap?.exists)&&(!orderUsesApparelStock(latest)||apparelSnap?.exists))stockResult=applyOrderToStock(latest,productSnap?.data()||{},apparelSnap?.data()||{});}
   if(stockResult?.shortages?.length)throw new Error(`Paid order ${orderId} has insufficient stock: ${stockResult.shortages.join('; ')}`);
   const t=admin.firestore.FieldValue.serverTimestamp(),stockSyncStatus=orderUsesManagedStock(latest)?(hasReservation?'updated':(stockResult?'updated':'needs-review')):'not-required';
   tx.set(orderRef,{payment:'Paid',status:'Preparing',paystackReference:reference,serverVerified:true,stockSyncStatus,verification:{reference,amount:paid,currency,paidAt:payment.paid_at||null,channel:payment.channel||''},verifiedAt:t,updatedAt:t},{merge:true});
   tx.set(paymentRef,{orderId,amount:paid,currency,createdAt:t},{merge:false});if(stockResult&&orderUsesSmoothStock(latest))tx.set(productRef,{styles:stockResult.styles,colors:stockResult.styles.flat?.colors||{},updatedAt:t},{merge:true});if(stockResult&&orderUsesApparelStock(latest))tx.set(apparelRef,{sizes:stockResult.sizes,updatedAt:t},{merge:true});
   if(hasReservation&&reservationSnap.data()?.status==='reserved')tx.set(reservationRef,{status:'finalized',paymentReference:reference,finalizedAt:t},{merge:true});
   tx.set(db.collection('customers').doc(),{name:latest.name||'',email:latest.email||'',phone:latest.phone||'',normalizedPhone:normalizePhone(latest.phone),orderId,total:number(latest.total),type:latest.type||'Retail',city:latest.city||'',region:latest.region||'',country:latest.country||'',countryCode:latest.countryCode||'',source:latest.source||'Direct / Unknown',lastOrderAt:t,createdAt:t});
   tx.set(db.collection('notifications').doc(),{type:'purchase',title:'New paid order',message:`${latest.name||'Customer'} placed ${orderId} for GHS ${number(latest.total).toFixed(2)}.`,orderId,read:false,createdAt:t});
   tx.set(db.collection('activity').doc(),{action:'Paid order created',orderId,total:number(latest.total),paystackReference:reference,source:latest.source||'Direct / Unknown',createdAt:t});
   if(latest.abandonedCartId)tx.set(db.collection('abandonedCarts').doc(latest.abandonedCartId),{status:'recovered',orderId,recoveredAt:t,updatedAt:t},{merge:true});
   if(orderUsesManagedStock(latest)&&!hasReservation&&((orderUsesSmoothStock(latest)&&!productSnap?.exists)||(orderUsesApparelStock(latest)&&!apparelSnap?.exists)))tx.set(db.collection('notifications').doc(),{type:'inventory',title:'Inventory setup needs attention',message:`${orderId} was paid, but a managed inventory document was not found. Please check stock manually.`,orderId,read:false,createdAt:t});
   else if(stockResult?.shortages?.length)tx.set(db.collection('notifications').doc(),{type:'inventory',title:'Stock count needs checking',message:`${orderId}: ${stockResult.shortages.join('; ')}`,orderId,read:false,createdAt:t});
  });
  return {statusCode:200,body:'OK'};
 }catch(error){console.error('[Band Factory Webhook]',error);return {statusCode:500,body:'Could not finalise payment'};}
};
