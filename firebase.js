/* Band Factory Firebase data layer — loads Firebase Compat SDK dynamically. */
(function(){
  const cfg=window.BF_CONFIG||{};
  const readyConfig=cfg.firebase && !String(cfg.firebase.apiKey||'').startsWith('REPLACE_');
  const LS_PREFIX='bf_demo_';
  const local={
    get:(k,d)=>{try{return JSON.parse(localStorage.getItem(LS_PREFIX+k))??d}catch{return d}},
    set:(k,v)=>localStorage.setItem(LS_PREFIX+k,JSON.stringify(v))
  };
  function load(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s)})}
  async function init(){
    if(!readyConfig) return false;
    await load('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
    await load('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js');
    await load('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js');
    if(!firebase.apps.length) firebase.initializeApp(cfg.firebase);
    window.__bfAuth=firebase.auth(); window.__bfDb=firebase.firestore(); return true;
  }
  const ready=init().catch(e=>{console.warn('Firebase unavailable; demo fallback active.',e);return false});
  const api={ready,
    async isLive(){return await ready},
    async getDoc(path, fallback={}){if(await ready){const s=await __bfDb.doc(path).get();return s.exists?{id:s.id,...s.data()}:fallback}return local.get(path,fallback)},
    async setDoc(path,data,merge=true){if(await ready)return __bfDb.doc(path).set({...data,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge});const prev=merge?local.get(path,{}):{};local.set(path,{...prev,...data,updatedAt:new Date().toISOString()});return true},
    async add(collection,data){if(await ready){const r=await __bfDb.collection(collection).add({...data,createdAt:firebase.firestore.FieldValue.serverTimestamp()});return r.id}const arr=local.get(collection,[]);const id='LOCAL-'+Date.now();arr.unshift({id,...data,createdAt:new Date().toISOString()});local.set(collection,arr);return id},
    async list(collection,orderBy='createdAt',dir='desc'){if(await ready){let q=__bfDb.collection(collection);try{q=q.orderBy(orderBy,dir)}catch{}const s=await q.get();return s.docs.map(d=>({id:d.id,...d.data()}))}return local.get(collection,[])},
    async listWhere(collection,field,op,value){if(await ready){const s=await __bfDb.collection(collection).where(field,op,value).get();return s.docs.map(d=>({id:d.id,...d.data()}))}return local.get(collection,[]).filter(x=>op==='=='?x[field]===value:true)},
    async update(collection,id,data){if(await ready)return __bfDb.collection(collection).doc(id).set({...data,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});const arr=local.get(collection,[]).map(x=>x.id===id?{...x,...data}:x);local.set(collection,arr)},
    async remove(collection,id){if(await ready)return __bfDb.collection(collection).doc(id).delete();local.set(collection,local.get(collection,[]).filter(x=>x.id!==id))},
    async signIn(email,password){await ready;if(!window.__bfAuth)throw new Error('Firebase is not configured.');return __bfAuth.signInWithEmailAndPassword(email,password)},
    async signOut(){await ready;if(window.__bfAuth)return __bfAuth.signOut()},
    async currentAdmin(){await ready;if(!window.__bfAuth)return null;const user=__bfAuth.currentUser;if(!user)return null;const doc=await __bfDb.collection('admins').doc(user.uid).get();return doc.exists&&doc.data().active!==false?{uid:user.uid,email:user.email,...doc.data()}:null},
    onAuth(cb){ready.then(ok=>{if(!ok)return cb(null);__bfAuth.onAuthStateChanged(async u=>{if(!u)return cb(null);const d=await __bfDb.collection('admins').doc(u.uid).get();cb(d.exists&&d.data().active!==false?{uid:u.uid,email:u.email,...d.data()}:null)})})},
    async finalizeVerifiedOrder(order,verification={}){
      if(!(await ready)) throw new Error('Firebase is unavailable, so the verified order could not be synced yet.');
      if(!order?.id||!order?.paystackReference) throw new Error('Order reference is missing.');

      const number=v=>Number(v||0);
      const normalizePhone=value=>{let digits=String(value||'').replace(/\D/g,'');if(digits.startsWith('0')&&digits.length>=10)digits='233'+digits.slice(1);return digits};
      const deductions={flat:{},twisted:{}};
      let unallocatedWholesale=0;
      const add=(style,color,qty)=>{style=String(style||'flat').toLowerCase();qty=number(qty);if(!['flat','twisted'].includes(style)||!color||qty<=0)return;deductions[style][color]=(deductions[style][color]||0)+qty};
      for(const item of order.items||[]){
        const mult=number(item.qty||1);
        if(item.type==='retail') add(item.style||'flat',item.color,number(item.qty));
        if(item.type==='wholesale'){
          if(item.wholesaleMode==='custom'&&item.allocations){
            if(item.style==='mixed'){
              for(const [style,colors] of Object.entries(item.allocations||{})) for(const [color,qty] of Object.entries(colors||{})) add(style,color,number(qty)*mult);
            }else{
              for(const [color,qty] of Object.entries(item.allocations||{})) add(item.style||'flat',color,number(qty)*mult);
            }
          }else unallocatedWholesale+=number(item.bundlePieces)*mult;
        }
      }
      const hasManagedStock=Object.values(deductions.flat).some(Boolean)||Object.values(deductions.twisted).some(Boolean);
      const paymentRef=__bfDb.collection('paymentReferences').doc(order.paystackReference);
      const orderRef=__bfDb.collection('orders').doc(order.id);
      const productRef=__bfDb.doc('products/smooth');
      const customerRef=__bfDb.collection('customers').doc();
      const notifRef=__bfDb.collection('notifications').doc();
      const activityRef=__bfDb.collection('activity').doc();
      const inventoryNotifRef=__bfDb.collection('notifications').doc();
      const shortageNotifRef=__bfDb.collection('notifications').doc();
      const abandonedRef=order.abandonedCartId?__bfDb.collection('abandonedCarts').doc(order.abandonedCartId):null;

      return __bfDb.runTransaction(async tx=>{
        const seen=await tx.get(paymentRef);
        if(seen.exists) return {alreadyFinalized:true,orderId:seen.data().orderId||order.id};
        let productSnap=null;
        if(hasManagedStock) productSnap=await tx.get(productRef);

        const shortages=[];
        let stockSyncStatus='not-required';
        let styles=null;
        if(hasManagedStock&&productSnap?.exists){
          const product=productSnap.data()||{};
          styles=JSON.parse(JSON.stringify(product.styles||{}));
          for(const style of ['flat','twisted']) for(const [color,qty] of Object.entries(deductions[style])){
            styles[style] ||= {colors:{}}; styles[style].colors ||= {};
            const current=styles[style].colors[color]||product.colors?.[color]||{};
            const currentStock=number(current.stock);
            if(currentStock<qty) shortages.push(`${color} ${style}: needed ${qty}, recorded ${currentStock}`);
            styles[style].colors[color]={...current,stock:Math.max(0,currentStock-qty)};
          }
          stockSyncStatus='updated';
        }else if(hasManagedStock){
          stockSyncStatus='needs-review';
        }

        const serverTime=firebase.firestore.FieldValue.serverTimestamp();
        tx.set(orderRef,{...order,payment:'Paid',serverVerified:true,verification:{reference:verification.reference||order.paystackReference,amount:number(verification.amount),currency:verification.currency||'GHS',paidAt:verification.paidAt||'',channel:verification.channel||''},verifiedAt:serverTime,stockSyncStatus},{merge:false});
        tx.set(paymentRef,{orderId:order.id,amount:number(verification.amount),currency:verification.currency||'GHS',createdAt:serverTime},{merge:false});
        if(styles) tx.set(productRef,{styles,updatedAt:serverTime},{merge:true});
        tx.set(customerRef,{name:order.name||'',email:order.email||'',phone:order.phone||'',normalizedPhone:normalizePhone(order.phone),orderId:order.id,total:number(order.total),type:order.type||'Retail',city:order.city||'',region:order.region||'',country:order.country||'',countryCode:order.countryCode||'',source:order.source||'Direct / Unknown',lastOrderAt:serverTime,createdAt:serverTime});
        tx.set(notifRef,{type:'purchase',title:'New paid order',message:`${order.name||'Customer'} placed ${order.id} for GHS ${number(order.total).toFixed(2)}.`,orderId:order.id,read:false,createdAt:serverTime});
        tx.set(activityRef,{action:'Paid order created',orderId:order.id,total:number(order.total),paystackReference:order.paystackReference,source:order.source||'Direct / Unknown',createdAt:serverTime});
        if(abandonedRef) tx.set(abandonedRef,{status:'recovered',orderId:order.id,recoveredAt:serverTime,updatedAt:serverTime},{merge:true});
        if(unallocatedWholesale>0) tx.set(inventoryNotifRef,{type:'inventory',title:'Wholesale stock needs allocation',message:`${unallocatedWholesale} standard-mix wholesale pieces from ${order.id} need to be deducted from the colours you pack.`,orderId:order.id,read:false,createdAt:serverTime});
        if(hasManagedStock&&!productSnap?.exists) tx.set(shortageNotifRef,{type:'inventory',title:'Inventory setup needs attention',message:`Order ${order.id} was verified, but products/smooth was not found. The paid order was saved; please set up inventory and adjust stock manually.`,orderId:order.id,read:false,createdAt:serverTime});
        else if(shortages.length) tx.set(shortageNotifRef,{type:'inventory',title:'Stock count needs checking',message:`Order ${order.id} exceeded recorded stock for: ${shortages.join('; ')}. Those variants were reduced to zero.`,orderId:order.id,read:false,createdAt:serverTime});
        return {alreadyFinalized:false,orderId:order.id,stockSyncStatus};
      });
    },
    async notify(type,title,message,meta={}){return api.add('notifications',{type,title,message,read:false,...meta})},
    async log(action,meta={}){return api.add('activity',{action,...meta})}
  };
  window.BFStore=api;
})();
