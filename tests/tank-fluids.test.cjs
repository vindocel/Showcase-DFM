const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const context={window:{DFM_I18N:{t:key=>key}},AbortController,console};
vm.runInNewContext(fs.readFileSync(path.join(root,'vendor/three.js'),'utf8'),context);
const THREE=context.window.THREE;
vm.runInNewContext(fs.readFileSync(path.join(root,'assets.js'),'utf8'),context);
vm.runInNewContext(fs.readFileSync(path.join(root,'viewer.js'),'utf8'),context);
const {DFM_DATA:data,DFMViewer:viewer}=context.window;
for(const [id,def]of Object.entries(data.textures)){
  const texture=new THREE.Texture({width:def.meta?.width||def.width,height:def.meta?.height||def.width});
  viewer.textures.set(id,{tex:texture,name:def.name||id});
}
const tank=id=>data.catalog.find(a=>a.id===id);
function build(id,fluids){return viewer.build(tank(id),'normal','basic',fluids);}
function liquidBoxes(model){return model.root.children.filter(m=>m.geometry?.type==='BoxGeometry');}

test('each offered fluid has its own embedded animated texture',()=>{
  assert.deepEqual(Object.keys(data.tankFluids),['water','lava','xp','corrupted_water']);
  for(const fluid of Object.values(data.tankFluids)){
    const texture=data.textures[fluid.texture];
    assert.match(texture.src,/^data:image\/png;base64,/);
    assert.ok(texture.meta);assert.ok(texture.height>texture.width);
  }
});
test('single tank renders only its selected chamber and supports empty',()=>{
  assert.equal(liquidBoxes(build('dimensional_tank',['empty','lava'])).length,0);
  for(const fluid of Object.keys(data.tankFluids)){
    const model=build('dimensional_tank',[fluid,'lava']),boxes=liquidBoxes(model);
    assert.equal(boxes.length,1);
    assert.equal(boxes[0].material.map,viewer.textures.get(data.tankFluids[fluid].texture).tex);
    assert.ok(boxes[0].geometry.parameters.height<11/16);
    assert.equal(model.ownedGeometries.length,8);
  }
});
test('dual tank independently displays water/lava, mod fluids, or one empty chamber',()=>{
  const model=build('dimensional_dual_tank',['water','lava']),boxes=liquidBoxes(model);
  assert.equal(boxes.length,2);
  assert.ok(boxes[0].position.x<boxes[1].position.x);
  assert.equal(boxes[0].material.map,viewer.textures.get(data.tankFluids.water.texture).tex);
  assert.equal(boxes[1].material.map,viewer.textures.get(data.tankFluids.lava.texture).tex);
  assert.equal(liquidBoxes(build('dimensional_dual_tank',['empty','xp'])).length,1);
  assert.equal(liquidBoxes(build('dimensional_dual_tank',['empty','empty'])).length,0);
  const mod=liquidBoxes(build('dimensional_dual_tank',['xp','corrupted_water']));
  assert.equal(mod[0].material.map,viewer.textures.get(data.tankFluids.xp.texture).tex);
  assert.equal(mod[1].material.map,viewer.textures.get(data.tankFluids.corrupted_water.texture).tex);
  assert.ok(model.ownedMaterials.length>0);
  assert.equal(model.ownedGeometries.length,12);
});

test('all 16 code colors render in the same position on the front and lid of both tanks',()=>{
  assert.equal(Object.keys(data.tankCodeColors).length,16);
  for(const lang of ['en','pt']){const locale=JSON.parse(fs.readFileSync(path.join(root,'i18n',lang+'.json'),'utf8'));for(const color of Object.keys(data.tankCodeColors))assert.ok(locale.messages['ui.tank_code_color.'+color]);}
  for(const id of ['dimensional_tank','dimensional_dual_tank'])for(const color of Object.keys(data.tankCodeColors)){
    const code=[color,'blue','yellow'],model=viewer.build(tank(id),'normal','basic',['xp','water'],code);
    const fields=model.root.children.filter(mesh=>mesh.userData.tankCodeSurface);
    assert.equal(fields.length,6);
    for(let i=0;i<3;i++){
      const front=fields.find(mesh=>mesh.userData.tankCodeSurface==='front'&&mesh.userData.tankCodePosition===i);
      const lid=fields.find(mesh=>mesh.userData.tankCodeSurface==='lid'&&mesh.userData.tankCodePosition===i);
      assert.equal(front.material.color.getHexString(),data.tankCodeColors[code[i]].slice(1));
      assert.equal(front.material,lid.material);
      if(i<2)assert.ok(front.position.x>fields.find(mesh=>mesh.userData.tankCodeSurface==='front'&&mesh.userData.tankCodePosition===i+1).position.x);
    }
  }
});
