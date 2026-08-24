const admin=require('firebase-admin');
const crypto=require('crypto');
const {restoreDeductions}=require('./order-stock');
if(!admin.apps.length){admin.initializeApp({credential:admin.credential.cert({projectId:process.env.FIREBASE_PROJECT_ID,clientEmail:process.env.FIREBASE_CLIENT_EMAIL,privateKey:String(process.env.FIREBASE_PRIVATE_KEY||'').replace(/\\n/g,'\n')})});}
const db=admin.firestore();
const hash=value=>crypto.createHash('sha256').update(String(value||'')).digest('hex');
const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'};
exports.handler=async event=>{
  if(event.httpMethod==='OPTIONS')return {statusCode:204,headers,body:''};
  if(event.httpMethod!=='POST')return {statusCode:405,headers,body:JSON.stringify({ok:false,error:'POST required'})};
  try{
    const body=JSON.parse(event.body||'{}'),orderId=String(body.orderId||'').trim(),token=String(body.token||'');
    if(!orderId||!token)return {statusCode:400,headers,body:JSON.stringify({ok:false})};
    const tokenRef=db.collection('checkoutTokens').doc(orderId),orderRef=db.collection('orders').doc(orderId),reservationRef=db.collection('stockReservations').doc(orderId),productRef=db.doc('products/smooth');
    await db.runTransaction(async tx=>{
      const [tokenSnap,orderSnap,reservationSnap]=await Promise.all([tx.get(tokenRef),tx.get(orderRef),tx.get(reservationRef)]);
      if(!tokenSnap.exists||tokenSnap.data()?.tokenHash!==hash(token))throw new Error('Invalid checkout session');
      if(!reservationSnap.exists||reservationSnap.data()?.status!=='reserved')return;
      if(orderSnap.exists&&orderSnap.data()?.payment==='Paid'){
        tx.set(reservationRef,{status:'finalized',finalizedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
        return;
      }
      const productSnap=await tx.get(productRef);
      if(productSnap.exists){
        const styles=restoreDeductions(productSnap.data()||{},reservationSnap.data()?.deducted||{});
        tx.set(productRef,{styles,colors:styles.flat?.colors||{},updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
      }
      tx.set(reservationRef,{status:'released',releasedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
      if(orderSnap.exists)tx.set(orderRef,{stockSyncStatus:'released'},{merge:true});
    });
    return {statusCode:200,headers,body:JSON.stringify({ok:true})};
  }catch(error){console.error('[Band Factory] release-stock',error);return {statusCode:500,headers,body:JSON.stringify({ok:false})};}
};
