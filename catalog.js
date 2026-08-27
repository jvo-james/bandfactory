(function(){
  const ribbedColours=['Black','White','Yellow','Baby Pink','Hot Pink','Olive','Teal','Orange','Burgundy','Mustard','Flamingo'];
  const sizeStock=(sizes,stock)=>Object.fromEntries(sizes.map(s=>[s,{stock,available:true}]));
  const defaults={
    version:2,
    ribbed:{
      name:'Ribbed Hairbands',description:'Textured ribbed hairbands in everyday and statement shades.',price:10,available:true,
      colours:Object.fromEntries(ribbedColours.map(c=>[c,{stock:20,available:true}])),
      featured:[
        {id:'cherry-milk',name:'Cherry Milk',colour:'Pink & White',description:'Cheetah-inspired ribbed print in pink and white.',stock:10,available:true,image:'images/ribbed-cherry-milk.svg'},
        {id:'navy-milk',name:'Navy Milk',colour:'Blue & White',description:'Cheetah-inspired ribbed print in blue and white.',stock:10,available:true,image:'images/ribbed-navy-milk.svg'},
        {id:'noir-gold',name:'Noir Gold',colour:'Black & Gold',description:'Cheetah-inspired ribbed print in black and gold.',stock:10,available:true,image:'images/ribbed-noir-gold.svg'}
      ]
    },
    basics:{
      tops:[
        {id:'second-skin-tee',name:'Second Skin Tee',description:'A fitted everyday tee with a smooth second-skin feel.',price:70,unitLabel:'1 piece',colours:['Dark Brown'],sizes:sizeStock(['S','M','L','XL','2XL'],2),available:true,image:'images/dark-brown.jpg'},
        {id:'essential-vest-top',name:'Essential Vest Top',description:'A three-piece vest-top set in Black, Coral and White.',price:150,unitLabel:'3-piece set',colours:['Black','Coral','White'],sizes:sizeStock(['S','M','L','XL'],3),available:true,image:'images/new.jpeg'}
      ],
      sets:[
        {id:'second-skin-long-sleeve',name:'Second Skin Long Sleeve',description:'A three-piece long-sleeve set in White, Blue Black and Nude.',price:200,unitLabel:'3-piece set',colours:['White','Blue Black','Nude'],sizes:sizeStock(['S','M','L','XL'],2),available:true,image:'images/sets.jpg'},
        {id:'second-set',name:'Second Set',description:'An easy matching set in clean white.',price:160,unitLabel:'1 set',colours:['White'],sizes:{},available:true,image:'images/sets.jpg'}
      ]
    }
  };
  function mergeCatalog(saved={}){
    const out=JSON.parse(JSON.stringify(defaults));
    if(saved.ribbed){out.ribbed={...out.ribbed,...saved.ribbed,colours:{...out.ribbed.colours,...(saved.ribbed.colours||{})},featured:(saved.ribbed.featured||out.ribbed.featured)}}
    if(saved.basics){for(const group of ['tops','sets']){const map=new Map((out.basics[group]||[]).map(p=>[p.id,p]));(saved.basics[group]||[]).forEach(p=>map.set(p.id,{...(map.get(p.id)||{}),...p,sizes:{...(map.get(p.id)?.sizes||{}),...(p.sizes||{})}}));out.basics[group]=[...map.values()]}}
    return out;
  }
  function allBasics(catalog){return [...(catalog.basics?.tops||[]),...(catalog.basics?.sets||[])];}
  function findBasic(catalog,id){return allBasics(catalog).find(p=>p.id===id);}
  window.BFCatalog={defaults,mergeCatalog,allBasics,findBasic,ribbedColours};
})();
