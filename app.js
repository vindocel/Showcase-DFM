(() => {
  'use strict';
  const t=(key,vars)=>window.DFM_I18N.t(key,vars);
  const data=window.DFM_DATA,grid=document.querySelector('#catalog-grid'),dialog=document.querySelector('#inspector'),categories={maquinas:t("ui.machines"),componentes:t("ui.components"),ambiente:t("ui.environment"),guia:t("ui.guide")};
  const labels={normal:t("ui.normal"),off:t("ui.off"),idle:t("ui.idle"),active:t("ui.active"),closed:t("ui.closed"),open:t("ui.open")};
  let category='all',query='',visible=data.catalog,active=null,state='idle',core='basic',viewer=null,request=0,returnFocus=null;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function normalize(s){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
  function card(asset,index){
    const button=document.createElement('button');button.className='asset-card'+(asset.category==='maquinas'?' machine-card':'');button.dataset.open=asset.id;button.setAttribute('aria-label',t('ui.explore_model',{name:asset.name}));
    const thumb=document.createElement('div');thumb.className='asset-thumb';const img=document.createElement('img');img.alt='';img.loading='lazy';img.src='images/'+asset.id+'.png?v=3';img.onerror=()=>{img.onerror=null;if(asset.fallback){img.src=asset.fallback;img.classList.add('fallback');}else img.style.visibility='hidden';};thumb.append(img);
    const number=document.createElement('span');number.className='card-index';number.textContent=String(data.catalog.indexOf(asset)+1).padStart(2,'0');const badge=document.createElement('span');badge.className='card-3d';badge.textContent='◇ 3D';thumb.append(number,badge);
    const body=document.createElement('div');body.className='card-body';const categoryLabel=document.createElement('span');categoryLabel.className='card-category';categoryLabel.textContent=categories[asset.category].toUpperCase();const title=document.createElement('h3');title.textContent=asset.name;const desc=document.createElement('p');desc.textContent=asset.description;const bottom=document.createElement('div');bottom.className='card-bottom';const hint=document.createElement('span');hint.className=asset.animation?'animated-tag':'';hint.textContent=asset.animation?t("ui.animation_available"):t("ui.explore_every_detail");const arrow=document.createElement('span');arrow.className='card-arrow';arrow.textContent=t("ui.symbol_6564582d");bottom.append(hint,arrow);body.append(categoryLabel,title,desc,bottom);button.append(thumb,body);return button;
  }
  function renderCatalog(){if(!grid)return;visible=data.catalog.filter(a=>(category==='all'||a.category===category)&&normalize(a.name+' '+a.description).includes(normalize(query)));grid.replaceChildren(...visible.map(card));document.querySelector('#empty-state').hidden=visible.length>0;document.querySelector('#catalog-count').textContent=t('ui.catalog_count',{count:visible.length});}
  function minerStage(){return state==='off'?t("ui.off"):core==='none'?t("ui.no_core"):labels[state];}
  function updateControls(){
    document.querySelector('#state-section').hidden=active.states.length===1;document.querySelector('#core-section').hidden=active.kind!=='miner';document.querySelector('#core-select').value=core;
    const controls=document.querySelector('#state-controls');controls.replaceChildren(...active.states.map(s=>{const b=document.createElement('button');b.textContent=labels[s];b.dataset.state=s;b.setAttribute('aria-pressed',String(s===state));b.disabled=active.kind==='miner'&&core==='none'&&s==='active';return b;}));
    document.querySelector('#state-indicator').textContent=(active.kind==='miner'?minerStage():labels[state]).toUpperCase();document.querySelector('#model-category').textContent=categories[active.category].toUpperCase();document.querySelector('#stage-kind').textContent=active.category==='maquinas'?t('ui.machine_dimensions',{dimensions:active.dimensions}):categories[active.category].toUpperCase();
    const animate=active.animation&&state!=='off'&&!(active.kind==='book'&&state==='closed');document.querySelector('#play-animation').disabled=!animate;document.querySelector('#play-label').textContent=animate?(viewer?.playing?t("ui.pause_animation"):t("ui.play_animation")):t("ui.no_animation_in_this_state");document.querySelector('#play-symbol').textContent=viewer?.playing?t("ui.symbol_d41ff4e7"):'▶';document.querySelector('#play-animation').setAttribute('aria-pressed',String(!!viewer?.playing));
  }
  async function loadActive(reset=true){
    const ticket=++request;document.querySelector('#model-loading').hidden=false;updateControls();
    try{
      if(!viewer){viewer=new window.DFMViewer.Viewer(document.querySelector('#viewport'));viewer.playing=!reduced;}
      await viewer.setAsset(active,state,core,reset);if(ticket!==request)return;viewer.isOpen=true;document.querySelector('#viewer-error').hidden=true;document.querySelector('#model-loading').hidden=true;updateControls();
    }catch(error){console.error(error);document.querySelector('#model-loading').hidden=true;document.querySelector('#viewer-error').hidden=false;document.querySelector('#play-animation').disabled=true;}
  }
  async function openAsset(id){
    const asset=data.catalog.find(a=>a.id===id);if(!asset)return;active=asset;dialog.dataset.kind=asset.kind;state=asset.states.includes('idle')?'idle':asset.kind==='book'?'closed':'normal';core='basic';returnFocus=document.activeElement;
    document.querySelector('#model-guide-link').dataset.guide=asset.guide||'start';document.querySelector('#model-guide-link').href='guia.html#'+(asset.guide||'start');document.querySelector('#model-name').textContent=asset.name;document.querySelector('#model-description').textContent=asset.description;document.querySelector('#model-dimensions').textContent=asset.dimensions;document.querySelector('#model-detail').textContent=asset.detail||t("ui.rotate_the_model_to_inspect_its_shape_and_texture_from_every_angle");
    if(!dialog.open){dialog.showModal();document.body.classList.add('modal-open');}if(viewer){viewer.playing=!reduced;viewer.autoRotate=false;}document.querySelector('#auto-rotate').setAttribute('aria-pressed','false');document.querySelector('#auto-rotate').setAttribute('aria-label',t("ui.enable_automatic_camera_rotation"));await loadActive();
  }
  function close(){dialog.close();}
  document.addEventListener('click',e=>{const trigger=e.target.closest('[data-open]');if(trigger)openAsset(trigger.dataset.open);});
  document.querySelector('#close-inspector').addEventListener('click',close);dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
  dialog.addEventListener('close',()=>{request++;if(viewer)viewer.isOpen=false;document.body.classList.remove('modal-open');if(returnFocus?.isConnected)returnFocus.focus();});
  document.querySelectorAll('.filter').forEach(b=>b.addEventListener('click',()=>{category=b.dataset.category;document.querySelectorAll('.filter').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});renderCatalog();}));
  document.querySelector('#search')?.addEventListener('input',e=>{query=e.target.value;renderCatalog();});document.querySelector('#clear-search')?.addEventListener('click',()=>{query='';document.querySelector('#search').value='';document.querySelector('[data-category=all]').click();document.querySelector('#search').focus();});
  document.addEventListener('keydown',e=>{if(grid&&e.key===t("ui.symbol_42099b4a")&&!dialog.open&&!document.activeElement.closest('#guia')&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();document.querySelector('#search').focus();}});
  document.querySelector('#state-controls').addEventListener('click',e=>{const b=e.target.closest('[data-state]');if(!b||b.disabled||b.dataset.state===state)return;state=b.dataset.state;loadActive(false);});document.querySelector('#core-select').addEventListener('change',e=>{core=e.target.value;if(core==='none'&&state==='active')state='idle';loadActive(false);});
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>viewer?.view(b.dataset.view)));
  document.querySelector('#play-animation').addEventListener('click',()=>{if(!viewer)return;viewer.playing=!viewer.playing;updateControls();});document.querySelector('#auto-rotate').addEventListener('click',e=>{if(!viewer)return;viewer.autoRotate=!viewer.autoRotate;e.currentTarget.setAttribute('aria-pressed',String(viewer.autoRotate));e.currentTarget.setAttribute('aria-label',(viewer.autoRotate?t('ui.disable_automatic_camera_rotation'):t('ui.enable_automatic_camera_rotation')));});
  function next(direction){const list=visible.length?visible:data.catalog,index=list.findIndex(a=>a.id===active.id);openAsset(list[(Math.max(0,index)+direction+list.length)%list.length].id);}
  document.querySelector('#previous-model').addEventListener('click',()=>next(-1));document.querySelector('#next-model').addEventListener('click',()=>next(1));
  const hero=document.querySelector('#hero-image');if(hero){hero.src='images/dimensional_flux_miner.png?v=3';hero.onerror=()=>{hero.onerror=null;hero.src=data.catalog[0].fallback;};}renderCatalog();
  // Also used to generate the same accurate, transparent thumbnails shown on the cards.
  window.DFM_APP={openAsset,close,get viewer(){return viewer;},get active(){return active;},get state(){return state;},async exportThumbnails(){
    const host=document.createElement('div');host.style.cssText='position:fixed;left:-2000px;top:0;width:640px;height:540px;';document.body.append(host);const thumb=new window.DFMViewer.Viewer(host);thumb.renderer.setPixelRatio(1);const results={};
    for(const a of data.catalog)results[a.id]=await thumb.snapshot(a);
    thumb.renderer.setAnimationLoop(null);thumb.resizeObserver.disconnect();thumb.renderer.dispose();host.remove();return results;
  }};
})();
