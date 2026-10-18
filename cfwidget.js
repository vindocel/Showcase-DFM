(() => {
  const isVersion = value => typeof value === 'string' && /^\d+\.\d+(?:\.\d+)*(?:[-_][a-z\d.-]+)?$/i.test(value);
  const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
  function compareVersions(a, b) {
    const x = a.split(/[._-]/), y = b.split(/[._-]/);
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
      const left = x[i] ?? '0', right = y[i] ?? '0';
      const order = /^\d+$/.test(left) && /^\d+$/.test(right) ? Number(left) - Number(right) : left.localeCompare(right, 'en', { numeric: true });
      if (order) return order;
    }
    return 0;
  }
  const versionsFor = file => [...new Set([...(Array.isArray(file?.versions) ? file.versions : []), file?.version].filter(isVersion))].sort((a, b) => compareVersions(b, a));
  function normalize(project) {
    if (project?.id !== 1733017) throw new Error('Unexpected CFWidget project.');
    const files = Array.isArray(project.files) ? project.files : [];
    let latest = versionsFor(project.download).length ? project.download : null;
    if (!latest) {
      const available = files.filter(f => versionsFor(f).length && Number.isFinite(Date.parse(f.uploaded_at)));
      for (const type of ['release', 'beta', 'alpha']) {
        latest = available.filter(f => f.type === type).sort((a, b) => Date.parse(b.uploaded_at) - Date.parse(a.uploaded_at) || b.id - a.id)[0];
        if (latest) break;
      }
    }
    const newestVersions = versionsFor(latest);
    return {
      projectId: 1733017, source: 'cfwidget',
      latestMinecraftVersion: newestVersions[0] || null,
      minecraftVersions: [...new Set([...files.flatMap(versionsFor), ...newestVersions])].sort((a, b) => compareVersions(b, a)),
      downloads: count(project.downloads?.total),
      latestFile: latest ? { id: latest.id, name: latest.display || latest.name || '', publishedAt: latest.uploaded_at || null, releaseType: latest.type || null } : null,
    };
  }
  function normalizeModrinth(project, expectedId) {
    if (!project || project.id !== expectedId) throw new Error('Unexpected Modrinth project.');
    return { projectId: expectedId, downloads: count(project.downloads) };
  }
  function totalDownloads(curseforge, modrinth) {
    const counts = [count(curseforge), count(modrinth)].filter(n => n !== null);
    return counts.length ? counts.reduce((sum, n) => sum + n, 0) : null;
  }
  window.DFM_CFWidget = { normalize, normalizeModrinth, totalDownloads, count, isVersion, compareVersions };
})();
