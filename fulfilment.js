(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.BFFulfilment=api;
})(typeof globalThis!=='undefined'?globalThis:window,function(){
  const pad=n=>String(n).padStart(2,'0');
  const cleanType=v=>String(v||'').trim().toLowerCase();

  function toDate(value){
    if(!value)return null;
    if(value instanceof Date)return Number.isNaN(value.getTime())?null:new Date(value.getTime());
    if(typeof value==='object'&&Number.isFinite(Number(value.seconds))){
      const d=new Date(Number(value.seconds)*1000);return Number.isNaN(d.getTime())?null:d;
    }
    const raw=String(value).trim();
    if(!raw)return null;
    const calendar=/^\d{4}-\d{2}-\d{2}$/.test(raw);
    const d=calendar?new Date(`${raw}T12:00:00`):new Date(raw);
    return Number.isNaN(d.getTime())?null:d;
  }

  function dateKey(value){
    const d=toDate(value);if(!d)return '';
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }

  function isoDate(value){
    const d=toDate(value);return d?d.toISOString():'';
  }

  function formatDate(value){
    const d=toDate(value);
    if(!d)return 'To be confirmed';
    return new Intl.DateTimeFormat('en-GH',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d);
  }

  function shortDate(value){
    const d=toDate(value);
    if(!d)return 'To be confirmed';
    return new Intl.DateTimeFormat('en-GH',{day:'numeric',month:'short',year:'numeric'}).format(d);
  }

  function productFulfilment(item={}){
    const raw=item.fulfilment||{};
    const type=cleanType(item.fulfilmentType||raw.type|| (item.preorder===true?'preorder':'standard')) || 'standard';
    const isPreorder=type==='preorder';
    const rawDate=item.fulfilmentDate||item.preorderDate||raw.date||'';
    return {type:isPreorder?'preorder':'standard',date:isPreorder?rawDate:'',preorder:isPreorder};
  }

  function isPreorder(item={}){return productFulfilment(item).preorder || cleanType(item.type)==='preorder';}

  function itemFulfilmentDate(item={},fallback){
    const info=productFulfilment(item);
    const date=info.date||fallback||'';
    return toDate(date);
  }

  function cartHasPreorder(cart=[]){return cart.some(isPreorder);}
  function cartFulfilmentDates(cart=[],standardDate){return [...new Set(cart.map(i=>dateKey(itemFulfilmentDate(i,standardDate))).filter(Boolean))];}

  function latestDate(values=[]){
    const dates=values.map(toDate).filter(Boolean);
    if(!dates.length)return null;
    return new Date(Math.max(...dates.map(d=>d.getTime())));
  }

  function groupItems(items=[]){
    return items.map(item=>({
      key:item.key||'',
      type:item.type||'',
      productId:item.productId||item.wholesaleProductId||'',
      name:item.name||'Band Factory item',
      qty:Number(item.qty||1),
      price:Number(item.price||0),
      size:item.size||'',
      color:item.color||'',
      style:item.style||'',
      category:item.category||'',
      fulfilmentType:item.fulfilmentType||productFulfilment(item).type,
      fulfilmentDate:item.fulfilmentDate||productFulfilment(item).date||'',
      image:item.image||'',
      summary:item.summary||'',
      wholesaleMinQty:Number(item.wholesaleMinQty||0),
      wholesaleTiers:Array.isArray(item.wholesaleTiers)?item.wholesaleTiers:[]
    }));
  }

  function buildGroups(cart=[],options={}){
    const mode=cleanType(options.mode)||'delivery';
    const plan=cleanType(options.plan)||'together';
    const standardDate=options.standardDate||options.dispatchDate||'';
    const pickupDate=options.pickupDate||standardDate;
    if(!cart.length)return {plan:'single',groups:[],mixed:false,hasPreorder:false,latestDate:null};

    const hasPreorder=cartHasPreorder(cart);
    const itemDates=cart.map(item=>itemFulfilmentDate(item,standardDate||pickupDate)).filter(Boolean);
    const latest=latestDate(itemDates);

    if(mode==='pickup'){
      const date=latest||toDate(pickupDate)||toDate(standardDate);
      return {plan:'together',groups:[{id:'pickup-1',label:'Pickup',date:isoDate(date),dateKey:dateKey(date),items:groupItems(cart),status:options.status||'Preparing'}],mixed:false,hasPreorder,latestDate:date};
    }

    if(!hasPreorder){
      const date=toDate(standardDate)||latest;
      return {plan:'single',groups:[{id:'delivery-1',label:'Delivery',date:isoDate(date),dateKey:dateKey(date),items:groupItems(cart),status:options.status||'Preparing'}],mixed:false,hasPreorder:false,latestDate:date};
    }

    if(plan==='separate'){
      const buckets=new Map();
      cart.forEach(item=>{
        const d=itemFulfilmentDate(item,standardDate)||toDate(standardDate);
        const key=dateKey(d)||'tbc';
        if(!buckets.has(key))buckets.set(key,{date:d,items:[]});
        buckets.get(key).items.push(item);
      });
      const ordered=[...buckets.entries()].sort((a,b)=>String(a[0]).localeCompare(String(b[0])));
      return {
        plan:'separate',
        groups:ordered.map(([key,bucket],index)=>({id:`delivery-${index+1}`,label:`Delivery ${index+1}`,date:isoDate(bucket.date),dateKey:key,items:groupItems(bucket.items),status:options.status||'Preparing'})),
        mixed:ordered.length>1,
        hasPreorder:true,
        latestDate:latest
      };
    }

    const date=latest||toDate(standardDate);
    return {plan:'together',groups:[{id:'delivery-1',label:'Delivery',date:isoDate(date),dateKey:dateKey(date),items:groupItems(cart),status:options.status||'Preparing'}],mixed:false,hasPreorder:true,latestDate:date};
  }

  function orderGroups(order={}){
    const existing=Array.isArray(order.fulfilmentGroups)?order.fulfilmentGroups.filter(Boolean):[];
    if(existing.length){
      return existing.map((group,index)=>({
        id:group.id||`fulfilment-${index+1}`,
        label:group.label||`${String(order.fulfilment||'Delivery').toLowerCase()==='pickup'?'Pickup':'Delivery'}${existing.length>1?` ${index+1}`:''}`,
        date:isoDate(group.date||group.fulfilmentDate||order.fulfilmentDate||order.pickupDate||''),
        dateKey:dateKey(group.date||group.fulfilmentDate||order.fulfilmentDate||order.pickupDate||''),
        items:groupItems(group.items||[]),
        status:group.status||order.status||'Preparing'
      }));
    }
    const fallbackDate=order.fulfilment==='pickup'?order.pickupDate:order.fulfilmentDate;
    const built=buildGroups(order.items||[],{mode:order.fulfilment||'delivery',plan:order.fulfilmentPlan||'single',standardDate:fallbackDate,pickupDate:order.pickupDate,status:order.status||'Preparing'});
    return built.groups;
  }

  function summary(order={}){
    const groups=orderGroups(order);
    const split=groups.length>1 || order.fulfilmentPlan==='separate';
    return {groups,split,hasPreorder:cartHasPreorder(order.items||[]),plan:order.fulfilmentPlan|| (split?'separate':'single')};
  }

  return {toDate,dateKey,isoDate,formatDate,shortDate,productFulfilment,isPreorder,itemFulfilmentDate,cartHasPreorder,cartFulfilmentDates,latestDate,buildGroups,orderGroups,summary};
});
