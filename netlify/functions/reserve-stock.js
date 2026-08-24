const admin=require('firebase-admin');
const crypto=require('crypto');
const {applyOrderToStock,orderUsesManagedStock}=require('./order-stock');
if(!admin.apps.length){admin.initializeApp({credential:admin.credential.cert({projectId:process.env.FIREBASE_PROJECT_ID,clientEmail:process.env.FIREBASE_CLIENT_EMAIL,privateKey:String(process.env.FIREBASE_PRIVATE_KEY||'').replace(/\\n/g,'\n')})});}
const db=admin.firestore();
const hash=value=>crypto.createHash('sha256').update(String(value||'')).digest('hex');
const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'};

exports.handler=async event=>{
  if(event.httpMethod==='OPTIONS')return {statusCode:204,headers,body:''};
  if(event.httpMethod!=='POST')return {statusCode:405,headers,body:JSON.stringify({ok:false,error:'POST required'})};
  try{
    const body=JSON.parse(event.body||'{}'),orderId=String(body.orderId||'').trim(),token=String(body.token||'');
    if(!/^BF-\d{5,}$/.test(orderId)||!token)return {statusCode:400,headers,body:JSON.stringify({ok:false,error:'Checkout reservation details are incomplete.'})};
    const tokenRef=db.collection('checkoutTokens').doc(orderId),orderRef=db.collection('orders').doc(orderId),reservationRef=db.collection('stockReservations').doc(orderId),productRef=db.doc('products/smooth');
    const result=await db.runTransaction(async tx=>{
      const [tokenSnap,orderSnap,reservationSnap]=await Promise.all([tx.get(tokenRef),tx.get(orderRef),tx.get(reservationRef)]);
      if(!tokenSnap.exists||tokenSnap.data()?.tokenHash!==hash(token))throw new Error('This checkout session is no longer valid. Please refresh your Bag and try again.');
      if(!orderSnap.exists)throw new Error('Your pending order could not be found. Please try checkout again.');
      const order=orderSnap.data()||{};
      if(order.payment==='Paid')return {alreadyPaid:true};
      if(reservationSnap.exists&&reservationSnap.data()?.status==='reserved')return {reserved:true};
      if(!orderUsesManagedStock(order)){
        tx.set(reservationRef,{orderId,status:'not-required',createdAt:admin.firestore.FieldValue.serverTimestamp()},{merge:false});
        return {reserved:true};
      }
      const productSnap=await tx.get(productRef);
      if(!productSnap.exists)throw new Error('Inventory is temporarily unavailable. Please try again in a moment.');
      const stockResult=applyOrderToStock(order,productSnap.data()||{});
      if(stockResult.shortages.length){
        const error=new Error(stockResult.shortages[0]);error.code='OUT_OF_STOCK';throw error;
      }
      const now=admin.firestore.Timestamp.now(),expiresAt=admin.firestore.Timestamp.fromMillis(now.toMillis()+20*60*1000);
      tx.set(productRef,{styles:stockResult.styles,colors:stockResult.styles.flat?.colors||{},updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
      tx.set(reservationRef,{orderId,status:'reserved',deducted:stockResult.deducted,createdAt:now,expiresAt},{merge:false});
      tx.set(orderRef,{stockSyncStatus:'reserved',stockReservedAt:now},{merge:true});
      return {reserved:true};
    });
    return {statusCode:200,headers,body:JSON.stringify({ok:true,...result})};
  }catch(error){
    console.error('[Band Factory] reserve-stock',error);
    const unavailable=error?.code==='OUT_OF_STOCK'||/needed|available|stock|sold out/i.test(error?.message||'');
    return {statusCode:unavailable?409:500,headers,body:JSON.stringify({ok:false,error:unavailable?'That quantity just sold out while you were checking out. Please review your Bag and try again.':(error?.message||'Could not reserve stock for checkout.')})};
  }
};
