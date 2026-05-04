// Pack Store Carousel — animated background blobs
// Self-contained. Depends only on GSAP being present on the page.

(function () {
  const layer = document.getElementById('bg-layer');
  if (!layer || typeof gsap === 'undefined') return;


  // ─── Settings ─────────────────────────────────────────────────────────────

  const cfg = {
    speed:     3.0,   // movement speed multiplier (higher = faster)
    minSize:   800,   // px — smallest blob diameter
    maxSize:   1200,  // px — largest blob diameter
    edgeBias:  0.90,  // 0 = uniform placement, 1 = edges only
    colors:    ['#0F193B', '#080710', '#441e4e', '#0f2050', '#1F0F3B'],
  };


  // ─── Helpers ──────────────────────────────────────────────────────────────

  function lerp(a, b, t) { return a + (b - a) * t; }
  function rand(a, b)    { return lerp(a, b, Math.random()); }
  function randSize()    { return rand(cfg.minSize, cfg.maxSize); }
  function randDuration(){ return rand(10, 24) / cfg.speed; }

  function randX() {
    const W = window.innerWidth;
    if (Math.random() < cfg.edgeBias) {
      // place center in outer 25% band on either side
      const band = W * 0.25;
      return Math.random() < 0.5 ? rand(0, band) : rand(W - band, W);
    }
    return rand(0, W);
  }

  function randY() {
    const H = window.innerHeight;
    if (Math.random() < cfg.edgeBias) {
      const band = H * 0.25;
      return Math.random() < 0.5 ? rand(0, band) : rand(H - band, H);
    }
    return rand(0, H);
  }

  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function blobGradient(color, alpha) {
    return `radial-gradient(circle, ${hexToRgba(color, alpha)} 0%, transparent 70%)`;
  }


  // ─── Blob creation ────────────────────────────────────────────────────────

  const NUM_BLOBS = 7;
  const blobs = [];

  for (let i = 0; i < NUM_BLOBS; i++) {
    const el = document.createElement('div');
    el.className = 'bg-blob';
    layer.appendChild(el);

    const color = cfg.colors[i % cfg.colors.length];
    const blob  = {
      el,
      color,
      state: {
        x:     randX(),
        y:     randY(),
        size:  randSize(),
        alpha: rand(0.4, 0.75),
      },
    };

    blobs.push(blob);
    applyBlob(blob);
    animateBlob(blob);
  }


  // ─── Animation ────────────────────────────────────────────────────────────

  function applyBlob({ el, color, state }) {
    el.style.width      = state.size + 'px';
    el.style.height     = state.size + 'px';
    el.style.transform  = `translate(${state.x - state.size * 0.5}px, ${state.y - state.size * 0.5}px)`;
    el.style.background = blobGradient(color, state.alpha);
  }

  function animateBlob(blob) {
    gsap.to(blob.state, {
      x:     randX(),
      y:     randY(),
      size:  randSize(),
      alpha: rand(0.4, 0.75),
      duration:   randDuration(),
      ease:       'power1.inOut',
      onUpdate:   () => applyBlob(blob),
      onComplete: () => animateBlob(blob),
    });
  }

  function restartAll() {
    blobs.forEach(blob => {
      gsap.killTweensOf(blob.state);
      animateBlob(blob);
    });
  }

  function randomizeAll() {
    blobs.forEach(blob => {
      gsap.killTweensOf(blob.state);
      blob.state.x     = randX();
      blob.state.y     = randY();
      blob.state.size  = randSize();
      blob.state.alpha = rand(0.4, 0.75);
      applyBlob(blob);
      animateBlob(blob);
    });
  }

  function refreshColors() {
    blobs.forEach((blob, i) => {
      blob.color = cfg.colors[i % cfg.colors.length];
    });
  }

  window.addEventListener('resize', () => {
    blobs.forEach(blob => {
      blob.state.x = Math.min(blob.state.x, window.innerWidth);
      blob.state.y = Math.min(blob.state.y, window.innerHeight);
    });
  });


  // ─── Controls ─────────────────────────────────────────────────────────────

  const speedSlider = document.getElementById('bg-speed');
  const sizeSlider  = document.getElementById('bg-size');
  const edgeSlider  = document.getElementById('bg-edge');
  const speedLabel  = document.getElementById('bg-speed-val');
  const sizeLabel   = document.getElementById('bg-size-val');
  const edgeLabel   = document.getElementById('bg-edge-val');
  const randBtn     = document.getElementById('bg-randomize');

  if (speedSlider) {
    speedSlider.value = cfg.speed;
    speedLabel.textContent = cfg.speed.toFixed(1) + '×';
    speedSlider.addEventListener('input', () => {
      cfg.speed = parseFloat(speedSlider.value);
      speedLabel.textContent = cfg.speed.toFixed(1) + '×';
      restartAll();
    });
  }

  if (sizeSlider) {
    const mid = (cfg.minSize + cfg.maxSize) / 2;
    sizeSlider.value = mid;
    sizeLabel.textContent = Math.round(mid) + 'px';
    sizeSlider.addEventListener('input', () => {
      const v = parseFloat(sizeSlider.value);
      cfg.minSize = v * 0.5;
      cfg.maxSize = v * 1.5;
      sizeLabel.textContent = Math.round(v) + 'px';
    });
  }

  if (edgeSlider) {
    edgeSlider.value = cfg.edgeBias;
    edgeLabel.textContent = `${Math.round(cfg.edgeBias * 100)}%`;
    edgeSlider.addEventListener('input', () => {
      cfg.edgeBias = parseFloat(edgeSlider.value);
      edgeLabel.textContent = `${Math.round(cfg.edgeBias * 100)}%`;
    });
  }

  if (randBtn) {
    randBtn.addEventListener('click', randomizeAll);
  }

  document.querySelectorAll('.bg-color-input').forEach((input, i) => {
    const swatch = input.parentElement;
    input.value = cfg.colors[i] ?? cfg.colors[cfg.colors.length - 1];
    swatch.style.background = input.value;
    input.addEventListener('input', () => {
      cfg.colors[i] = input.value;
      swatch.style.background = input.value;
      refreshColors();
    });
  });

})();
