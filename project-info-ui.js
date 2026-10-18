(() => {
  const t=(key,vars)=>window.DFM_I18N.t(key,vars);
  const api = window.DFM_CFWidget;
  if (!api) return;
  const version = document.querySelector('#minecraft-version');
  const total = document.querySelector('#download-total');
  const config = window.DFM_PROJECT_CONFIG;
  const modrinthId = config?.modrinthProjectId;
  const counts = { curseforge: null, modrinth: null };
  const format = value => new Intl.NumberFormat(window.DFM_I18N?.locale || 'en-US').format(value);
  function renderCounts() {
    if (!total) return;
    const sum = api.totalDownloads(counts.curseforge, counts.modrinth);
    total.textContent = sum === null ? '—' : format(sum);
  }
  function applyCurseForge(info) {
    if (info?.projectId !== 1733017) return false;
    let usable = false;
    if (version && api.isVersion(info.latestMinecraftVersion)) {
      version.textContent = info.latestMinecraftVersion;
      version.title = t('ui.minecraft_versions',{versions:(Array.isArray(info.minecraftVersions)?info.minecraftVersions:[]).filter(api.isVersion).join(', ')});
      usable = true;
    }
    const downloads = api.count(info.downloads);
    if (downloads !== null) { counts.curseforge = downloads; usable = true; }
    renderCounts();
    return usable;
  }
  function applyModrinth(info) {
    if (info?.projectId !== modrinthId) return false;
    const downloads = api.count(info.downloads);
    if (downloads === null) return false;
    counts.modrinth = downloads;
    renderCounts();
    return true;
  }
  applyCurseForge(window.DFM_PROJECT_INFO);
  renderCounts();
  async function request(url, retryQueued = false) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json' }, credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal });
      if (response.status === 202 && retryQueued) {
        await new Promise(resolve => setTimeout(resolve, 2500));
        return request(url, false);
      }
      if (response.status !== 200) throw new Error('Public data unavailable.');
      return await response.json();
    } finally { clearTimeout(timer); }
  }
  async function load(source, projectId, url, normalize, apply) {
    const key = `dfm-public-${source}-${projectId}-v1`;
    let cached;
    try { cached = JSON.parse(localStorage.getItem(key)); } catch {}
    const valid = cached && apply(cached.info);
    const age = Date.now() - cached?.savedAt;
    if (valid && age >= 0 && age < 15 * 60 * 1000) return;
    try {
      const info = normalize(await request(url, source === 'cfwidget'));
      if (apply(info)) {
        try { localStorage.setItem(key, JSON.stringify({ info, savedAt: Date.now() })); } catch {}
      }
    } catch { /* Keep cached or bundled data; one provider never blocks the other. */ }
  }
  load('cfwidget', 1733017, 'https://api.cfwidget.com/1733017', api.normalize, applyCurseForge);
  if (typeof modrinthId === 'string' && /^[a-zA-Z0-9_-]+$/.test(modrinthId)) {
    load('modrinth', modrinthId, 'https://api.modrinth.com/v2/project/' + encodeURIComponent(modrinthId), data => api.normalizeModrinth(data, modrinthId), applyModrinth);
  }
})();
