(() => {
  const overlay = document.getElementById('startupSplash');
  const image = document.getElementById('startupCover');
  if (!overlay || !image) return;
  const surfaces = [document.querySelector('.topbar'), document.getElementById('workspace')].filter(Boolean);
  surfaces.forEach(surface => { surface.inert = true; });
  let appReady = false;
  let coverElapsed = false;
  let dismissed = false;
  let coverStarted = false;
  let coverTimer;
  const minimumDisplay = 2500;
  function dismissWhenReady() {
    if (!appReady || !coverElapsed || dismissed) return;
    dismissed = true;
    clearTimeout(failedImageTimer);
    overlay.hidden = true;
    document.body.classList.remove('startup-active');
    surfaces.forEach(surface => { surface.inert = false; });
    window.dromaStartup = null;
  }
  function startCoverTime() {
    if (coverStarted) return;
    coverStarted = true;
    clearTimeout(failedImageTimer);
    coverTimer = setTimeout(() => { coverElapsed = true; dismissWhenReady(); }, minimumDisplay);
  }
  function imageFailed() {
    if (dismissed) return;
    clearTimeout(coverTimer);
    coverElapsed = true;
    dismissWhenReady();
  }
  const failedImageTimer = setTimeout(imageFailed, 5000);
  window.dromaStartup = { ready() { appReady = true; dismissWhenReady(); } };
  if (image.complete) {
    if (image.naturalWidth) startCoverTime();
    else imageFailed();
  } else {
    image.addEventListener('load', startCoverTime, { once: true });
    image.addEventListener('error', imageFailed, { once: true });
  }
  document.addEventListener('keydown', event => {
    if (dismissed) return;
    const reload = event.key === 'F5' || (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'r';
    if (reload) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
})();
