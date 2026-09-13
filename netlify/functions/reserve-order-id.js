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
        // Recover the sequence with a single document read instead of scanning every order.
        // Order document IDs are BF-00001, BF-00002, ... so descending document ID gives the latest one.
        const latestQuery=db.collection('orders').orderBy(admin.firestore.FieldPath.documentId(),'desc').limit(1);
        const latest=await tx.get(latestQuery);
        if(!latest.empty){
          const doc=latest.docs[0],data=doc.data()||{},id=String(data.displayId||data.id||doc.id),m=id.match(/^BF-(\d{5,})$/);
          current=m?Number(m[1]):0;
        }
      }
      const value=current+1;tx.set(ref,{lastNumber:value,updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});return value;
    });
    const orderId=`BF-${String(next).padStart(5,'0')}`,token=crypto.randomBytes(24).toString('hex'),tokenHash=crypto.createHash('sha256').update(token).digest('hex');
    await db.collection('checkoutTokens').doc(orderId).set({tokenHash,createdAt:admin.firestore.FieldValue.serverTimestamp()},{merge:false});
    return {statusCode:200,headers,body:JSON.stringify({ok:true,orderId,token})};
  }catch(error){console.error(error);return {statusCode:500,headers,body:JSON.stringify({ok:false,error:'Could not reserve an order number.'})};}
};
