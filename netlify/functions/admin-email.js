const core=require('./email-core');
const json=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'POST, OPTIONS'},body:JSON.stringify(body)});
exports.handler=async event=>{
 if(event.httpMethod==='OPTIONS')return json(204,{});if(event.httpMethod!=='POST')return json(405,{ok:false,error:'POST required'});
 try{
  await core.getAdmin(event);const b=JSON.parse(event.body||'{}'),action=String(b.action||'');
  if(action==='status'){
    const id=String(b.orderId||'').trim(),status=String(b.status||'').trim(),allowed=['Preparing','Ready','Dispatched','Delivered','Cancelled'];if(!id||!allowed.includes(status))return json(400,{ok:false,error:'Invalid order update.'});
    const ref=core.db.collection('orders').doc(id),snap=await ref.get();if(!snap.exists)return json(404,{ok:false,error:'Order not found.'});
    await ref.set({status,statusUpdatedAt:core.admin.firestore.FieldValue.serverTimestamp(),updatedAt:core.admin.firestore.FieldValue.serverTimestamp()},{merge:true});
    try{await core.db.collection('activity').add({action:'Order status updated',orderId:id,status,createdAt:core.admin.firestore.FieldValue.serverTimestamp()})}
    catch(logError){console.error('[Band Factory] Order status saved but activity log failed',logError)}
    return json(200,{ok:true,saved:true});
  }
  if(action==='status-email'){
    const id=String(b.orderId||'').trim(),status=String(b.status||'').trim(),allowed=['Preparing','Ready','Dispatched','Delivered','Cancelled'];if(!id||!allowed.includes(status))return json(400,{ok:false,error:'Invalid order email request.'});
    const snap=await core.db.collection('orders').doc(id).get();if(!snap.exists)return json(404,{ok:false,error:'Order not found.'});
    const order={id:snap.id,...snap.data()};if(!order.email)return json(200,{ok:true,email:{skipped:true}});
    const email=await core.sendStatus({...order,status},status);return json(200,{ok:true,email});
  }
  if(action==='broadcast'){
    const to=String(b.email||'').trim(),name=String(b.name||'there'),subject=String(b.subject||'').trim(),message=String(b.message||'').trim();if(!to||!subject||!message)return json(400,{ok:false,error:'Email, subject and message are required.'});await core.sendBroadcast({to,name,subject,message});return json(200,{ok:true});
  }
  if(action==='customer'){
    const to=String(b.email||'').trim();if(!to)return json(400,{ok:false,error:'Customer email is required.'});await core.sendGenericCustomer({to,name:b.name,subject:b.subject,message:b.message,details:b.details,actionText:b.actionText,actionUrl:b.actionUrl});return json(200,{ok:true});
  }
  return json(400,{ok:false,error:'Unsupported admin email action.'});
 }catch(error){console.error('[Band Factory admin-email]',error);return json(error.statusCode||500,{ok:false,error:error.statusCode?'Admin authorization failed.':'Email action failed.'});}
};
