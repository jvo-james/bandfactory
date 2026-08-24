const number=value=>Number(value||0);

function cloneStyles(product={}){
  const styles=JSON.parse(JSON.stringify(product.styles||{}));
  for(const style of ['flat','twisted']){
    styles[style] ||= {colors:{}};
    styles[style].colors ||= {};
    const legacy=product.colors||{};
    for(const [color,data] of Object.entries(legacy)) if(!styles[style].colors[color]) styles[style].colors[color]={...data};
  }
  return styles;
}

function styleNeedForStandard(item,style){
  const mult=Math.max(1,number(item.qty||1));
  if(item.style==='mixed') return number(item.styleAllocations?.[style]||0)*mult;
  return item.style===style ? number(item.bundlePieces||0)*mult : 0;
}

function applyOrderToStock(order={},product={}){
  const styles=cloneStyles(product);
  const shortages=[];
  const deducted={flat:{},twisted:{}};
  const addDeduction=(style,color,qty)=>{deducted[style][color]=(deducted[style][color]||0)+qty};
  const consume=(style,color,qty,label='')=>{
    qty=number(qty); if(qty<=0||!color)return 0;
    styles[style] ||= {colors:{}}; styles[style].colors ||= {};
    const current=styles[style].colors[color]||{};
    const stock=Math.max(0,number(current.stock));
    const used=Math.min(stock,qty);
    styles[style].colors[color]={...current,stock:stock-used};
    if(used)addDeduction(style,color,used);
    if(used<qty)shortages.push(`${label||color+' '+style}: needed ${qty}, available ${stock}`);
    return used;
  };
  const consumeStandard=(style,qty,label)=>{
    let remaining=number(qty); if(remaining<=0)return;
    const candidates=Object.entries(styles[style]?.colors||{})
      .filter(([,d])=>d?.available!==false&&number(d?.stock)>0)
      .sort((a,b)=>number(b[1]?.stock)-number(a[1]?.stock)||a[0].localeCompare(b[0]));
    for(const [color] of candidates){
      if(remaining<=0)break;
      const current=styles[style].colors[color]||{},stock=Math.max(0,number(current.stock)),used=Math.min(stock,remaining);
      styles[style].colors[color]={...current,stock:stock-used};if(used)addDeduction(style,color,used);remaining-=used;
    }
    if(remaining>0)shortages.push(`${label}: ${remaining} piece${remaining===1?'':'s'} could not be allocated from current stock`);
  };

  for(const item of order.items||[]){
    if((item.material||'smooth')!=='smooth')continue;
    if(item.type==='retail') consume(item.style==='twisted'?'twisted':'flat',item.color,number(item.qty),`${item.color} ${item.style||'flat'}`);
    if(item.type==='wholesale'){
      const mult=Math.max(1,number(item.qty||1));
      if(item.wholesaleMode==='custom'&&item.allocations){
        if(item.style==='mixed'){
          for(const style of ['flat','twisted']) for(const [color,qty] of Object.entries(item.allocations?.[style]||{})) consume(style,color,number(qty)*mult,`${color} ${style}`);
        }else{
          const style=item.style==='twisted'?'twisted':'flat';
          for(const [color,qty] of Object.entries(item.allocations||{})) consume(style,color,number(qty)*mult,`${color} ${style}`);
        }
      }else{
        for(const style of ['flat','twisted']){
          const need=styleNeedForStandard(item,style);
          if(need>0)consumeStandard(style,need,`${item.name||'Standard wholesale'} (${style})`);
        }
      }
    }
  }
  return {styles,shortages,deducted};
}

function orderUsesManagedStock(order={}){
  return (order.items||[]).some(item=>(item.material||'smooth')==='smooth'&&(item.type==='retail'||item.type==='wholesale'));
}

module.exports={number,applyOrderToStock,orderUsesManagedStock};
