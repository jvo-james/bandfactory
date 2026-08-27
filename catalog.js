const BF_CATALOG_DEFAULTS = [
  {id:'ribbed-cherry-milk',category:'ribbed',name:'Cherry Milk',subtitle:'Pink & white · cheetah-style print',price:null,color:'Pink & White',description:'A statement ribbed hairband with a pink and white animal print. Soft texture meets a playful finish for an easy pop of colour.',stock:25,available:true,imageKey:'ribbed-cherry-milk',featuredOrder:1},
  {id:'ribbed-navy-milk',category:'ribbed',name:'Navy Milk',subtitle:'Blue & white · cheetah-style print',price:null,color:'Blue & White',description:'A statement ribbed hairband with a navy blue and white animal print. A bold colour story with the same comfortable ribbed finish.',stock:25,available:true,imageKey:'ribbed-navy-milk',featuredOrder:2},
  {id:'ribbed-noir-gold',category:'ribbed',name:'Noir Gold',subtitle:'Black & gold · cheetah-style print',price:null,color:'Black & Gold',description:'A statement ribbed hairband in black and gold animal print. Rich, striking and made to finish the look without trying too hard.',stock:25,available:true,imageKey:'ribbed-noir-gold',featuredOrder:3},
  ...['Black','White','Yellow','Baby Pink','Hot Pink','Olive','Teal','Orange','Burgundy','Mustard','Flamingo'].map((color,i)=>({id:'ribbed-'+color.toLowerCase().replace(/ /g,'-'),category:'ribbed',name:`${color} Ribbed Hairband`,subtitle:color,price:null,color,description:`Classic ribbed hairband in ${color}.`,stock:25,available:true,imageKey:'ribbed-'+color.toLowerCase().replace(/ /g,'-'),featuredOrder:10+i})),
  {id:'spandex-tube-top',category:'tops',name:'Spandex Tube Top',subtitle:'Black · double lined · stretchy',price:64,color:'Black',description:'Double lined and stretchy. The original Band Factory basic already in the shop.',sizes:{XS:{stock:3,available:true},S:{stock:4,available:true},M:{stock:3,available:true},L:{stock:3,available:true},XL:{stock:3,available:true},'2XL':{stock:3,available:true}},available:true,imageKey:'spandex-tube-top',featuredOrder:1},
  {id:'second-skin-tee',category:'tops',name:'Second Skin Tee',subtitle:'Dark Brown',price:70,color:'Dark Brown',description:'A fitted dark brown tee with a smooth second-skin feel. Designed to sit close to the body and work effortlessly with everyday looks.',sizes:{S:{stock:2,available:true},M:{stock:2,available:true},L:{stock:2,available:true},XL:{stock:2,available:true},'2XL':{stock:2,available:true}},available:true,imageKey:'second-skin-tee',featuredOrder:2},
  {id:'essential-vest-top',category:'tops',name:'Essential Vest Top',subtitle:'3-piece set · Black, Coral & White',price:150,color:'Black, Coral & White',description:'A three-piece vest top set with one black, one coral and one white piece. Easy staples made for layering, lounging and everyday styling.',packSize:3,sizes:{S:{stock:3,available:true},M:{stock:3,available:true},L:{stock:3,available:true},XL:{stock:3,available:true}},available:true,imageKey:'essential-vest-top',featuredOrder:3},
  {id:'second-skin-long-sleeve',category:'sets',name:'Second Skin Long Sleeve',subtitle:'3-piece set · White, Blue Black & Nude',price:200,color:'White, Blue Black & Nude',description:'A three-piece long sleeve set in white, blue black and nude. Soft, fitted essentials made to move easily from relaxed days to styled looks.',packSize:3,sizes:{S:{stock:2,available:true},M:{stock:2,available:true},L:{stock:2,available:true},XL:{stock:2,available:true}},available:true,imageKey:'second-skin-long-sleeve',featuredOrder:1},
  {id:'second-set',category:'sets',name:'Second Set',subtitle:'White',price:160,color:'White',description:'A clean white coordinated set with a fitted long sleeve top and matching bottoms. An easy monochrome look for relaxed styling.',sizes:{},available:true,imageKey:'second-set',featuredOrder:2}
];

window.BF_CATALOG_DEFAULTS = BF_CATALOG_DEFAULTS;

window.BFCatalog = {
  async load(){
    let saved={};
    try{ saved=await BFStore.getDoc('products/catalog',{}); }catch(e){ console.warn(e); }
    const byId=Object.fromEntries((saved.items||[]).map(x=>[x.id,x]));
    const items=BF_CATALOG_DEFAULTS.map(x=>({...x,...(byId[x.id]||{})}));
    for(const x of (saved.items||[])) if(!items.some(i=>i.id===x.id)) items.push(x);
    return items;
  },
  image(item){return BF_IMAGE(item?.imageKey||item?.id);},
  price(item,settings={}){const ribbedDefault=Number(settings.ribbedPrice||settings.retailPrice||10);return Number(item?.price ?? (item?.category==='ribbed'?ribbedDefault:0) ?? 0);},
  stock(item,size=''){
    if(item?.sizes){const d=item.sizes[size]||{};return d.available===false?0:Math.max(0,Number(d.stock||0));}
    return item?.available===false?0:Math.max(0,Number(item?.stock??0));
  }
};
