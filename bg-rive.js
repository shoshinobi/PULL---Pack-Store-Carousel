// Pack Store Carousel — Rive background layer

(function () {
  const canvas = document.getElementById('rive-bg');
  if (!canvas || typeof rive === 'undefined') return;

  let wInput        = null;
  let hInput        = null;
  let dirInput      = null;
  let baseSizeInput = null;
  let opacityInput  = null;
  let countInput    = null;
  let speedInput        = null;
  let speedVarInput     = null;
  let leftPaddingInput  = null;
  let rightPaddingInput = null;

  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const r = new rive.Rive({
    src:           'bgparticles.riv',
    canvas,
    autoplay:      true,
    stateMachines: 'State Machine 1',
    onLoad() {
      try {
        const vm  = r.viewModelByName('ViewModel1');
        const vmi = vm.defaultInstance();
        r.bindViewModelInstance(vmi);
        wInput        = vmi.number('width');
        hInput        = vmi.number('height');
        dirInput      = vmi.enum('direction');
        baseSizeInput = vmi.number('baseSize');
        opacityInput  = vmi.number('particleOpacity');
        countInput    = vmi.number('particleCount');
        speedInput        = vmi.number('speed');
        speedVarInput     = vmi.number('speedVar');
        leftPaddingInput  = vmi.number('leftPadding');
        rightPaddingInput = vmi.number('rightPadding');
      } catch (e) {
        console.warn('[bg-rive] ViewModel binding skipped:', e.message);
      }
      syncSize();
    },
    onLoadError(e) {
      console.error('[bg-rive] Failed to load bgparticles.riv:', e);
    },
  });

  function syncSize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    r.resizeDrawingSurfaceToCanvas();
    if (wInput) wInput.value = window.innerWidth;
    if (hInput) hInput.value = window.innerHeight;
  }

  window.addEventListener('resize', syncSize);

  // Direction controls
  const dirBtns = document.querySelectorAll('.dir-btn');
  dirBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (dirInput) dirInput.value = btn.dataset.dir;
      dirBtns.forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  // Particle settings controls
  const baseSizeEl = document.getElementById('pf-base-size');
  const opacityEl  = document.getElementById('pf-opacity');
  const countEl    = document.getElementById('pf-count');
  const speedEl    = document.getElementById('pf-speed');
  const speedVarEl = document.getElementById('pf-speed-var');

  if (baseSizeEl) baseSizeEl.addEventListener('input', () => {
    if (baseSizeInput) baseSizeInput.value = parseFloat(baseSizeEl.value) || 1;
  });
  if (opacityEl) opacityEl.addEventListener('input', () => {
    if (opacityInput) opacityInput.value = Math.min(1, Math.max(0, parseFloat(opacityEl.value) || 0));
  });
  if (countEl) countEl.addEventListener('input', () => {
    if (countInput) countInput.value = parseInt(countEl.value, 10) || 50;
  });
  if (speedEl) speedEl.addEventListener('input', () => {
    if (speedInput) speedInput.value = parseFloat(speedEl.value) || 0;
  });
  if (speedVarEl) speedVarEl.addEventListener('input', () => {
    if (speedVarInput) speedVarInput.value = parseFloat(speedVarEl.value) || 0;
  });

  const leftPaddingEl  = document.getElementById('pf-left-padding');
  const rightPaddingEl = document.getElementById('pf-right-padding');

  if (leftPaddingEl) leftPaddingEl.addEventListener('input', () => {
    if (leftPaddingInput) leftPaddingInput.value = parseFloat(leftPaddingEl.value) || 0;
  });
  if (rightPaddingEl) rightPaddingEl.addEventListener('input', () => {
    if (rightPaddingInput) rightPaddingInput.value = parseFloat(rightPaddingEl.value) || 0;
  });

})();
