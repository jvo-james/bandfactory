const admin=require('firebase-admin');
const crypto=require('crypto');
if(!admin.apps.length){admin.initializeApp({credential:admin.credential.cert({projectId:process.env.FIREBASE_PROJECT_ID,clientEmail:process.env.FIREBASE_CLIENT_EMAIL,privateKey:String(process.env.FIREBASE_PRIVATE_KEY||'').replace(/\\n/g,'\n')})});}
const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'POST, OPTIONS'};
exports.handler=async event=>{
  if(event.httpMethod==='OPTIONS')return {statusCode:204,headers,body:''};
  if(event.httpMethod!=='POST')return {statusCode:405,headers,body:JSON.stringify({ok:false,error:'POST required'})};
  try{
    const token=String(event.headers.authorization||event.headers.Authorization||'').replace(/^Bearer\s+/i,'');if(!token)throw new Error('Admin sign-in required.');
    const decoded=await admin.auth().verifyIdToken(token);const adminSnap=await admin.firestore().collection('admins').doc(decoded.uid).get();if(!adminSnap.exists||adminSnap.data()?.active===false)throw new Error('Admin access required.');
    const cloudName=process.env.CLOUDINARY_CLOUD_NAME,apiKey=process.env.CLOUDINARY_API_KEY,secret=process.env.CLOUDINARY_API_SECRET;if(!cloudName||!apiKey||!secret)throw new Error('Image uploads are not configured yet.');
    const body=JSON.parse(event.body||'{}'),folder=String(body.folder||'bandfactory/catalog').replace(/[^a-zA-Z0-9_\/-]/g,'').slice(0,120)||'bandfactory/catalog',timestamp=Math.floor(Date.now()/1000);const signature=crypto.createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}${secret}`).digest('hex');
    return {statusCode:200,headers,body:JSON.stringify({ok:true,cloudName,apiKey,timestamp,folder,signature})};
  }catch(error){console.error('[Band Factory] image-upload-signature',error);return {statusCode:403,headers,body:JSON.stringify({ok:false,error:error.message||'Image upload could not be authorised.'})};}
};
