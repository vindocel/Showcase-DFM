import { readdir, readFile, writeFile, mkdir, cp, copyFile, rm } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const placeholders=s=>[...s.matchAll(/\{([a-zA-Z]\w*)\}/g)].map(m=>m[1]).sort().join(',');
export async function discoverLocales(directory) {
  const locales={};
  for(const name of (await readdir(directory)).filter(n=>n.endsWith('.json')).sort()) {
    const data=JSON.parse(await readFile(join(directory,name),'utf8'));
    const {code,name:nativeName,locale,direction}=data.meta||{};
    if(!/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(code||'')||name!==code+'.json'||!nativeName||!locale||!['ltr','rtl'].includes(direction))throw new Error(`Invalid locale metadata: ${name}`);
    Intl.getCanonicalLocales(locale);
    if(!data.messages||Array.isArray(data.messages)||typeof data.messages!=='object')throw new Error(`Missing messages: ${name}`);
    if(data.references){
      if(data.references.excludedAliases&&(!Array.isArray(data.references.excludedAliases)||data.references.excludedAliases.some(v=>typeof v!=='string')))throw new Error(`Invalid reference exclusions: ${name}`);
      if(data.references.aliases&&Object.values(data.references.aliases).some(words=>!Array.isArray(words)||words.some(v=>typeof v!=='string'||!v.trim())))throw new Error(`Invalid reference aliases: ${name}`);
    }
    for(const [key,value] of Object.entries(data.messages)) {
      if(typeof value!=='string'&&(!value||typeof value!=='object'||!Object.hasOwn(value,'other')||Object.values(value).some(v=>typeof v!=='string')))throw new Error(`Invalid translation: ${name} / ${key}`);
    }
    locales[code]=data;
  }
  if(!locales.en)throw new Error('The English fallback locale is required.');
  for(const [code,data]of Object.entries(locales))for(const [key,value]of Object.entries(data.messages)) {
    const base=locales.en.messages[key];
    if(base===undefined)throw new Error(`Unknown translation key: ${code} / ${key}`);
    const expected=placeholders(typeof base==='string'?base:base.other);
    for(const text of typeof value==='string'?[value]:Object.values(value))if(text&&placeholders(text)!==expected)throw new Error(`Placeholder mismatch: ${code} / ${key}`);
  }
  return locales;
}
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function prerender(html,messages) {
  const text=key=>escape(typeof messages[key]==='string'?messages[key]:'');
  html=html.replace(/<!--i18n:([\w.:-]+)-->[\s\S]*?<!--\/i18n-->/g,(_,key)=>`<!--i18n:${key}-->${text(key)}<!--/i18n-->`);
  html=html.replace(/<([a-z][\w-]*)([^>]*\bdata-i18n="([\w.:-]+)"[^>]*)>[\s\S]*?<\/\1>/g,(_,tag,attrs,key)=>`<${tag}${attrs}>${text(key)}</${tag}>`);
  html=html.replace(/<[^>]+\bdata-i18n-[^>]+>/g,tag=>{
    for(const match of [...tag.matchAll(/data-i18n-([\w-]+)="([\w.:-]+)"/g)]) {
      const attr=match[1],key=match[2];
      tag=tag.replace(new RegExp(`(?<![\\w-])${attr}="[^"]*"`),`${attr}="${text(key)}"`);
    }
    return tag;
  });
  return html.replace('<html lang="pt-BR">','<html lang="en">');
}
export async function build({source=root,output=root}={}) {
  const locales=await discoverLocales(join(source,'i18n'));
  if(output!==source){
    if(resolve(output)!==join(resolve(source),'_site'))throw new Error('The publication directory must be the project _site folder.');
    await rm(output,{recursive:true,force:true});
  }
  await mkdir(join(output,'i18n'),{recursive:true});
  await writeFile(join(output,'i18n/locales.js'),'window.DFM_LOCALES='+JSON.stringify(locales).replaceAll('<','\\u003c')+';\n');
  if(output!==source) {
    for(const entry of await readdir(source,{withFileTypes:true}))if(entry.isFile()&&/\.(?:html|css|js|svg)$/.test(entry.name)) {
      const text=await readFile(join(source,entry.name));
      await writeFile(join(output,entry.name),entry.name.endsWith('.html')?prerender(text.toString('utf8'),locales.en.messages):text);
    }
    for(const folder of ['images','icons','vendor','branding'])await cp(join(source,folder),join(output,folder),{recursive:true});
    await copyFile(join(source,'.nojekyll'),join(output,'.nojekyll'));
  }
  console.log('Locales: '+Object.keys(locales).join(', '));
  return locales;
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)await build({output:process.argv.includes('--site')?join(root,'_site'):root});
