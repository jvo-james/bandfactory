const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: String(process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    })
  });
}
const db = admin.firestore();
const number = value => Number(value || 0);
const normalizePhone = value => {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length >= 10) digits = '233' + digits.slice(1);
  return digits;
};

exports.handler = async function(event) {
  const headers = {'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'};
  if (event.httpMethod === 'OPTIONS') return {statusCode:204,headers,body:''};
  if (event.httpMethod !== 'POST') return {statusCode:405,headers,body:JSON.stringify({ok:false,error:'POST required'})};
  try {
    const secret=process.env.PAYSTACK_SECRET_KEY;
    if(!secret) return {statusCode:500,headers,body:JSON.stringify({ok:false,error:'Payment verification is not configured yet.'})};
    const body=JSON.parse(event.body||'{}'),order=body.order||{},reference=String(body.reference||'').trim();
    if(!order.id||!reference) return {statusCode:400,headers,body:JSON.stringify({ok:false,error:'Order details are incomplete.'})};
    const response=await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,{headers:{Authorization:`Bearer ${secret}`}});
    const verification=await response.json().catch(()=>({})),data=verification?.data;
    if(!response.ok||!verification.status||data?.status!=='success') return {statusCode:400,headers,body:JSON.stringify({ok:false,error:'Paystack could not confirm this payment.'})};
    const expectedAmount=Math.round(number(order.total)*100),paidAmount=number(data.amount),currency=String(data.currency||'').toUpperCase();
    if(paidAmount!==expectedAmount||currency!=='GHS') return {statusCode:400,headers,body:JSON.stringify({ok:false,error:'The confirmed payment does not match this order.'})};

    const deductions={flat:{},twisted:{}}; let unallocatedWholesale=0;
    const add=(style,color,qty)=>{style=String(style||'flat').toLowerCase();qty=number(qty);if(!['flat','twisted'].includes(style)||!color||qty<=0)return;deductions[style][color]=(deductions[style][color]||0)+qty};
    for(const item of order.items||[]){
      const mult=number(item.qty||1);
      if(item.type==='retail'&&(item.material||'smooth')==='smooth') add(item.style||'flat',item.color,number(item.qty));
      if(item.type==='wholesale'&&(item.material||'smooth')==='smooth'){
        if(item.wholesaleMode==='custom'&&item.allocations){
          if(item.style==='mixed') for(const [style,colors] of Object.entries(item.allocations||{})) for(const [color,qty] of Object.entries(colors||{})) add(style,color,number(qty)*mult);
          else for(const [color,qty] of Object.entries(item.allocations||{})) add(item.style||'flat',color,number(qty)*mult);
        } else unallocatedWholesale+=number(item.bundlePieces)*mult;
      }
    }
    const hasManagedStock=Object.values(deductions.flat).some(Boolean)||Object.values(deductions.twisted).some(Boolean);
    const paymentRef=db.collection('paymentReferences').doc(reference),orderRef=db.collection('orders').doc(order.id),productRef=db.doc('products/smooth');
    const customerRef=db.collection('customers').doc(),notifRef=db.collection('notifications').doc(),activityRef=db.collection('activity').doc(),inventoryNotifRef=db.collection('notifications').doc(),shortageNotifRef=db.collection('notifications').doc();
    const abandonedRef=order.abandonedCartId?db.collection('abandonedCarts').doc(order.abandonedCartId):null;

    await db.runTransaction(async tx=>{
      const seen=await tx.get(paymentRef); if(seen.exists)return;
      let productSnap=null,styles=null,stockSyncStatus='not-required'; const shortages=[];
      if(hasManagedStock) productSnap=await tx.get(productRef);
      if(hasManagedStock&&productSnap?.exists){
        const product=productSnap.data()||{}; styles=JSON.parse(JSON.stringify(product.styles||{}));
        for(const style of ['flat','twisted']) for(const [color,qty] of Object.entries(deductions[style])){
          styles[style] ||= {colors:{}}; styles[style].colors ||= {};
          const current=styles[style].colors[color]||product.colors?.[color]||{},currentStock=number(current.stock);
          if(currentStock<qty) shortages.push(`${color} ${style}: ordered ${qty}, recorded ${currentStock}`);
          styles[style].colors[color]={...current,stock:Math.max(0,currentStock-qty)};
        }
        stockSyncStatus='updated';
      } else if(hasManagedStock) stockSyncStatus='needs-review';
      const serverTime=admin.firestore.FieldValue.serverTimestamp();
      tx.set(orderRef,{...order,payment:'Paid',serverVerified:true,stockSyncStatus,verification:{reference,amount:paidAmount,currency,paidAt:data.paid_at||null,channel:data.channel||''},verifiedAt:serverTime},{merge:false});
      tx.set(paymentRef,{orderId:order.id,amount:paidAmount,currency,createdAt:serverTime},{merge:false});
    //  if(styles)tx.set(productRef,{styles,updatedAt:serverTime},{merge:true});
      tx.set(customerRef,{name:order.name||'',email:order.email||'',phone:order.phone||'',normalizedPhone:normalizePhone(order.phone),orderId:order.id,total:number(order.total),type:order.type||'Retail',city:order.city||'',region:order.region||'',country:order.country||'',countryCode:order.countryCode||'',source:order.source||'Direct / Unknown',lastOrderAt:serverTime,createdAt:serverTime});
      tx.set(notifRef,{type:'purchase',title:'New paid order',message:`${order.name||'Customer'} placed ${order.id} for GHS ${number(order.total).toFixed(2)}.`,orderId:order.id,read:false,createdAt:serverTime});
      tx.set(activityRef,{action:'Paid order created',orderId:order.id,total:number(order.total),paystackReference:reference,source:order.source||'Direct / Unknown',createdAt:serverTime});
      if(abandonedRef)tx.set(abandonedRef,{status:'recovered',orderId:order.id,recoveredAt:serverTime,updatedAt:serverTime},{merge:true});
      if(unallocatedWholesale>0)tx.set(inventoryNotifRef,{type:'inventory',title:'Wholesale stock needs a quick check',message:`${unallocatedWholesale} standard-mix wholesale pieces from ${order.id} need to be deducted from the colours you actually pack.`,orderId:order.id,read:false,createdAt:serverTime});
      if(hasManagedStock&&!productSnap?.exists)tx.set(shortageNotifRef,{type:'inventory',title:'Please check this order and stock',message:`${order.id} was paid successfully, but the inventory list could not be found. The order is saved. Please compare it with your stock count.`,orderId:order.id,read:false,createdAt:serverTime});
      else if(shortages.length)tx.set(shortageNotifRef,{type:'inventory',title:'Please check these stock counts',message:`${order.id} used more stock than the saved count showed: ${shortages.join('; ')}. The affected colours were set to zero.`,orderId:order.id,read:false,createdAt:serverTime});
    });
    return {statusCode:200,headers,body:JSON.stringify({ok:true,verification:{reference,status:data.status,amount:paidAmount,currency,paidAt:data.paid_at||null,channel:data.channel||''}})};
  } catch(error){console.error('[Band Factory] verify-payment error',error);return {statusCode:500,headers,body:JSON.stringify({ok:false,error:'We received the payment response but could not finish saving the order automatically. Please contact Band Factory if this continues.'})}}
};
