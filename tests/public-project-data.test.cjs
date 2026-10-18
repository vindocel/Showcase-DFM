const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const parser = fs.readFileSync(path.join(root, 'cfwidget.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'project-info-ui.js'), 'utf8');
const context = { window: {} }; vm.runInNewContext(parser, context);
const api = context.window.DFM_CFWidget;
const file = (id, type, uploaded_at, versions) => ({ id, type, uploaded_at, versions, display: 'Mod ' + id });
const sample = { id: 1733017, downloads: { total: 124 }, download: file(1, 'release', '2026-10-18', ['1.21.1', 'NeoForge', 'Client', 'Server']), files: [] };

test('reads Minecraft and total downloads from CFWidget, filtering labels', () => {
  const info = api.normalize(sample);
  assert.equal(info.latestMinecraftVersion, '1.21.1');
  assert.equal(info.downloads, 124);
  assert.deepEqual(Array.from(info.minecraftVersions), ['1.21.1']);
});
test('supports new Minecraft numbering and numeric sorting', () => {
  const info = api.normalize({ ...sample, download: file(2, 'release', '2027-01-01', ['26.2', '26.10', 'NeoForge']) });
  assert.equal(info.latestMinecraftVersion, '26.10');
});
test('honors the recommended download over a newer beta; falls back if it is missing', () => {
  const files = [file(3, 'beta', '2026-10-19', ['26.1']), file(2, 'release', '2026-10-18', ['1.21.1'])];
  assert.equal(api.normalize({ ...sample, files }).latestFile.id, 1);
  assert.equal(api.normalize({ ...sample, download: null, files }).latestFile.id, 2);
  assert.equal(api.normalize({ ...sample, download: null, files: [files[0]] }).latestMinecraftVersion, '26.1');
});
test('null files do not block valid download counts', () => {
  assert.equal(api.normalize({ id: 1733017, files: null, download: null, downloads: { total: 124 } }).downloads, 124);
  assert.throws(() => api.normalize(null));
  assert.throws(() => api.normalize({ ...sample, id: 4 }));
});
test('sums known counts; null is unknown, zero is valid, invalid values are ignored', () => {
  assert.equal(api.totalDownloads(124, 9), 133);
  assert.equal(api.totalDownloads(124, null), 124);
  assert.equal(api.totalDownloads(124, 0), 124);
  assert.equal(api.totalDownloads(null, 9), 9);
  assert.equal(api.totalDownloads(null, null), null);
  for (const value of ['9', -1, NaN, Infinity, {}, []]) assert.equal(api.totalDownloads(124, value), 124);
});
test('Modrinth verifies the exact configured ID and accepts zero downloads', () => {
  assert.equal(api.normalizeModrinth({ id: 'vTLvFHBt', downloads: 0 }, 'vTLvFHBt').downloads, 0);
  assert.equal(api.normalizeModrinth({ id: 'vTLvFHBt', downloads: null }, 'vTLvFHBt').downloads, null);
  assert.throws(() => api.normalizeModrinth(null, 'vTLvFHBt'));
  assert.throws(() => api.normalizeModrinth({ id: 'wrong', downloads: 10 }, 'vTLvFHBt'));
});

async function runUI(respond, saved = {}) {
  const elements = { '#minecraft-version': { textContent: '1.21.1' }, '#download-total': {} };
  const calls = [], storage = new Map(Object.entries(saved));
  const ctx = { window: { DFM_CFWidget: api, DFM_I18N: { lang: 'en', locale:'en-US', t:(key,vars)=>String(Object.values(vars||{}).join(', ')) }, DFM_PROJECT_CONFIG: { modrinthProjectId: 'vTLvFHBt' }, DFM_PROJECT_INFO: api.normalize(sample) },
    document: { querySelector: selector => elements[selector] },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    fetch: async url => { calls.push(url); return respond(url); },
    AbortController, setTimeout, clearTimeout, Intl, Date,
  };
  vm.runInNewContext(ui, ctx);
  await new Promise(resolve => setImmediate(resolve));
  return { elements, calls, storage };
}
const ok = body => ({ status: 200, json: async () => body });
test('updates real banner version and sum when both services reply', async () => {
  const result = await runUI(url => ok(url.includes('cfwidget') ? { ...sample, downloads: { total: 200 }, download: { ...sample.download, versions: ['26.1'] } } : { id: 'vTLvFHBt', downloads: 30 }));
  assert.equal(result.elements['#minecraft-version'].textContent, '26.1');
  assert.equal(result.elements['#download-total'].textContent, '230');
});
test('a private Modrinth project returning 404 leaves CurseForge alone', async () => {
  const result = await runUI(url => url.includes('cfwidget') ? ok(sample) : { status: 404 });
  assert.equal(result.elements['#download-total'].textContent, '124');
});
test('null Modrinth response and network failure preserve the known count', async () => {
  for (const respond of [url => ok(url.includes('cfwidget') ? sample : null), () => { throw new Error('offline'); }]) {
    const result = await runUI(respond);
    assert.equal(result.elements['#download-total'].textContent, '124');
  }
});
test('fresh independent cache avoids repeat API requests', async () => {
  const info = { ...api.normalize(sample), downloads: 200 };
  const result = await runUI(() => { throw new Error('Must not fetch'); }, {
    'dfm-public-cfwidget-1733017-v1': JSON.stringify({ savedAt: Date.now(), info }),
    'dfm-public-modrinth-vTLvFHBt-v1': JSON.stringify({ savedAt: Date.now(), info: { projectId: 'vTLvFHBt', downloads: 25 } }),
  });
  assert.equal(result.calls.length, 0);
  assert.equal(result.elements['#download-total'].textContent, '225');
});
test('expired cache stays visible while unavailable services are retried', async () => {
  const result = await runUI(() => { throw new Error('offline'); }, {
    'dfm-public-cfwidget-1733017-v1': JSON.stringify({ savedAt: 1, info: { ...api.normalize(sample), downloads: 150 } }),
  });
  assert.equal(result.calls.length, 2);
  assert.equal(result.elements['#download-total'].textContent, '150');
});
