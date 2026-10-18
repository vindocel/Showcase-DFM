(() => {
  const translate=value=>{
    if(typeof value==='string')return value.startsWith('i18n:')?window.DFM_I18N.t(value.slice(5)):value;
    if(Array.isArray(value))return value.map(translate);
    if(value&&typeof value==='object')for(const key of Object.keys(value))value[key]=translate(value[key]);
    return value;
  };
  for(const name of ['DFM_DATA','DFM_GUIDE','DFM_REFERENCES'])if(window[name])translate(window[name]);
})();
