(() => {
  'use strict';
  const t=(key,vars)=>window.DFM_I18N.t(key,vars);
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  window.DFM_ASSEMBLY={create(parts){
    const wrap=el('div','assembly-guide'),toolbar=el('div','assembly-toolbar'),tabs=el('div','assembly-tabs'),stage=el('div','assembly-3d-stage'),host=el('div','assembly-viewport'),status=el('p','guide-caption',t("ui.preparing_the_3d_assembly")),controls=el('div','assembly-camera-controls'),list=el('div','assembly-parts');
    let viewer=null,ready=false,disposed=false,observer=null,layer='all',selected=null,hovered=null;
    const rows=[['dimensional_port','dimensional_port','dimensional_port','dimensional_port','steel_chassis','dimensional_port','dimensional_port','miner_terminal','dimensional_port'],['steel_chassis','steel_chassis','steel_chassis','reinforced_structural_glass','quantum_core','reinforced_structural_glass','steel_chassis','reinforced_structural_glass','steel_chassis'],['ventilation_unit','ventilation_unit','ventilation_unit','reinforced_structural_glass','reinforced_structural_glass','reinforced_structural_glass','ventilation_unit','reinforced_structural_glass','ventilation_unit']];
    const slots=rows.flatMap((row,y)=>row.map((id,i)=>({id,x:i%3-1,y:y-1,z:Math.floor(i/3)-1})));
    function update(){
      const active=hovered||selected,visible=slots.filter(s=>(layer==='all'||s.y+1===Number(layer))&&(!active||s.id===active));
      if(ready){viewer.model.setSelection(layer,active);viewer.render();}
      wrap.dataset.visiblePieces=String(visible.length);wrap.dataset.layer=layer;wrap.dataset.selectedPart=active||'';
      status.textContent=t('ui.assembly_status',{count:visible.length,layer:layer==='all'?t('ui.all_layers'):[t('ui.base'),t('ui.middle'),t('ui.top')][Number(layer)]})+(active?' · '+parts.find(p=>p.id===active).name:'');
      list.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.part===selected)));
    }
    [t("ui.all_8a3c34"),t("ui.base"),t("ui.middle"),t("ui.top")].forEach((name,i)=>{const b=el('button','',name);b.type='button';b.setAttribute('aria-pressed',String(i===0));b.onclick=()=>{layer=i===0?'all':String(i-1);tabs.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));update();};tabs.append(b);});
    const rotate=el('button','assembly-rotate',t("ui.auto_rotate"));rotate.type='button';rotate.setAttribute('aria-pressed','false');rotate.onclick=()=>{if(!ready)return;viewer.autoRotate=!viewer.autoRotate;rotate.setAttribute('aria-pressed',String(viewer.autoRotate));};
    toolbar.append(tabs,rotate);host.setAttribute('aria-label',t("ui.3d_miner_assembly_with_each_block_in_position"));stage.append(host,el('span','assembly-3d-hint',t("ui.drag_to_rotate_scroll_to_zoom")));
    [['front',t("ui.front")],['back',t("ui.back")],['top',t("ui.top")],['home',t("ui.reset_view")]].forEach(([id,name])=>{const b=el('button','',name);b.type='button';b.onclick=()=>viewer?.view(id);controls.append(b);});
    for(const p of parts){const row=el('button','assembly-part');row.type='button';row.dataset.part=p.id;row.setAttribute('aria-pressed','false');const img=el('img');img.src='images/'+p.id+'.png';img.alt='';const text=el('span','assembly-part-text');text.append(el('strong','',p.count+' × '+p.name),el('span','',p.position));row.append(img,text);row.onmouseenter=()=>{hovered=p.id;update();};row.onmouseleave=()=>{hovered=null;update();};row.onfocus=()=>{hovered=p.id;update();};row.onblur=()=>{hovered=null;update();};row.onclick=()=>{selected=selected===p.id?null:p.id;hovered=null;update();};list.append(row);}
    const clear=el('button','text-button assembly-clear',t("ui.show_all_parts"));clear.type='button';clear.onclick=()=>{selected=null;hovered=null;update();};
    wrap.append(toolbar,stage,controls,status,el('p','guide-caption',t("ui.each_block_occupies_its_position_in_the_3_3_3_structure_hover_over_or_")),clear,list);
    queueMicrotask(async()=>{try{
      await window.DFMViewer.loadResources();if(disposed)return;
      viewer=new window.DFMViewer.Viewer(host);viewer.playing=false;
      await viewer.setAsset({id:'miner_assembly',kind:'assembly',slots},'normal');
      if(disposed){viewer.dispose();return;}ready=true;viewer.isOpen=true;viewer.radius*=.9;viewer.moveCamera();update();
      observer=new IntersectionObserver(entries=>{if(viewer)viewer.isOpen=entries[0].isIntersecting;});observer.observe(host);
    }catch(error){if(!disposed){status.textContent=t("ui.could_not_start_3d_open_in_a_browser_with_webgl_enabled");console.error(error);}}});
    return {element:wrap,dispose(){disposed=true;observer?.disconnect();if(ready)viewer.dispose();}};
  }};
})();
