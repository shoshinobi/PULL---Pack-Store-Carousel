// UI Sheen — hover sheen effect on all .ui-card elements.
// Self-contained. Depends only on GSAP being present on the page.

(function () {
  if (typeof gsap === 'undefined') return;


  // ─── Settings ─────────────────────────────────────────────────────────────

  const cfg = {
    color:        '#ffffff', // hex — sheen tint
    alpha:        0.075,      // peak opacity of the stripe
    blur:         3,         // px — edge softness (0 = hard edges)
    skew:         -33,       // degrees — parallelogram lean (negative = right)
    width:        75,        // % of card width
    speed:        0.7,       // seconds — crossing time, same on every card
    ease:         'power2.out', // GSAP ease string
    bgColor:      '#ffffff', // hex — card background tint
    bgRestAlpha:  0.04,      // card background opacity at rest
    bgHoverAlpha: 0.09,      // card background opacity on hover
  };

  function hexToRgb(hex) {
    return [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ].join(', ');
  }


  // ─── Per-card setup ───────────────────────────────────────────────────────

  // All visual styles are set once at init — nothing is rebuilt on each hover.
  document.querySelectorAll('.ui-card, .ui-pill').forEach(card => {
    const sheen = document.createElement('div');
    sheen.style.cssText =
      'position:absolute;top:-10%;left:0;height:120%;pointer-events:none;z-index:10;will-change:transform;';
    sheen.style.width      = `${cfg.width}%`;
    sheen.style.background =
      `linear-gradient(90deg, transparent 20%, rgba(${hexToRgb(cfg.color)}, ${cfg.alpha}) 20%, rgba(${hexToRgb(cfg.color)}, ${cfg.alpha}) 80%, transparent 80%)`;
    sheen.style.filter = cfg.blur > 0 ? `blur(${cfg.blur}px)` : 'none';
    gsap.set(sheen, { skewX: cfg.skew, x: -(card.offsetWidth) });
    gsap.set(card,  { backgroundColor: `rgba(${hexToRgb(cfg.bgColor)}, ${cfg.bgRestAlpha})` });
    card.appendChild(sheen);

    card.addEventListener('mouseenter', () => {
      gsap.killTweensOf(sheen);
      gsap.fromTo(sheen,
        { x: -(card.offsetWidth) },
        { x:   card.offsetWidth * 1.5, duration: cfg.speed, ease: cfg.ease }
      );
      gsap.to(card, { backgroundColor: `rgba(${hexToRgb(cfg.bgColor)}, ${cfg.bgHoverAlpha})`, duration: 0.2, ease: 'power1.out' });
    });

    card.addEventListener('mouseleave', () => {
      gsap.to(card, { backgroundColor: `rgba(${hexToRgb(cfg.bgColor)}, ${cfg.bgRestAlpha})`, duration: 0.3, ease: 'power1.out' });
    });

    if (card.classList.contains('ui-pill')) {
      card.addEventListener('click', () => {
        gsap.killTweensOf(card, 'backgroundColor,color');
        gsap.to(card, {
          backgroundColor: '#ffffff',
          color: '#000000',
          duration: 0.08,
          ease: 'power2.out',
          onComplete: () => {
            gsap.to(card, {
              backgroundColor: `rgba(${hexToRgb(cfg.bgColor)}, ${cfg.bgHoverAlpha})`,
              color: 'rgba(255, 255, 255, 0.7)',
              duration: 0.5,
              ease: 'power2.out',
            });
          },
        });
      });
    }
  });

})();
