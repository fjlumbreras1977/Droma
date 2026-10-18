(() => {
  'use strict';
  const SITE_ROOT = new URL('../', document.currentScript.src);
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const icon = (kind) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"><path d="${kind === 'pause' ? 'M9 5v14m6-14v14' : 'm9 5 11 7-11 7V5Z'}"/></svg>`;
  // Content stays visible when JavaScript or animation APIs are unavailable.
  if ('IntersectionObserver' in window) {
    document.documentElement.classList.add('js');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {threshold: 0.06, rootMargin: '0px 0px -15px 0px'});
    $$('.reveal').forEach(el => observer.observe(el));
  }
  let paused = false;
  try { paused = localStorage.getItem('droma-motion-paused') === 'true'; } catch (_) {}
  const motionButton = $('.motion-controls');
  function setMotion(next) {
    paused = next;
    document.documentElement.classList.toggle('motion-paused', paused);
    if (motionButton) {
      motionButton.setAttribute('aria-pressed', String(paused));
      motionButton.innerHTML = icon(paused ? 'play' : 'pause') + `<span>${paused ? 'Activar animaciones' : 'Pausar animaciones'}</span>`;
    }
  }
  setMotion(paused);
  motionButton?.addEventListener('click', () => {
    setMotion(!paused);
    try { localStorage.setItem('droma-motion-paused', String(paused)); } catch (_) {}
  });
  // Main navigation and product chooser.
  const menuButton = $('.mobile-toggle');
  const navigation = $('#main-nav');
  function closeMenu() {
    navigation?.classList.remove('mobile-open');
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.setAttribute('aria-label', 'Abrir menú');
  }
  menuButton?.addEventListener('click', () => {
    const expanded = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(expanded));
    menuButton.setAttribute('aria-label', expanded ? 'Cerrar menú' : 'Abrir menú');
    navigation?.classList.toggle('mobile-open', expanded);
  });
  const dropdown = $('.nav-dropdown');
  const dropdownButton = $('.drop-trigger');
  const setDropdown = (open) => {
    dropdown?.classList.toggle('is-open', open);
    dropdownButton?.setAttribute('aria-expanded', String(open));
  };
  dropdownButton?.addEventListener('click', () => setDropdown(!dropdown.classList.contains('is-open')));
  dropdown?.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') setDropdown(true); });
  dropdown?.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') setDropdown(false); });
  dropdown?.addEventListener('focusout', e => { if (!dropdown.contains(e.relatedTarget)) setDropdown(false); });
  document.addEventListener('click', e => { if (!dropdown?.contains(e.target)) setDropdown(false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeMenu();
      if (dropdown?.contains(document.activeElement)) dropdownButton.focus();
      setDropdown(false);
    }
  });
  navigation?.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
  const dialog = $('#suite-dialog');
  let opener;
  $$('[data-open-suite]').forEach(button => button.addEventListener('click', () => {
    opener = button;
    if (dialog && !dialog.open) dialog.showModal();
  }));
  $('.modal-close')?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', e => {
    if (e.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (e.clientX < bounds.left || e.clientX > bounds.right || e.clientY < bounds.top || e.clientY > bounds.bottom) dialog.close();
  });
  dialog?.addEventListener('close', () => opener?.focus());
  $$('.modal-choice').forEach(a => a.addEventListener('click', () => dialog.close()));
  // Accessible use-case tabs. This is presentation content, not editor functionality.
  const useCases = {
    podcast: {number:'01 / PÓDCAST Y RADIO',title:'Historias que merecen<br>ser escuchadas.',text:'Graba una entrevista, limpia los cortes y encuentra el equilibrio entre voz y música. Diseña después la portada que acompañará a tu próximo episodio.',image:new URL("assets/creator.jpg", SITE_ROOT).href,alt:'Estudio de sonido con mesa de mezclas e instrumentos',label:'DALE VOZ A LO QUE IMPORTA.',href:new URL("guias/tu-primer-podcast/", SITE_ROOT).href,link:'Crea tu primer pódcast'},
    social: {number:'02 / REDES Y CONTENIDO',title:'Una idea que encuentra<br>su propia identidad.',text:'Prepara la voz, diseña las imágenes y monta tu vídeo en el formato de tu canal. Conecta sonido, diseño y movimiento para que cada publicación tenga tu personalidad.',image:new URL("assets/creator.jpg", SITE_ROOT).href,alt:'Equipo creativo de sonido en un estudio de producción',label:'DALE TU FORMA. COMPÁRTELO.',href:new URL("guias/de-la-idea-a-publicar/", SITE_ROOT).href,link:'Conecta audio, imagen y vídeo'},
    photo: {number:'03 / FOTOGRAFÍA Y DISEÑO',title:'Tu forma de mirar.<br>En cada detalle.',text:'Trabaja con luz, color y composición. Combina una fotografía, capas y tipografía para dar forma a una portada o una pieza visual con tu estilo.',image:new URL("assets/landscape.jpg", SITE_ROOT).href,alt:'Cumbre de montaña entre nubes, una imagen para explorar luz y color',label:'LO QUE VES TAMBIÉN CUENTA.',href:new URL("guias/disena-tu-portada/", SITE_ROOT).href,link:'Diseña tu primera portada'},
    video: {number:'04 / VÍDEO Y MONTAJE',title:'Cada plano encuentra<br>su momento.',text:'Ordena tus clips, incorpora imágenes, títulos y una mezcla de voz y música. Prepara tu vídeo horizontal, vertical o cuadrado y comparte una historia con tu propio ritmo.',image:new URL("assets/landscape.jpg", SITE_ROOT).href,alt:'Paisaje de montaña como material visual para una pieza audiovisual',label:'DALE MOVIMIENTO A TU HISTORIA.',href:new URL("guias/tu-primer-video/", SITE_ROOT).href,link:'Monta tu primer vídeo'}
  };
  const tabs = $$('.use-tab');
  function activateTab(tab, focus = false) {
    const data = useCases[tab.dataset.use];
    if (!data) return;
    tabs.forEach(t => { t.setAttribute('aria-selected', String(t === tab)); t.tabIndex = t === tab ? 0 : -1; });
    $('#use-content').setAttribute('aria-labelledby', tab.id);
    $('#use-title').innerHTML = data.title;
    $('#use-text').textContent = data.text;
    $('#use-number').textContent = data.number;
    $('#use-label').textContent = data.label;
    $('#use-img').src = data.image;
    $('#use-img').alt = data.alt;
    const a = $('#use-link');
    a.href = data.href;
    a.firstChild.textContent = data.link;
    if (focus) tab.focus();
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', e => {
      let next;
      if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') next = tabs[(i + tabs.length - 1) % tabs.length];
      if (e.key === 'Home') next = tabs[0];
      if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); activateTab(next, true); }
    });
  });
  // Search is local and includes complete FAQ answers, ignoring accents.
  const search = $('#faq-search');
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  search?.addEventListener('input', () => {
    const query = normalize(search.value);
    const words = query.split(/\s+/).filter(Boolean);
    const items = $$('[data-faq]');
    let count = 0;
    items.forEach(detail => {
      const haystack = normalize(detail.textContent);
      const match = words.every(word => haystack.includes(word));
      detail.hidden = !match;
      if (query && match) detail.open = true;
      else if (!query) detail.open = false;
      if (match) count++;
    });
    $('#faq-count').textContent = query ? `${count} ${count === 1 ? 'respuesta encontrada' : 'respuestas encontradas'}.` : `${items.length} preguntas para empezar.`;
    $('#faq-empty').hidden = count !== 0;
  });
  // Small original audio demonstration, generated only after a user action.
  const soundButton = $('#sound-play');
  let audioContext, masterGain, isPlaying = false, animationFrame, startedAt = 0;
  const oscillators = [];
  const soundStatus = $('#demo-status');
  const duration = 8;
  function stopDemo(finished = false) {
    if (!isPlaying) return;
    isPlaying = false;
    cancelAnimationFrame(animationFrame);
    const now = audioContext.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setTargetAtTime(0, now, .015);
    oscillators.splice(0).forEach(o => {try {o.stop(now + .06);} catch (_) {}});
    soundButton.setAttribute('aria-pressed', 'false');
    soundButton.setAttribute('aria-label', 'Escuchar demostración sonora');
    soundButton.innerHTML = icon('play');
    $('.sound-demo').classList.remove('playing');
    $('#demo-time').textContent = finished ? '00:08 / 00:08' : '00:00 / 00:08';
    soundStatus.textContent = finished ? 'Demo finalizada. Puedes volver a escucharla.' : 'Demo detenida.';
  }
  async function startDemo() {
    if (isPlaying) { stopDemo(); return; }
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) throw new Error('unsupported');
      audioContext ||= new Context();
      if (audioContext.state === 'suspended') await audioContext.resume();
      masterGain = audioContext.createGain();
      masterGain.gain.value = .14;
      masterGain.connect(audioContext.destination);
      const now = audioContext.currentTime + .03;
      startedAt = now;
      function tone(freq, start, length, volume, type = 'sine') {
        const oscillator = audioContext.createOscillator();
        const envelope = audioContext.createGain();
        oscillator.type = type;
        oscillator.frequency.value = freq;
        envelope.gain.setValueAtTime(0, start);
        envelope.gain.linearRampToValueAtTime(volume, start + Math.min(.1,length / 4));
        envelope.gain.exponentialRampToValueAtTime(.001, start + length);
        oscillator.connect(envelope).connect(masterGain);
        oscillator.start(start);
        oscillator.stop(start + length + .02);
        oscillators.push(oscillator);
      }
      [[130.81,164.81,196],[110,130.81,164.81],[87.31,110,130.81],[98,123.47,146.83]].forEach((chord, c) => {
        chord.forEach(freq => tone(freq, now + c * 2, 1.95, .32, 'sine'));
      });
      [261.63,329.63,392,523.25,440,392,329.63,261.63,349.23,440,523.25,440,392,293.66,246.94,261.63].forEach((freq, i) => tone(freq,now + i * .5,.43,.32,'triangle'));
      isPlaying = true;
      soundButton.setAttribute('aria-pressed', 'true');
      soundButton.setAttribute('aria-label', 'Detener demostración sonora');
      soundButton.innerHTML = icon('pause');
      $('.sound-demo').classList.add('playing');
      soundStatus.textContent = 'Reproduciendo la demostración.';
      const update = () => {
        if (!isPlaying) return;
        const elapsed = Math.max(0, audioContext.currentTime - startedAt);
        if (elapsed >= duration) { stopDemo(true); return; }
        $('#demo-time').textContent = `00:${String(Math.floor(elapsed)).padStart(2,'0')} / 00:08`;
        animationFrame = requestAnimationFrame(update);
      };
      update();
    } catch (_) {
      isPlaying = false;
      if (soundStatus) soundStatus.textContent = 'El navegador no ha podido iniciar la demo. Puedes abrir Audio Studio para explorar el editor.';
    }
  }
  soundButton?.addEventListener('click', startDemo);
  window.addEventListener('pagehide', () => stopDemo());
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopDemo(); });
  const progress = $('.progress-line');
  let ticking = false;
  function updateScroll() {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = (total > 0 ? Math.min(100,window.scrollY / total * 100) : 0) + '%';
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(updateScroll); }
  }, {passive:true});
  updateScroll();
})();
// Local sound studio: open the requested tool and keep deep links synchronized.
(() => {
  const frame = document.getElementById('sound-studio');
  if (frame) {
    const studioDocument = 'app.html?v=20261018-video-suite';
    const routes = new Set(['audiogram','extract','duck','home','separate','noise','eq','master','mp3','tags','audio','ivoox','qr','library','batch','share','instructions']);
    const route = () => routes.has(location.hash.slice(1)) ? location.hash.slice(1) : 'home';
    frame.src = studioDocument + '#' + route();
    frame.addEventListener('load', () => {
      try {
        frame.contentWindow.addEventListener('hashchange', () => {
          const current = frame.contentWindow.location.hash.slice(1);
          if (routes.has(current) && location.hash !== '#' + current) {
            history.replaceState(null, '', location.pathname + location.search + '#' + current);
          }
        });
      } catch (_) { /* Navigation continues to work through the embedded studio. */ }
    });
    window.addEventListener('hashchange', () => {
      try { if (frame.contentWindow.location.hash !== '#' + route()) frame.contentWindow.location.hash = route(); }
      catch (_) { frame.src = studioDocument + '#' + route(); }
    });
  }
  const buttons = [...document.querySelectorAll('[data-audio-filter]')];
  const groups = [...document.querySelectorAll('[data-audio-group]')];
  buttons.forEach(button => button.addEventListener('click', () => {
    const category = button.dataset.audioFilter;
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    groups.forEach(group => {
      group.hidden = category !== 'all' && group.dataset.audioGroup !== category;
      if (!group.hidden) group.querySelectorAll('.reveal').forEach(card => card.classList.add('visible'));
    });
  }));
})();
