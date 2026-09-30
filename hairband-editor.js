/* Band Factory: Store Editor hairband flow */
(function(){
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const slug=v=>String(v||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80);
  const title=v=>String(v||'').replace(/^./,c=>c.toUpperCase());

  function records(material){
    if(material==='ribbed'){
      return (DATA?.catalog||[]).filter(p=>p&&p.category==='ribbed'&&p.deleted!==true).slice().sort((a,b)=>Number(a.featuredOrder||99)-Number(b.featuredOrder||99)||String(a.name||'').localeCompare(String(b.name||'')));
    }
    return (typeof smoothPalette==='function'?smoothPalette():[]).slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
  }
  function recordId(record,material){return material==='ribbed'?String(record?.id||''):String(record?.name||'');}
  function recordLabel(record,material){return material==='ribbed'?(record?.name||record?.color||record?.id||'Ribbed hairband'):(record?.name||'Smooth colour');}
  function styleData(record,style){
    const d=record?.styles?.[style];
    if(d&&typeof d==='object')return {stock:Math.max(0,Number(d.stock||0)),available:d.available!==false};
    if(style==='flat')return {stock:Math.max(0,Number(record?.stock||0)),available:record?.available!==false};
    return {stock:0,available:false};
  }
  function styleImage(record,style){
    if(style==='twisted')return record?.twistedImage||'images/ribbed-placeholder.svg';
    return record?.image||'images/ribbed-placeholder.svg';
  }
  function aggregateAvailable(styles){
    return ['flat','twisted'].some(s=>styles[s]?.available!==false&&Number(styles[s]?.stock||0)>0);
  }

  function openChooser(){
    openStudioModal(`<div class="hairband-chooser studio-form">
      <div class="hairband-chooser-head"><span class="hairband-chooser-kicker">HAIRBAND EDITOR</span><h2>New hairband</h2><p>Choose the hairband type, then choose Flat or Twisted. You can also select an existing hairband below to edit it.</p></div>
      <div class="admin-field"><label>Hairband type</label><div class="hairband-chooser-grid" role="group" aria-label="Choose hairband type">
        <button type="button" class="hairband-chooser-type active" data-hb-material="smooth"><strong>Smooth</strong><span>Classic smooth hairbands and their colour photos.</span></button>
        <button type="button" class="hairband-chooser-type" data-hb-material="ribbed"><strong>Ribbed</strong><span>Ribbed colours and prints with separate Flat and Twisted stock.</span></button>
      </div></div>
      <div class="admin-field" style="margin-top:16px"><label>Style</label><div class="hairband-chooser-style-row" role="group" aria-label="Choose hairband style">
        <button type="button" class="hairband-chooser-style active" data-hb-style="flat"><strong>Flat</strong><span>Edit or create the Flat version.</span></button>
        <button type="button" class="hairband-chooser-style" data-hb-style="twisted"><strong>Twisted</strong><span>Edit or create the Twisted version.</span></button>
      </div></div>
      <div class="hairband-chooser-existing"><div class="admin-field"><label>Edit an existing hairband</label><select id="hairbandChooserExisting"></select><p class="field-help">Leave this on “New hairband” to create one. Pick a hairband to edit it in the same editor.</p></div></div>
      <div class="hairband-chooser-actions"><div class="hairband-chooser-help"><b>Smooth</b> uses the existing Smooth colour system. <b>Ribbed</b> becomes a real catalog product and is wired to both retail and Hairbands Wholesale.</div><button class="small-btn primary" type="button" id="hairbandChooserContinue"><i class="fa-solid fa-arrow-right"></i> Continue</button></div>
    </div>`);

    let material='smooth',style='flat';
    const materialBtns=[...document.querySelectorAll('[data-hb-material]')];
    const styleBtns=[...document.querySelectorAll('[data-hb-style]')];
    const existing=document.getElementById('hairbandChooserExisting');
    const refresh=()=>{
      const rows=records(material);
      existing.innerHTML=`<option value="">New hairband</option>`+rows.map(r=>`<option value="${esc(recordId(r,material))}">${esc(recordLabel(r,material))}</option>`).join('');
    };
    const active=()=>{materialBtns.forEach(b=>b.classList.toggle('active',b.dataset.hbMaterial===material));styleBtns.forEach(b=>b.classList.toggle('active',b.dataset.hbStyle===style));};
    materialBtns.forEach(btn=>btn.onclick=()=>{material=btn.dataset.hbMaterial==='ribbed'?'ribbed':'smooth';existing.value='';refresh();active();});
    styleBtns.forEach(btn=>btn.onclick=()=>{style=btn.dataset.hbStyle==='twisted'?'twisted':'flat';active();});
    refresh();active();
    document.getElementById('hairbandChooserContinue').onclick=()=>{
      const id=existing.value||'';
      if(material==='smooth') openSmoothColourStudio(id,style);
      else openRibbedHairbandEditor(id,style);
    };
  }
  window.openHairbandChooser=openChooser;

  function openRibbedHairbandEditor(id='',preferredStyle='flat'){
    const existing=(DATA?.catalog||[]).find(p=>p.id===id&&p.category==='ribbed'&&p.deleted!==true)||{};
    const isNew=!existing.id;
    let activeStyle=preferredStyle==='twisted'?'twisted':'flat';
    openStudioModal(`<form id="newRibbedHairbandForm" class="studio-form ribbed-hairband-form">
      <div class="studio-form-head"><span>Hairband editor · Ribbed</span><h2>${isNew?'New Ribbed hairband':'Edit Ribbed hairband'}</h2><p>Choose Flat or Twisted. Changes to one style never erase the other style. Saving here updates the retail Ribbed storefront and the Hairbands Wholesale colour picker.</p></div>
      <div class="studio-style-switch" id="newRibbedStyleSwitch"><button type="button" data-new-ribbed-style="flat" class="${activeStyle==='flat'?'active':''}">Flat</button><button type="button" data-new-ribbed-style="twisted" class="${activeStyle==='twisted'?'active':''}">Twisted</button></div>
      <div class="studio-form-grid">
        <div class="admin-field"><label>Hairband name</label><input id="newRibbedName" required value="${esc(existing.name||'')}" placeholder="e.g. Cocoa Ribbed Hairband"></div>
        <div class="admin-field"><label>Colour name</label><input id="newRibbedColour" required value="${esc(existing.color||existing.subtitle||'')}" placeholder="e.g. Cocoa"></div>
        <div class="admin-field"><label>Colour swatch</label><input id="newRibbedHex" type="color" value="${esc(existing.hex||existing.colorHex||'#d9d9d9')}"></div>
        <div class="admin-field"><label>Display order</label><input id="newRibbedOrder" type="number" min="1" value="${Number(existing.featuredOrder||99)}"></div>
        <div class="admin-field span-2"><label>Short detail</label><input id="newRibbedSubtitle" value="${esc(existing.subtitle||existing.color||'')}" placeholder="e.g. Deep brown"></div>
        <div class="admin-field span-2"><label>Description</label><textarea id="newRibbedDescription" placeholder="Tell customers about this hairband">${esc(existing.description||'')}</textarea></div>
        <div class="admin-field sale-current-field"><label>Current selling price (GHS)</label><input id="newRibbedPrice" type="number" min="0" step="0.01" value="${existing.price??DATA?.settings?.ribbedPrice??''}" placeholder="0.00"></div>
        <div class="admin-field sale-old-field"><label>Old price before discount (GHS) <span class="optional-label">Optional</span></label><input id="newRibbedCompare" type="number" min="0" step="0.01" value="${existing.compareAtPrice??DATA?.settings?.ribbedCompareAtPrice??''}" placeholder="Leave blank when not on sale"></div>
      </div>
      <div id="newRibbedStylePanel"></div>
      <div class="studio-form-actions">${isNew?'':'<button class="small-btn danger" type="button" id="newRibbedDelete"><i class="fa-solid fa-trash"></i> Remove hairband</button>'}<span></span><button class="small-btn" type="button" onclick="openHairbandChooser()">Back</button><button class="small-btn" type="button" onclick="closeStudioModal()">Cancel</button><button class="small-btn primary" type="submit"><i class="fa-solid fa-check"></i> Save hairband</button></div>
    </form>`);

    const panel=document.getElementById('newRibbedStylePanel');
    const renderPanel=()=>{
      const d=styleData(existing,activeStyle),image=styleImage(existing,activeStyle),label=title(activeStyle);
      panel.innerHTML=`<div class="ribbed-hairband-style-note"><strong>${label} style</strong> is being edited now. The other style is preserved when you save.</div>${studioDropZoneHtml({title:`Ribbed ${label} image`,help:`Use the photo customers should see for the ${label} version.`,previewId:'newRibbedPreview',inputId:'newRibbedImage',value:image})}<div class="studio-form-grid"><div class="admin-field"><label>${label} stock</label><input id="newRibbedStock" type="number" min="0" step="1" value="${Number(d.stock||0)}"></div><div class="admin-field"><label>${label} availability</label><select id="newRibbedAvailable"><option value="true" ${d.available!==false?'selected':''}>Available</option><option value="false" ${d.available===false?'selected':''}>Out of stock</option></select></div></div><div class="ribbed-hairband-existing-style"><b>Other style:</b> ${activeStyle==='flat'?'Twisted':'Flat'} · ${Number(styleData(existing,activeStyle==='flat'?'twisted':'flat').stock||0)} in stock · ${styleData(existing,activeStyle==='flat'?'twisted':'flat').available!==false?'available':'not available'}</div>`;
    };
    document.querySelectorAll('[data-new-ribbed-style]').forEach(btn=>btn.onclick=()=>{activeStyle=btn.dataset.newRibbedStyle==='twisted'?'twisted':'flat';document.querySelectorAll('[data-new-ribbed-style]').forEach(b=>b.classList.toggle('active',b===btn));renderPanel();});
    renderPanel();
    document.getElementById('newRibbedDelete')?.addEventListener('click',()=>removeRibbed(id));
    document.getElementById('newRibbedHairbandForm').onsubmit=e=>saveRibbed(e,{id,existing,getStyle:()=>activeStyle});
  }
  window.openRibbedHairbandEditor=openRibbedHairbandEditor;

  async function saveRibbed(event,state){
    event.preventDefault();
    const name=document.getElementById('newRibbedName')?.value.trim()||'';
    const color=document.getElementById('newRibbedColour')?.value.trim()||'';
    if(!name)return BF.toast('Enter the hairband name.');
    if(!color)return BF.toast('Enter the colour name.');
    const priceRaw=String(document.getElementById('newRibbedPrice')?.value??'').trim(),compareRaw=String(document.getElementById('newRibbedCompare')?.value??'').trim();
    const price=Number(priceRaw||0),compare=compareRaw===''?null:Number(compareRaw);
    if(!Number.isFinite(price)||price<=0)return BF.toast('Enter a valid current price greater than 0.');
    if(compare!==null&&(!Number.isFinite(compare)||compare<0))return BF.toast('Enter a valid old price or leave it blank.');
    if(compare!==null&&compare<=price)return BF.toast('The old price must be higher than the current price.');
    const activeStyle=state.getStyle(),stock=Math.max(0,Math.floor(Number(document.getElementById('newRibbedStock')?.value||0))),available=document.getElementById('newRibbedAvailable')?.value==='true',image=document.getElementById('newRibbedImage')?.value||'';
    const previous=state.existing||{},oldId=state.id||'';
    const duplicate=(DATA?.catalog||[]).some(x=>x.id!==oldId&&x.category==='ribbed'&&x.deleted!==true&&String(x.color||'').trim().toLowerCase()===color.toLowerCase());
    if(duplicate)return BF.toast('Another Ribbed hairband already uses that colour. Edit the existing hairband instead.');
    return withAdminLoading(async()=>{
      const styles={flat:{...styleData(previous,'flat')},twisted:{...styleData(previous,'twisted')}};
      styles[activeStyle]={stock,available};
      const cleanId=oldId||`ribbed-${slug(color||name)}-${Date.now().toString().slice(-5)}`;
      const next={...previous,id:cleanId,category:'ribbed',name,color,subtitle:document.getElementById('newRibbedSubtitle')?.value.trim()||color,description:document.getElementById('newRibbedDescription')?.value.trim()||'',hex:document.getElementById('newRibbedHex')?.value||'#d9d9d9',price,compareAtPrice:compare,featuredOrder:Math.max(1,Number(document.getElementById('newRibbedOrder')?.value||99)),image:activeStyle==='flat'?(image||previous.image||'images/ribbed-placeholder.svg'):(previous.image||'images/ribbed-placeholder.svg'),twistedImage:activeStyle==='twisted'?(image||previous.twistedImage||'images/ribbed-placeholder.svg'):(previous.twistedImage||'images/ribbed-placeholder.svg'),styles};
      next.stock=Number(styles.flat.stock||0);
      next.available=aggregateAvailable(styles);
      const nextCatalog=oldId?(DATA?.catalog||[]).map(x=>x.id===oldId?next:x):[...(DATA?.catalog||[]),next];
      await BFStore.setDoc('products/catalog',{items:nextCatalog},false);
      const saved=await BFStore.getDoc('products/catalog',{}),savedItems=Array.isArray(saved?.items)?saved.items:[];
      if(!savedItems.some(x=>x.id===cleanId&&x.deleted!==true))throw new Error('The Ribbed hairband was not saved. Please try again.');
      DATA.catalog=nextCatalog;
      try{await logProductActivity(oldId?'edited':'added',previous,next,cleanId);}catch(error){console.warn('[Band Factory] Ribbed hairband activity logging failed:',error)}
      closeStudioModal();BF.toast(`${name} saved.`);renderAll();
    },'Saving hairband…');
  }
  window.saveRibbedHairband=saveRibbed;

  async function removeRibbed(id){
    if(!id)return;
    const existing=(DATA?.catalog||[]).find(x=>x.id===id&&x.category==='ribbed');
    if(!existing)return;
    if(!window.confirm(`Remove ${existing.name||existing.color||'this hairband'} from the storefront?`))return;
    return withAdminLoading(async()=>{
      const next={...existing,deleted:true,available:false};
      const nextCatalog=(DATA?.catalog||[]).map(x=>x.id===id?next:x);
      await BFStore.setDoc('products/catalog',{items:nextCatalog},false);
      DATA.catalog=nextCatalog;
      try{await logProductActivity('removed',existing,next,id);}catch(error){console.warn('[Band Factory] Ribbed hairband activity logging failed:',error)}
      closeStudioModal();BF.toast('Hairband removed from the storefront.');renderAll();
    },'Removing hairband…');
  }
})();
