(() => {
  'use strict';
  const t=(key,vars)=>window.DFM_I18N.t(key,vars);
  const refs=window.DFM_REFERENCES,icons=window.DFM_ICONS,names=refs.names,normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const imageFor=id=>icons[id]||(window.DFM_DATA.catalog.some(a=>a.id===id.split(':')[1])?'images/'+id.split(':')[1]+'.png':null);
  const aliases=new Map();for(const [id,name] of Object.entries(names))if(!id.startsWith('c:')&&imageFor(id)&&name.length>3)aliases.set(normalize(name),id);
  const referenceLocale=window.DFM_I18N.references;
  for(const word of referenceLocale.excludedAliases)aliases.delete(normalize(word));
  for(const a of window.DFM_DATA.catalog)aliases.set(normalize(a.name),'dimensionalfluxminer:'+a.id);
  for(const [id,words] of Object.entries(referenceLocale.aliases))for(const word of words)aliases.set(normalize(word),id);
  // Match accents through a normalized shadow string, then retain the author's original words.
  const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),pattern=new RegExp('(?<![\\p{L}\\p{N}_])('+[...aliases.keys()].sort((a,b)=>b.length-a.length).map(escape).join('|')+')(?![\\p{L}\\p{N}_])','gu');
  const mentionedItems=new Set();
  function appendText(target,text,key){const allowed=window.DFM_REFERENCE_POLICY?.[(key||'').replace('guide.dimensionalfluxminer.','')];if(!allowed){target.append(document.createTextNode(text));return;}const normalized=normalize(text);let start=0;pattern.lastIndex=0;for(const match of normalized.matchAll(pattern)){target.append(document.createTextNode(text.slice(start,match.index)));const word=text.slice(match.index,match.index+match[0].length),id=aliases.get(match[0]);if(!allowed.has(id)||mentionedItems.has(id))target.append(document.createTextNode(word));else{mentionedItems.add(id);const ref=el('button','guide-item-ref',word);ref.type='button';ref.dataset.item=id;ref.setAttribute('aria-label',t('ui.show_icon',{name:word}));target.append(ref);}start=match.index+match[0].length;}target.append(document.createTextNode(text.slice(start)));}
  const tooltip=el('div','guide-item-tooltip');tooltip.id='guide-item-tooltip';tooltip.role='tooltip';tooltip.hidden=true;document.body.append(tooltip);let active=null;
  let fluidFrame=0;const fluidImages=new Map();
  function fluidIcon(asset){
    const def=window.DFM_DATA.textures[asset.texture],meta=def.meta||{},canvas=el('canvas','guide-fluid-sprite'),w=meta.width||16,h=meta.height||w;canvas.width=w;canvas.height=h;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',t('ui.animated_fluid',{name:asset.name}));
    let img=fluidImages.get(asset.texture);if(!img){img=new Image();img.src=def.src;fluidImages.set(asset.texture,img);}
    const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
    function draw(now){
      if(tooltip.hidden||!canvas.isConnected)return;
      if(img.complete&&img.naturalWidth){const frames=(meta.frames||Array.from({length:img.naturalHeight/h},(_,i)=>i)).map(f=>typeof f==='number'?{index:f,time:meta.frametime||1}:{index:f.index,time:f.time||meta.frametime||1}),total=frames.reduce((sum,f)=>sum+f.time,0);let tick=matchMedia('(prefers-reduced-motion: reduce)').matches?0:(now/50)%total,pos=0;while(pos<frames.length-1&&tick>=frames[pos].time){tick-=frames[pos].time;pos++;}
        const f=frames[pos],cols=img.naturalWidth/w;ctx.clearRect(0,0,w,h);ctx.globalAlpha=1;const paint=index=>ctx.drawImage(img,(index%cols)*w,Math.floor(index/cols)*h,w,h,0,0,w,h);paint(f.index);if(meta.interpolate){ctx.globalAlpha=tick/f.time;paint(frames[(pos+1)%frames.length].index);ctx.globalAlpha=1;}canvas.dataset.frame=String(f.index);
      }
      fluidFrame=requestAnimationFrame(draw);
    }
    fluidFrame=requestAnimationFrame(draw);return canvas;
  }
  function hide(){cancelAnimationFrame(fluidFrame);if(active)active.removeAttribute('aria-describedby');active=null;tooltip.hidden=true;}
  function show(button){if(button.classList.contains('dimension-item-slot')){hide();return;}const id=button.dataset.item,src=imageFor(id);if(!src)return;cancelAnimationFrame(fluidFrame);active?.removeAttribute('aria-describedby');active=button;const asset=window.DFM_DATA.catalog.find(a=>'dimensionalfluxminer:'+a.id===id);let visual;if(asset?.kind==='fluid')visual=fluidIcon(asset);else{visual=el('img');visual.src=src;visual.alt='';}tooltip.replaceChildren(visual,el('strong','',names[id]||asset?.name||button.textContent));tooltip.hidden=false;button.setAttribute('aria-describedby',tooltip.id);const r=button.getBoundingClientRect(),w=tooltip.offsetWidth,h=tooltip.offsetHeight;tooltip.style.left=Math.max(8,Math.min(innerWidth-w-8,r.left+r.width/2-w/2))+'px';tooltip.style.top=(r.bottom+h+12>innerHeight?Math.max(8,r.top-h-8):r.bottom+8)+'px';}
  document.addEventListener('pointerover',e=>{const ref=e.target.closest('.guide-item-ref');if(ref&&ref!==active)show(ref);});document.addEventListener('pointerout',e=>{if(e.target.closest('.guide-item-ref')&&!e.relatedTarget?.closest?.('.guide-item-ref'))hide();});
  document.addEventListener('focusin',e=>{const ref=e.target.closest('.guide-item-ref');if(ref)show(ref);});document.addEventListener('focusout',e=>{if(e.target.closest('.guide-item-ref'))hide();});document.addEventListener('click',e=>{const ref=e.target.closest('.guide-item-ref');if(ref)show(ref);else hide();});document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});addEventListener('scroll',()=>{if(active&&document.activeElement===active)show(active);else hide();},true);addEventListener('resize',hide);
  const cycles=new Map();let frame=0;
  function updateCycle(cell){const {button,family,index,paused}=cell;if(paused)return;const id=family[index%family.length],label=names[id]||id,src=imageFor(id);button.dataset.item=id;button.dataset.variant=id;button.setAttribute('aria-label',label);const img=button.querySelector('img');img.src=src;img.alt=label;button.querySelector('.dimension-slot-name').textContent=label;}
  const ticker=setInterval(()=>{if(document.hidden)return;frame++;for(const [wrap,cells]of cycles){if(!wrap.isConnected){cycles.delete(wrap);continue;}for(const cell of cells){cell.index=frame;updateCycle(cell);}}},1400);
  function examples(dim){const wrap=el('div','dimension-examples'),bar=el('div','dimension-example-toolbar'),grid=el('div','dimension-slot-grid'),cells=[];let paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const toggle=el('button','dimension-cycle-toggle',paused?t("ui.play_variants"):t("ui.pause_variants"));toggle.type='button';toggle.setAttribute('aria-pressed',String(!paused));toggle.onclick=()=>{paused=!paused;for(const c of cells)c.paused=paused;toggle.textContent=paused?t("ui.play_variants"):t("ui.pause_variants");toggle.setAttribute('aria-pressed',String(!paused));};
    bar.append(el('span','',t("ui.accepted_materials_variants_in_the_same_slot")),toggle);
    for(const family of refs.examples[dim]){const button=el('button','dimension-item-slot');button.type='button';button.append(el('img'),el('span','dimension-slot-name'));const cell={button,family,index:0,paused:false};updateCycle(cell);cell.paused=paused;button.onpointerenter=()=>{cell.paused=true;};button.onpointerleave=()=>{cell.paused=paused;};button.onfocus=()=>{cell.paused=true;};button.onblur=()=>{cell.paused=paused;};cells.push(cell);grid.append(button);}
    wrap.append(bar,grid);cycles.set(wrap,cells);return wrap;
  }
  window.DFM_GUIDE_INTERACTIONS={appendText,examples,clear(){hide();mentionedItems.clear();for(const [wrap]of cycles)if(!wrap.isConnected)cycles.delete(wrap);}};
})();
