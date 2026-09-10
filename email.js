/* Band Factory transactional email client.
   All actual email delivery happens in Netlify Functions through Resend.
   No Resend secret is ever exposed in the browser. */
const BFEmail=(()=>{
  async function request(url,payload,admin=false){
    const headers={'Content-Type':'application/json'};
    if(admin){
      await BFStore.ready;
      const user=window.__bfAuth?.currentUser;
      if(!user)throw new Error('Please sign in again.');
      headers.Authorization=`Bearer ${await user.getIdToken()}`;
    }
    const response=await fetch(url,{method:'POST',headers,body:JSON.stringify(payload)});
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
    async updateOrderStatus(orderId,status){return request('/.netlify/functions/admin-email',{action:'status',orderId,status},true)},
    async sendBroadcastToSubscriber({email,name,subject,message}){return request('/.netlify/functions/admin-email',{action:'broadcast',email,name,subject,message},true)},
    async sendCustomerEmail({toEmail,toName,subject,message,details='',actionText='Visit Band Factory',actionUrl=''}){return request('/.netlify/functions/admin-email',{action:'customer',email:toEmail,name:toName,subject,message,details,actionText,actionUrl},true)}
  };
})();
window.BFEmail=BFEmail;
