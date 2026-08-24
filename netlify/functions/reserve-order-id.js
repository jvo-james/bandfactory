const admin=require('firebase-admin');
const crypto=require('crypto');
if(!admin.apps.length){admin.initializeApp({credential:admin.credential.cert({projectId:process.env.FIREBASE_PROJECT_ID,clientEmail:process.env.FIREBASE_CLIENT_EMAIL,privateKey:String(process.env.FIREBASE_PRIVATE_KEY||'').replace(/\\n/g,'\n')})});}
const db=admin.firestore();
exports.handler=async event=>{
  const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'};
  if(event.httpMethod==='OPTIONS')return {statusCode:204,headers,body:''};
  if(event.httpMethod!=='POST')return {statusCode:405,headers,body:JSON.stringify({ok:false,error:'POST required'})};
  try{
    const ref=db.doc('settings/orderSequence');
    const next=await db.runTransaction(async tx=>{
      const snap=await tx.get(ref);let current=Number(snap.exists?snap.data().lastNumber:0)||0;
      if(!current){
        const orders=await db.collection('orders').get();
        const maxExisting=orders.docs.reduce((max,d)=>{const data=d.data()||{};const id=String(data.displayId||data.id||d.id);const m=id.match(/^BF-(\d{5,})$/);return m?Math.max(max,Number(m[1])):max;},0);current=Math.max(orders.size,maxExisting);
      }
      const value=current+1;tx.set(ref,{lastNumber:value,updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});return value;
    });
    const orderId=`BF-${String(next).padStart(5,'0')}`,token=crypto.randomBytes(24).toString('hex'),tokenHash=crypto.createHash('sha256').update(token).digest('hex');
    await db.collection('checkoutTokens').doc(orderId).set({tokenHash,createdAt:admin.firestore.FieldValue.serverTimestamp()},{merge:false});
    return {statusCode:200,headers,body:JSON.stringify({ok:true,orderId,token})};
  }catch(error){console.error(error);return {statusCode:500,headers,body:JSON.stringify({ok:false,error:'Could not reserve an order number.'})};}
};
