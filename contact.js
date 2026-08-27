async function initContact(){
  const st=await BFStore.getDoc('settings/store',{}),cfg=BF_CONFIG;
  const email=st.storeEmail||cfg.emailjs.adminEmail||'bandfactoryy@gmail.com';
  contactEmail.textContent=email;emailLink.href=`mailto:${email}`;
  pickupText.textContent=st.pickupAddress||cfg.pickup.address;
  waLink.href=`https://wa.me/${cfg.socials.whatsapp}`;snapLink.href=`https://www.snapchat.com/add/${cfg.socials.snapchat}`;
  const footerWa=document.querySelector('[data-social="whatsapp"]'),footerSnap=document.querySelector('[data-social="snapchat"]'),footerIg=document.querySelector('[data-social="instagram"]'),footerTt=document.querySelector('[data-social="tiktok"]');
  if(footerWa)footerWa.href=`https://wa.me/${cfg.socials.whatsapp}`;if(footerSnap)footerSnap.href=`https://www.snapchat.com/add/${cfg.socials.snapchat}`;if(footerIg)footerIg.href=st.instagramUrl||cfg.socials.instagram;if(footerTt)footerTt.href=st.tiktokUrl||cfg.socials.tiktok;
  const lat=Number(cfg.pickup.latitude),lng=Number(cfg.pickup.longitude);
  if(Number.isFinite(lat)&&Number.isFinite(lng)){
    directionsLink.href=`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    pickupMap.innerHTML=`<iframe title="Band Factory pickup map" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.openstreetmap.org/export/embed.html?bbox=${lng-.01}%2C${lat-.01}%2C${lng+.01}%2C${lat+.01}&layer=mapnik&marker=${lat}%2C${lng}"></iframe>`;
  }
}
document.addEventListener('DOMContentLoaded',()=>{initContact().catch(console.error);contactForm.onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,b=f.querySelector('button'),fd=new FormData(f),data={name:fd.get('name'),email:fd.get('email'),phone:fd.get('phone'),message:fd.get('message'),status:'new'};b.disabled=true;b.textContent='Sending...';try{await BFStore.add('messages',data);await BFStore.notify('message','New contact message',`${data.name} sent a message.`,{email:data.email});await BFEmail.sendContactCustomer(data);contactSuccess.style.display='block';f.reset()}catch(err){console.error(err);BF.toast('Message could not be sent. Please try again.')}finally{b.disabled=false;b.textContent='Send message'}}})
