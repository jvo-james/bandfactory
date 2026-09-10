const core=require('./email-core');
const json=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'},body:JSON.stringify(body)});
const publicOrder=o=>({id:o.id,status:o.status||'Preparing',payment:o.payment||'',name:o.name||'',createdAt:o.createdAt||'',fulfilment:o.fulfilment||'',fulfilmentDate:o.fulfilmentDate||'',pickupDate:o.pickupDate||'',pickupAddress:o.pickupAddress||'',country:o.country||'',region:o.region||'',city:o.city||'',items:(o.items||[]).map(i=>({name:i.name||'Band Factory item',color:i.color||'',size:i.size||'',style:i.style||'',qty:Number(i.qty||1),price:Number(i.price||0),image:i.image||''})),subtotal:Number(o.subtotal||0),processingFee:Number(o.processingFee||0),deliveryFee:o.deliveryFee==null?null:Number(o.deliveryFee),deliveryFeeStatus:o.deliveryFeeStatus||'',total:Number(o.total||0)});
exports.handler=async event=>{
 if(event.httpMethod==='OPTIONS')return json(204,{});if(event.httpMethod!=='POST')return json(405,{ok:false,error:'POST required'});
 try{
  const b=JSON.parse(event.body||'{}');const token=String(b.token||'').trim();let snap=null;
  if(token){const q=await core.db.collection('orders').where('trackingToken','==',token).limit(1).get();if(!q.empty)snap=q.docs[0];}
  else{
    const orderId=String(b.orderId||'').trim().toUpperCase();if(!orderId)return json(400,{ok:false,error:'Enter your order number.'});snap=await core.db.collection('orders').doc(orderId).get();if(!snap.exists)return json(404,{ok:false,error:'We could not match those order details.'});
    const o=snap.data()||{},email=String(b.email||'').trim().toLowerCase(),phone=core.normalizePhone(b.phone);const emailOk=email&&String(o.email||'').trim().toLowerCase()===email;const phoneOk=phone&&core.normalizePhone(o.phone)===phone;if(!emailOk&&!phoneOk)return json(404,{ok:false,error:'We could not match those order details.'});
  }
  if(!snap||!snap.exists)return json(404,{ok:false,error:'We could not find that order.'});let order={id:snap.id,...snap.data()};if(order.payment!=='Paid')return json(404,{ok:false,error:'We could not find a confirmed order with those details.'});const access=await core.ensureTrackingToken(order.id,order);order=access.order;
  return json(200,{ok:true,token:access.token,order:publicOrder(order)});
 }catch(error){console.error('[Band Factory track-order]',error);return json(500,{ok:false,error:'Order tracking is temporarily unavailable. Please try again.'});}
};
