const core=require('./email-core');
const json=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'POST, OPTIONS'},body:JSON.stringify(body)});
exports.handler=async event=>{
 if(event.httpMethod==='OPTIONS')return json(204,{});
 if(event.httpMethod!=='POST')return json(405,{ok:false,error:'POST required'});
 try{
  const body=JSON.parse(event.body||'{}'),type=String(body.type||'');
  if(!['purchase','subscriber','contact','review'].includes(type))return json(400,{ok:false,error:'Unsupported email event.'});
  const result=await core.dispatchStoredEvent(type,body.id);
  return json(200,{ok:true,...result});
 }catch(error){console.error('[Band Factory email event]',error);return json(error.statusCode||500,{ok:false,error:'Email could not be sent right now.'});}
};
