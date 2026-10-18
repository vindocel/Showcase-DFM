(() => {
  'use strict';
  const locales=window.DFM_LOCALES,base=locales.en;
  const codes=Object.keys(locales);
  function supported(value){if(typeof value!=='string')return null;const lower=value.toLowerCase();return codes.find(code=>code.toLowerCase()===lower)||codes.find(code=>locales[code].meta.locale.toLowerCase()===lower)||codes.find(code=>code.split('-')[0].toLowerCase()===lower.split('-')[0])||null;}
  let saved;try{saved=localStorage.getItem('dfm-language');}catch{}
  const lang=supported(new URLSearchParams(location.search).get('lang'))||supported(saved)||'en';
  const selected=locales[lang],locale=selected.meta.locale;
  document.documentElement.lang=locale;document.documentElement.dir=selected.meta.direction;
  function t(key,vars={}){
    let value=selected.messages[key];
    if(value===undefined||value==='')value=base.messages[key];
    if(value&&typeof value==='object')value=value[new Intl.PluralRules(locale).select(Number(vars.count))]||value.other;
    if(typeof value!=='string')return key;
    return value.replace(/\{([a-zA-Z]\w*)\}/g,(match,name)=>Object.hasOwn(vars,name)?String(vars[name]):match);
  }
  const references={excludedAliases:selected.references?.excludedAliases||base.references.excludedAliases,aliases:selected.references?.aliases||base.references.aliases};
  window.DFM_I18N={lang,locale,t,references};
  function applyDocument(){
    for(const element of document.querySelectorAll('[data-i18n]'))element.textContent=t(element.dataset.i18n);
    for(const attr of ['aria-label','title','placeholder','alt','content'])for(const element of document.querySelectorAll('[data-i18n-'+attr+']'))element.setAttribute(attr,t(element.getAttribute('data-i18n-'+attr)));
    const walker=document.createTreeWalker(document.documentElement,NodeFilter.SHOW_COMMENT),markers=[];
    while(walker.nextNode())if(walker.currentNode.data.startsWith('i18n:'))markers.push(walker.currentNode);
    for(const marker of markers){let end=marker.nextSibling;while(end&&!(end.nodeType===8&&end.data==='/i18n')){const next=end.nextSibling;end.remove();end=next;}if(end)end.before(document.createTextNode(t(marker.data.slice(5))));}
  }
  document.addEventListener('click',event=>{
    const anchor=event.target.closest('a[href]');if(!anchor)return;
    const url=new URL(anchor.href,location.href);
    if(url.origin===location.origin&&/\/(index|guia)\.html$/.test(url.pathname)){url.searchParams.set('lang',lang);anchor.href=url.href;}
  },true);
  addEventListener('DOMContentLoaded',()=>{
    applyDocument();
    const picker=document.querySelector('.language-picker'),button=document.querySelector('#language-toggle'),menu=document.querySelector('#language-menu');
    if(!picker||!button||!menu)return;
    const options=codes.map(code=>{
      const option=document.createElement('button');option.type='button';option.dataset.language=code;option.lang=locales[code].meta.locale;option.dir=locales[code].meta.direction;option.role='menuitemradio';option.textContent=locales[code].meta.name;option.setAttribute('aria-checked',String(code===lang));menu.append(option);
      option.addEventListener('click',()=>{try{localStorage.setItem('dfm-language',code);}catch{}if(code===lang){close(true);return;}const url=new URL(location.href);url.searchParams.set('lang',code);location.assign(url.href);});return option;
    });
    function close(focus=false){menu.hidden=true;button.setAttribute('aria-expanded','false');if(focus)button.focus();}
    function open(){menu.hidden=false;button.setAttribute('aria-expanded','true');options.find(option=>option.dataset.language===lang)?.focus();}
    button.addEventListener('click',()=>menu.hidden?open():close(true));
    button.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();open();}});
    menu.addEventListener('keydown',event=>{const index=options.indexOf(document.activeElement);if(event.key==='Escape'){event.preventDefault();close(true);}else if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();options[(index+(event.key==='ArrowDown'?1:-1)+options.length)%options.length].focus();}else if(event.key==='Home'||event.key==='End'){event.preventDefault();options[event.key==='Home'?0:options.length-1].focus();}else if(event.key==='Tab')close();});
    document.addEventListener('pointerdown',event=>{if(!picker.contains(event.target))close();});
  });
})();
