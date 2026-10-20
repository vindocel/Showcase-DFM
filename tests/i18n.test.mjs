import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { discoverLocales, prerender } from '../scripts/build-i18n.mjs';
const root=new URL('../',import.meta.url);
const en=JSON.parse(await readFile(new URL('i18n/en.json',root),'utf8'));
const pt=JSON.parse(await readFile(new URL('i18n/pt.json',root),'utf8'));
const code=await readFile(new URL('language.js',root),'utf8');
function runtime(locales,query='',saved=null){
  const context={window:{DFM_LOCALES:locales},document:{documentElement:{},addEventListener(){}},localStorage:{getItem:()=>saved},location:{search:query},URLSearchParams,Intl,addEventListener(){}};
  vm.runInNewContext(code,context);return context;
}
test('English remains the default; Portuguese selection and regional aliases work',()=>{
  assert.equal(runtime({en,pt}).window.DFM_I18N.lang,'en');
  const app=runtime({en,pt},'?lang=pt-BR').window.DFM_I18N;
  assert.equal(app.lang,'pt');assert.equal(app.locale,'pt-BR');assert.equal(app.t('ui.front'),'Frente');
  assert.equal(runtime({en,pt},'?lang=not-a-language','pt').window.DFM_I18N.lang,'pt');
});
test('a new partial Spanish JSON is automatically discovered without changing the loader',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'dfm-i18n-'));
  try{
    await writeFile(join(directory,'en.json'),JSON.stringify(en));
    await writeFile(join(directory,'es.json'),JSON.stringify({meta:{code:'es',name:'Español',locale:'es-ES',direction:'ltr'},messages:{'ui.front':'Frente de prueba'}}));
    const locales=await discoverLocales(directory);
    assert.deepEqual(Object.keys(locales),['en','es']);
    const app=runtime(locales,'?lang=es').window.DFM_I18N;
    assert.equal(app.lang,'es');assert.equal(app.t('ui.front'),'Frente de prueba');
    assert.equal(app.t('ui.complete_guide'),en.messages['ui.complete_guide']);
  }finally{await rm(directory,{recursive:true,force:true});}
});
test('plural forms and named placeholders use the selected locale',()=>{
  const app=runtime({en,pt},'?lang=pt').window.DFM_I18N;
  assert.equal(app.t('ui.catalog_count',{count:1}),'1 peça para explorar');
  assert.equal(app.t('ui.catalog_count',{count:19}),'19 peças para explorar');
  assert.equal(app.t('ui.explore_model',{name:'Teste'}),'Explorar Teste em 3D');
});
test('invalid translation placeholders fail the publication check',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'dfm-i18n-invalid-'));
  try{
    await writeFile(join(directory,'en.json'),JSON.stringify(en));
    await writeFile(join(directory,'es.json'),JSON.stringify({meta:{code:'es',name:'Español',locale:'es-ES',direction:'ltr'},messages:{'ui.explore_model':'Explorar {wrong}'}}));
    await assert.rejects(discoverLocales(directory),/Placeholder mismatch/);
  }finally{await rm(directory,{recursive:true,force:true});}
});
test('UI keys, accessibility attributes and data references all exist in the English fallback',async()=>{
  for(const file of ['index.html','guia.html','app.js','guide.js','assembly-guide.js','viewer.js','guide-interactions.js','project-info-ui.js','assets.js','guide-data.js','guide-references.js']){
    const text=await readFile(new URL(file,root),'utf8');
    const matches=[...text.matchAll(/\bt\(['"]([^'"]+)['"]/g),...text.matchAll(/i18n:([\w.:-]+?)(?:-->|["'])/g),...text.matchAll(/data-i18n(?:-[\w-]+)?="([\w.:-]+)"/g)];
    for(const match of matches)assert.ok(Object.hasOwn(en.messages,match[1]),`${file}: ${match[1]}`);
  }
});
test('localized catalog and guide have no unresolved text tokens',async()=>{
  for(const lang of ['en','pt']){
    const context=runtime({en,pt},'?lang='+lang);
    for(const file of ['assets.js','guide-data.js','guide-references.js','localize-data.js'])vm.runInNewContext(await readFile(new URL(file,root),'utf8'),context);
    assert.equal(context.window.DFM_DATA.catalog.length,21);
    assert.equal(context.window.DFM_GUIDE.chapters.length,12);
    assert.equal(context.window.DFM_GUIDE.chapters[0].title,lang==='en'?'Introduction':'Introdução');
    assert.ok(!JSON.stringify(context.window.DFM_DATA.catalog).includes('i18n:'));
    assert.ok(!JSON.stringify(context.window.DFM_GUIDE).includes('i18n:'));
  }
});
test('published HTML contains default English text and localized accessibility attributes',async()=>{
  const output=prerender(await readFile(new URL('index.html',root),'utf8'),en.messages);
  assert.ok(output.includes('Explore the mod'));
  assert.ok(output.includes('aria-label="Choose language"'));
  assert.ok(output.includes('Industry beyond'));
  assert.ok(!output.includes('i18n:ui.explore_the_mod--><!--/i18n-->'));
});


test('dimensional tanks have self-contained 3D assets, localized names and guide recipes', async()=>{
  const context=runtime({en,pt},'?lang=pt');
  for(const file of ['assets.js','guide-data.js','guide-references.js','localize-data.js'])vm.runInNewContext(await readFile(new URL(file,root),'utf8'),context);
  const data=context.window.DFM_DATA,guide=context.window.DFM_GUIDE;
  const chapter=guide.chapters.find(c=>c.id==='tanks');
  assert.ok(chapter);assert.equal(chapter.blocks.filter(b=>b.type==='recipe').length,2);
  for(const [id,name] of [['dimensional_tank','Tanque Dimensional'],['dimensional_dual_tank','Tanque Dimensional Duplo']]){
    const asset=data.catalog.find(a=>a.id===id);
    assert.equal(asset.name,name);assert.equal(asset.guide,'tanks');
    const geometry=data.geometries[asset.models.normal];
    assert.ok(geometry.meshes.length>0);
    assert.ok(Object.values(geometry.materials).some(id=>id.endsWith('/structural_glass')));
    for(const mesh of geometry.meshes){
      assert.equal(mesh.p.length,mesh.n.length);assert.equal(mesh.p.length/3,mesh.uv.length/2);
      assert.ok(mesh.p.every(Number.isFinite));
      assert.match(data.textures[geometry.materials[mesh.tex]].src,/^data:image\/png;base64,/);
    }
    assert.equal(guide.names['dimensionalfluxminer:'+id],name);
    assert.equal(guide.recipes[id].result.id,'dimensionalfluxminer:'+id);
    assert.ok(chapter.blocks.some(b=>b.type==='recipe'&&b.id===id));
  }
  assert.equal(guide.recipes.dimensional_dual_tank.pattern.join(''),'ESETCTESE');
  assert.match(pt.messages['guide.dimensionalfluxminer.tanks.dual'],/128 000/);
  assert.match(en.messages['guide.dimensionalfluxminer.tanks.dual'],/128/);
});
