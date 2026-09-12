/* Band Factory transactional email client.
   All actual email delivery happens in Netlify Functions through Resend.
   No Resend secret is ever exposed in the browser. */
const BFEmail=(()=>{
  async function request(url,payload,admin=false,{timeoutMs=15000}={}){
    const headers={'Content-Type':'application/json'};
    if(admin){
      await BFStore.ready;
      const user=window.__bfAuth?.currentUser;
      if(!user)throw new Error('Please sign in again.');
      headers.Authorization=`Bearer ${await user.getIdToken()}`;
    }
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),Math.max(1000,Number(timeoutMs)||15000));
    let response;
    try{response=await fetch(url,{method:'POST',headers,body:JSON.stringify(payload),signal:controller.signal});}
    catch(error){
      if(error?.name==='AbortError')throw new Error('The server took too long to respond. Please try again.');
      throw error;
    }finally{clearTimeout(timer)}
    const result=await response.json().catch(()=>({}));
    if(!response.ok||result.ok===false)throw new Error(result.error||'Email service is unavailable.');
    return result;
  }
  const event=(type,id)=>request('/.netlify/functions/send-email',{type,id});
  return {
    isConfigured:()=>true,
    sendPurchaseEmails:order=>event('purchase',order?.id||order),
    sendReviewEmails:review=>event('review',review?.id||review),
    sendNewsletterWelcome:subscriber=>event('subscriber',subscriber?.id||subscriber),
    sendContactCustomer:message=>event('contact',message?.id||message),
    async updateOrderStatus(orderId,status){
      const id=String(orderId||'').trim();
      const next=String(status||'').trim();
      const allowed=['Preparing','Ready','Dispatched','Delivered','Cancelled'];
      if(!id||!allowed.includes(next))throw new Error('Choose a valid order status.');
      await BFStore.ready;
      const user=window.__bfAuth?.currentUser;
      if(!user)throw new Error('Please sign in again.');
      const serverTime=window.firebase?.firestore?.FieldValue?.serverTimestamp?.();
      const save=BFStore.update('orders',id,{status:next,...(serverTime?{statusUpdatedAt:serverTime}:{statusUpdatedAt:new Date().toISOString()})});
      const timeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error('Saving the order took too long. Please check your connection and try again.')),15000));
      await Promise.race([save,timeout]);
      BFStore.add('activity',{action:'Order status updated',orderId:id,status:next}).catch(error=>console.warn('[Band Factory] Order saved but activity log failed:',error));
      return {ok:true,saved:true,direct:true};
    },
    async sendOrderStatusEmail(orderId,status){return request('/.netlify/functions/admin-email',{action:'status-email',orderId,status},true,{timeoutMs:12000})},
    async sendBroadcastToSubscriber({email,name,subject,message}){return request('/.netlify/functions/admin-email',{action:'broadcast',email,name,subject,message},true)},
    async sendCustomerEmail({toEmail,toName,subject,message,details='',actionText='Visit Band Factory',actionUrl=''}){return request('/.netlify/functions/admin-email',{action:'customer',email:toEmail,name:toName,subject,message,details,actionText,actionUrl},true)}
  };
})();
window.BFEmail=BFEmail;
