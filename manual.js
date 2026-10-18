(() => {
  document.addEventListener('contextmenu', event => event.preventDefault(), {capture: true});
  const params = new URLSearchParams(window.location.search);
  if (params.has('embedded')) document.documentElement.dataset.embedded = 'true';
  const input = document.getElementById('manualSearch');
  const status = document.getElementById('searchStatus');
  const empty = document.getElementById('noResults');
  const chapters = [...document.querySelectorAll('[data-chapter]')];
  const links = [...document.querySelectorAll('#manualIndex a')];
  const normalise = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const corpus = new Map(chapters.map(section => [section.id, normalise(section.textContent)]));
  function filterChapters() {
    const words = normalise(input.value.trim()).split(/\s+/).filter(Boolean);
    let count = 0;
    chapters.forEach(section => {
      const show = words.every(word => corpus.get(section.id).includes(word));
      section.hidden = !show;
      if (show) count++;
      const link = links.find(link => link.hash === '#' + section.id);
      if (link) link.hidden = !show;
    });
    empty.hidden = count !== 0;
    status.textContent = words.length ? `${count} de ${chapters.length} capítulos` : `${chapters.length} capítulos`;
  }
  input.addEventListener('input', filterChapters);
  document.getElementById('printManual').addEventListener('click', () => window.print());
  window.addEventListener('beforeprint', () => {
    chapters.forEach(section => { section.hidden = false; });
    empty.hidden = true;
  });
  window.addEventListener('afterprint', filterChapters);
  document.addEventListener('keydown', event => {
    if (event.key === 'F1') { event.preventDefault(); input.focus(); }
    if (event.key === 'Escape' && params.has('embedded')) {
      event.preventDefault();
      window.parent.postMessage({type: 'droma-manual-close'}, window.location.origin);
    }
  });
  filterChapters();
})();
