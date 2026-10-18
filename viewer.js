/* Local, self-contained WebGL viewer. Geometry and textures come from the authored assets. */
(() => {
  'use strict';
  const t=(key,vars)=>window.DFM_I18N.t(key,vars);
  const T=window.THREE, DATA=window.DFM_DATA, RAD=Math.PI/180;
  const textures=new Map(), materials=new Map(), geometryCache=new Map();
  let resourcesPromise;
  function loadResources(){
    if(resourcesPromise)return resourcesPromise;
    resourcesPromise=Promise.all(Object.entries(DATA.textures).map(([id,def])=>new Promise((resolve,reject)=>{
      const image=new Image();image.onload=()=>{
        let canvas,ctx,tex,sequence,total=0,frameWidth,frameHeight;
        if(def.meta){
          const a=def.meta;frameWidth=a.width||image.width;frameHeight=a.height||frameWidth;
          sequence=(a.frames||Array.from({length:(image.width/frameWidth)*(image.height/frameHeight)},(_,i)=>i)).map(f=>typeof f==='number'?{index:f,time:a.frametime||1}:{index:f.index,time:f.time||a.frametime||1});
          total=sequence.reduce((sum,f)=>sum+f.time,0);canvas=document.createElement('canvas');canvas.width=frameWidth;canvas.height=frameHeight;ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;tex=new T.CanvasTexture(canvas);
        }else{tex=new T.Texture(image);tex.needsUpdate=true;}
        tex.colorSpace=T.SRGBColorSpace;tex.magFilter=T.NearestFilter;tex.minFilter=T.NearestFilter;tex.generateMipmaps=false;
        const resource={id,tex,image,name:def.name||id,lastToken:null,update(tick){
          if(!sequence)return;
          const time=((tick%total)+total)%total;let elapsed=0,pos=0;
          for(;pos<sequence.length-1&&time>=elapsed+sequence[pos].time;pos++)elapsed+=sequence[pos].time;
          const f=sequence[pos],mix=def.meta.interpolate?(time-elapsed)/f.time:0;
          const token=f.index+':'+(def.meta.interpolate?Math.floor(mix*20):0);if(this.lastToken===token)return;this.lastToken=token;
          function draw(index){const cols=image.width/frameWidth;ctx.drawImage(image,(index%cols)*frameWidth,Math.floor(index/cols)*frameHeight,frameWidth,frameHeight,0,0,frameWidth,frameHeight);}
          ctx.clearRect(0,0,frameWidth,frameHeight);ctx.globalAlpha=1;draw(f.index);
          if(mix){ctx.globalAlpha=mix;draw(sequence[(pos+1)%sequence.length].index);ctx.globalAlpha=1;}tex.needsUpdate=true;
        }};
        resource.update(0);textures.set(id,resource);resolve();
      };image.onerror=()=>reject(new Error(t("ui.could_not_load_texture")+id));image.src=def.src;
    })));
    return resourcesPromise;
  }
  function material(id){
    if(materials.has(id))return materials.get(id);
    const resource=textures.get(id);if(!resource)throw new Error(t("ui.missing_texture")+id);
    const name=resource.name.toLowerCase(),glass=name.includes('glass'),glow=name.includes('glow');
    // Cull the reverse of solid surfaces so internal cube faces cannot leak at T-junctions.
    const opts={map:resource.tex,side:glass?T.DoubleSide:T.FrontSide,alphaTest:glass?.025:.08,transparent:glass,depthWrite:!glass};
    const mat=glow?new T.MeshBasicMaterial(opts):new T.MeshStandardMaterial({...opts,roughness:.94,metalness:.02});
    if(glass){mat.roughness=.38;mat.metalness=0;}materials.set(id,mat);return mat;
  }
  function geometry(def,textureId){
    const resource=textures.get(textureId),image=resource.tex.image,key=image.width+'x'+image.height;
    if(!geometryCache.has(def))geometryCache.set(def,new Map());
    const cache=geometryCache.get(def);if(cache.has(key))return cache.get(key);
    const uv=[...def.uv];
    // Keep edge samples inside each texture atlas region.
    for(let start=0;start<uv.length;start+=12){
      const us=[],vs=[];for(let j=0;j<12;j+=2){us.push(uv[start+j]);vs.push(uv[start+j+1]);}
      const u0=Math.min(...us),u1=Math.max(...us),v0=Math.min(...vs),v1=Math.max(...vs);
      const iu=Math.min(.04/image.width,(u1-u0)*.05),iv=Math.min(.04/image.height,(v1-v0)*.05);
      for(let j=0;j<12;j+=2){if(u1-u0>1e-9)uv[start+j]=u0+iu+(uv[start+j]-u0)/(u1-u0)*(u1-u0-2*iu);if(v1-v0>1e-9)uv[start+j+1]=v0+iv+(uv[start+j+1]-v0)/(v1-v0)*(v1-v0-2*iv);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(def.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(def.n,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeBoundingSphere();cache.set(key,g);return g;
  }
  function meshGroup(rid){
    const def=DATA.geometries[rid],group=new T.Group();
    if(!def)throw new Error(t("ui.missing_geometry")+rid);
    for(const part of def.meshes){const id=def.materials[part.tex],mesh=new T.Mesh(geometry(part,id),material(id));group.add(mesh);}
    return group;
  }
  function buildMiner(asset,state,core){
    const root=new T.Group();root.rotation.y=Math.PI;root.scale.setScalar(1/16);
    const stage=state==='off'?(core==='none'?'no_energy':'no_energy_core_'+core):core==='none'?'energy_no_core':'energy_core_'+core+(state==='idle'?'_idle':'');
    const mapping=asset.variants[stage],nodes=new Map(),motions={};
    for(const def of asset.native){
      const group=new T.Group();group.name=def.name;group.userData.origin=def.origin;group.rotation.order='ZYX';group.rotation.set(...def.rotation.map(x=>x*RAD),'ZYX');nodes.set(def.id,group);motions[def.name]=group;
      for(const part of def.meshes){const id=mapping[part.tex],mesh=new T.Mesh(geometry(part,id),material(id));group.add(mesh);}
    }
    for(const def of asset.native){
      const node=nodes.get(def.id),parent=nodes.get(def.parent),origin=parent?parent.userData.origin:[0,0,0];node.position.set(def.origin[0]-origin[0],def.origin[1]-origin[1],def.origin[2]-origin[2]);(parent||root).add(node);
    }
    if(core==='none'&&motions.pulsing_energy_core)motions.pulsing_energy_core.visible=false;
    return {root,animate(seconds){
      if(state!=='active'||core==='none')return;
      if(motions.outer_rotor)motions.outer_rotor.rotation.set(35*RAD,seconds*45*RAD,20*RAD,'ZYX');
      if(motions.inner_rotor)motions.inner_rotor.rotation.set(-25*RAD,-seconds*90*RAD,45*RAD,'ZYX');
      const s=Math.sin(seconds*90*RAD),scale=1+(1.5*s+.5*s*s)/16;if(motions.pulsing_energy_core)motions.pulsing_energy_core.scale.setScalar(scale);
    }};
  }
  function makeBook(asset,state){
    const root=new T.Group();root.rotation.x=Math.PI/2;const parts={};
    for(const [key,rid]of Object.entries(asset.models)){
      const pivot=new T.Group();pivot.position.set(8,8,8);const mesh=meshGroup(rid);mesh.position.set(-8,-8,-8);pivot.add(mesh);root.add(pivot);parts[key]=pivot;
    }
    let openingStart=null;
    const poseOpen=[111.6,111.6,0,55.8,-.6014];
    const opening=[[[0,0],[.2,15],[.65,145],[1,180]],[[0,0],[.35,0],[.7,120],[1,180]],[[0,0],[.25,0],[.6,115],[.95,180],[1,180]],[[0,0],[.2,7.5],[.65,72.5],[1,90]],[[0,0],[.2,-.08083],[.65,-.78139],[1,-.97]]];
    function lerp(t,keys){for(let i=1;i<keys.length;i++){if(t<=keys[i][0]){let[a,b]=keys[i-1],[c,d]=keys[i];return b+(d-b)*Math.max(0,(t-a)/(c-a));}}return keys.at(-1)[1];}
    function pose(values){parts.front_cover.rotation.z=values[0]*RAD;parts.leaf_1.rotation.z=values[1]*RAD;parts.leaf_2.rotation.z=values[2]*RAD;parts.spine.rotation.z=values[3]*RAD;parts.spine.position.y=8+values[4];}
    pose(state==='open'?poseOpen:[0,0,0,0,0]);
    return {root,animate(seconds){
      if(state!=='open')return;
      if(openingStart===null)openingStart=seconds;const elapsed=seconds-openingStart;
      if(elapsed<.55){pose(opening.map(k=>lerp(elapsed/.55,k)*.62));return;}
      const p=[...poseOpen],phase=(elapsed-.55)%3;
      if(phase>=.65&&phase<1.03)p[2]=111.6*(.5-.5*Math.cos(Math.PI*(phase-.65)/.38));
      if(phase>=1.65&&phase<2.03)p[1]=111.6*(.5+.5*Math.cos(Math.PI*(phase-1.65)/.38));pose(p);
    }};
  }
  function build(asset,state='normal',core='basic'){
    if(asset.kind==='assembly'){
      const root=new T.Group(),pieces=[];
      for(const slot of asset.slots){
        const part=DATA.catalog.find(a=>a.id===slot.id),pivot=new T.Group(),mesh=meshGroup(part.models.normal);
        mesh.scale.setScalar(1/16);mesh.position.set(-.5,-.5,-.5);pivot.position.set(slot.x,slot.y,slot.z);pivot.userData.part=slot.id;pivot.userData.layer=slot.y+1;
        if(slot.id==='miner_terminal')pivot.rotation.y=Math.PI;
        pivot.add(mesh);root.add(pivot);pieces.push(pivot);
      }
      return {root,animate(){},setSelection(layer,part){for(const p of pieces)p.visible=(layer==='all'||p.userData.layer===Number(layer))&&(!part||p.userData.part===part);},pieces};
    }
    if(asset.kind==='miner')return buildMiner(asset,state,core);
    if(asset.kind==='book')return makeBook(asset,state);
    const root=new T.Group();
    if(asset.kind==='crusher'&&state==='active'){
      root.add(meshGroup(asset.models.active));const left=new T.Group(),right=new T.Group();left.position.set((8-2.625)/16,10.375/16,.5);right.position.set((8+2.625)/16,10.375/16,.5);left.add(meshGroup(asset.models.left));right.add(meshGroup(asset.models.right));root.add(left,right);
      return {root,animate(s){left.rotation.z=-s*Math.PI;right.rotation.z=s*Math.PI+Math.PI/2;}};
    }
    if(asset.kind==='fluid'){
      const mat=material(asset.texture).clone();mat.side=T.DoubleSide;mat.transparent=true;mat.opacity=.92;mat.depthWrite=false;root.add(new T.Mesh(new T.BoxGeometry(1,.72,1),mat));return {root,animate(){},ownedMaterials:[mat]};
    }
    root.add(meshGroup(asset.models[state]||asset.models.normal));return {root,animate(){}};
  }
  class Viewer{
    constructor(container){
      this.container=container;this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(35,1,.01,300);this.target=new T.Vector3();this.time=0;this.playing=true;this.autoRotate=false;this.asset=null;this.isOpen=false;this.theta=2.5;this.phi=1.05;this.radius=4;this.baseRadius=4;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.38;this.renderer.setClearColor(0x000000,0);
      this.canvas=this.renderer.domElement;this.canvas.tabIndex=0;this.canvas.setAttribute('aria-label',t("ui.3d_model_use_arrow_keys_to_rotate_plus_and_minus_to_zoom"));this.container.append(this.canvas);
      this.scene.add(new T.HemisphereLight(0xd4eaf5,0x29324b,2.4));const key=new T.DirectionalLight(0xffffff,3.2);key.position.set(-4,7,-5);this.scene.add(key);const rim=new T.DirectionalLight(0xbca8f4,2);rim.position.set(4,4,5);this.scene.add(rim);this.scene.add(new T.AmbientLight(0xffffff,.45));
      this.anchor=new T.Group();this.scene.add(this.anchor);this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);this.bindControls();this.last=performance.now();this.renderer.setAnimationLoop(now=>this.frame(now));
    }
    async setAsset(asset,state,core='basic',reset=true){
      await loadResources();const old=this.model;this.asset=asset;this.state=state;this.core=core;if(old){this.anchor.remove(old.root);for(const m of old.ownedMaterials||[])m.dispose();}
      this.model=build(asset,state,core);this.anchor.add(this.model.root);this.model.animate(0);this.model.root.updateMatrixWorld(true);
      this.anchor.position.set(0,0,0);this.anchor.updateMatrixWorld(true);const box=new T.Box3().setFromObject(this.model.root),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3());this.anchor.position.copy(center).multiplyScalar(-1);this.extent=Math.max(size.x,size.y,size.z);this.baseRadius=this.extent*2.75;this.time=0;
      this.camera.near=this.baseRadius*.025;this.camera.far=this.baseRadius*12;this.camera.updateProjectionMatrix();
      if(reset)this.home();this.resize();this.render();return this;
    }
    home(){this.theta=this.asset?.kind==='book'?-.67:this.asset?.kind==='assembly'?.67:2.48;this.phi=1.05;this.radius=this.baseRadius;this.target.set(0,0,0);this.moveCamera();}
    view(which){if(which==='home'){this.home();return;}const south=this.asset?.kind==='book'||this.asset?.kind==='assembly';this.theta=which==='front'?(south?0:Math.PI):which==='back'?(south?Math.PI:0):this.theta;this.phi=which==='top'?.025:Math.PI/2;this.target.set(0,0,0);this.moveCamera();}
    moveCamera(){this.phi=Math.max(.02,Math.min(Math.PI-.02,this.phi));this.radius=Math.max(this.baseRadius*.34,Math.min(this.baseRadius*3,this.radius));this.camera.position.set(this.target.x+this.radius*Math.sin(this.phi)*Math.sin(this.theta),this.target.y+this.radius*Math.cos(this.phi),this.target.z+this.radius*Math.sin(this.phi)*Math.cos(this.theta));this.camera.lookAt(this.target);this.render();}
    resize(){let w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();if(w/h<.8&&this.radius<this.baseRadius*1.15)this.radius=this.baseRadius*1.2;this.moveCamera();}
    bindControls(){
      const pointers=new Map();let previousDistance=0;
      this.canvas.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});this.canvas.setPointerCapture(e.pointerId);previousDistance=0;});
      this.canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const prev=pointers.get(e.pointerId),dx=e.clientX-prev.x,dy=e.clientY-prev.y;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
        if(pointers.size===2){const[a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(previousDistance)this.radius*=previousDistance/distance;previousDistance=distance;}
        else if(e.buttons===2||e.shiftKey){const speed=this.extent/400;const right=new T.Vector3(1,0,0).applyQuaternion(this.camera.quaternion),up=new T.Vector3(0,1,0).applyQuaternion(this.camera.quaternion);this.target.addScaledVector(right,-dx*speed).addScaledVector(up,dy*speed);}
        else{this.theta-=dx*.008;this.phi-=dy*.008;}this.moveCamera();});
      const end=e=>{pointers.delete(e.pointerId);previousDistance=0;};this.canvas.addEventListener('pointerup',end);this.canvas.addEventListener('pointercancel',end);this.canvas.addEventListener('lostpointercapture',end);this.canvas.addEventListener('contextmenu',e=>e.preventDefault());
      this.canvas.addEventListener('wheel',e=>{e.preventDefault();this.radius*=Math.exp(Math.max(-120,Math.min(120,e.deltaY))*.0015);this.moveCamera();},{passive:false});
      this.canvas.addEventListener('keydown',e=>{let handled=true;switch(e.key){case'ArrowLeft':this.theta+=.13;break;case'ArrowRight':this.theta-=.13;break;case'ArrowUp':this.phi-=.13;break;case'ArrowDown':this.phi+=.13;break;case'+':case'=':this.radius*=.88;break;case'-':this.radius*=1.12;break;case'Home':this.home();break;default:handled=false;}if(handled){e.preventDefault();this.moveCamera();}});
    }
    frame(now){const dt=Math.min(.06,(now-this.last)/1000);this.last=now;if(!this.isOpen||document.hidden||!this.model)return;if(this.playing){this.time+=dt;this.model.animate(this.time);for(const resource of textures.values())resource.update(this.time*20);}if(this.autoRotate){this.theta+=dt*.19;this.moveCamera();}this.render();}
    render(){if(this.container.clientWidth&&this.container.clientHeight)this.renderer.render(this.scene,this.camera);}
    dispose(){this.isOpen=false;this.resizeObserver.disconnect();this.renderer.setAnimationLoop(null);for(const m of this.model?.ownedMaterials||[])m.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.canvas.remove();}
    async snapshot(asset){await this.setAsset(asset,asset.states.includes('idle')?'idle':asset.kind==='book'?'closed':'normal','basic',true);this.radius*=1.23;this.moveCamera();this.model.animate(0);for(const resource of textures.values())resource.update(0);this.render();return this.canvas.toDataURL('image/png');}
  }
  window.DFMViewer={Viewer,loadResources,build,textures};
})();
