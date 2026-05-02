// Pack Store Carousel — requires GSAP 3.13+ with CustomEase plugin.

gsap.registerPlugin(CustomEase);


// ─── Custom eases (from After Effects motion spec) ────────────────────────────
// Shuffle: K01 anticipation dip → K02 accelerate through target → K03 settle.
// Hero:    KSCALE departure pulse | KIDLE float bob | KSHAKE_IN/OUT wiggle.

CustomEase.create('K01',        'M0,0 C0.91,-0.01 0.70,-0.44 1,1');
CustomEase.create('K02',        'M0,0 C0.16,0.39 0.64,1.01 1,1');
CustomEase.create('K03',        'M0,0 C0.49,0.24 0.39,0.32 1,1');
CustomEase.create('KSCALE',     'M0,0 C0.66,0.00 0.34,1.00 1,1');
CustomEase.create('KIDLE',      'M0,0 C0.36,0.00 0.63,1.00 1,1');
CustomEase.create('KSHAKE_IN',  'M0,0 C0.36,0.00 0.64,0.48 1,1');
CustomEase.create('KSHAKE_OUT', 'M0,0 C0.33,0.52 0.64,1.00 1,1');

// AE shuffle blend factors — 14°→8.42° (phase 1 end) →-0.41° (overshoot) →0°
const P1_BLEND = (14 - 8.42) / 14;  // ≈ 0.399
const P2_BLEND = (14 + 0.41) / 14;  // ≈ 1.029


// ─── Design knobs — edit here only ───────────────────────────────────────────
//
//  SPREAD           Radians between arc positions. Keep > ~0.20 to avoid overlap.
//  ELLIPSE_CX       Ellipse centre X in px, or null = always viewport centre.
//  HERO_Y_VH        Hero card Y as a fraction of viewport height (0.4 = 40%).
//  ELLIPSE_RX/RY    Ellipse semi-axes in px. RX = arc width, RY = arc depth.
//
//  SCALE_BREAKPOINTS  Zoom % per viewport width. First matching row wins.
//                     100 = design size, calibrated at 1440px wide.
//  MIN_VIEWPORT_HEIGHT  Below this height (px) the carousel also shrinks to
//                       prevent the hero card from clipping the viewport top.

const SPREAD     = 0.21;
const ELLIPSE_CX = null;   // null = always centred horizontally
const HERO_Y_VH  = 0.40;
const ELLIPSE_RX = 980;    // px
const ELLIPSE_RY = 1080;   // px

const SCALE_BREAKPOINTS = [  // ← tune these to control zoom per breakpoint
  { minWidth: 1900, scale: 200 },
  { minWidth: 1440, scale: 150 },
  { minWidth: 1024, scale: 125 },
  { minWidth:  768, scale: 125 },
  { minWidth:    0, scale: 150 },
];

const MIN_VIEWPORT_HEIGHT = 600;  // px


// ─── Animation constants ──────────────────────────────────────────────────────

const TOP_ANGLE  = -Math.PI / 2;  // hero at ellipse apex
const HERO_SCALE = 1.25;  // card scale at pos = 0
const BASE_SCALE = 1.00;  // card scale far from centre
const SCALE_ZONE = 1.5;   // arc distance from centre where scale ramp begins

// Directional shuffle timing:
//   SAME_SIDE_STAGGER  — ripple delay between each same-side card (from selected outward)
//   OPP_SIDE_LEAD_IN   — seconds BEFORE hero arrives that the opposite side starts (increase = earlier)
//   OPP_SIDE_STAGGER   — ripple delay between each opposite-side card (from old hero outward)
//   LONG_JUMP_THRESHOLD — jump distance (cards) above which animation slows down
//   LONG_JUMP_SLOW      — duration multiplier applied when jump exceeds threshold (e.g. 1.5 = 50% slower)
const SAME_SIDE_STAGGER   = 0.080;
const OPP_SIDE_LEAD_IN    = 0.300;
const OPP_SIDE_STAGGER    = 0.080;
const LONG_JUMP_THRESHOLD = 2;
const LONG_JUMP_SLOW      = 1.25;

// Card hover:
//   HERO_HOVER_SCALE     — scale multiplier when hovering the hero card
//   NON_HERO_HOVER_SCALE — scale multiplier for satellite cards on hover
//   HOVER_GLOW_MULT      — multiplies glow radius and opacity when hovering the hero
const HERO_HOVER_SCALE     = 1.025;
const NON_HERO_HOVER_SCALE = 1.03;
const HOVER_GLOW_MULT      = 1.25;

// Click effects:
//   CLICK_SCALE_DOWN      — how far the hero card squishes on click (e.g. 0.94 = 6% smaller)
//   CLICK_DOWN_DURATION   — seconds for the squish phase
//   CLICK_DOWN_EASE       — easing for the squish phase (any GSAP ease string)
const CLICK_SCALE_DOWN    = 0.98;
const CLICK_DOWN_DURATION = 0.20;
const CLICK_DOWN_EASE     = 'power2.out';

// Touch navigation:
//   SWIPE_THRESHOLD — minimum horizontal travel (px) to register a swipe
const SWIPE_THRESHOLD = 50;

// Read glow base values from CSS tokens so hover calculations stay in sync with style.css
const _root      = getComputedStyle(document.documentElement);
const GLOW_RGB   = _root.getPropertyValue('--glow-rgb').trim();
const GLOW_ALPHA = parseFloat(_root.getPropertyValue('--glow-alpha'));
const GLOW_SIZE  = parseFloat(_root.getPropertyValue('--glow-size'));


// ─── State ────────────────────────────────────────────────────────────────────

const cards = gsap.utils.toArray('.card');
const N     = cards.length;

const INITIAL_INDEX = 2;  // which card starts as hero (0 = first, clamped to available cards)
let activeIndex = Math.min(INITIAL_INDEX, N - 1);

// Each proxy is the single source of truth for one card's animation state.
// GSAP tweens these objects; applyState() maps them to CSS transforms each frame.
//   pos            arc position (0 = hero, ±1 = adjacent…)
//   yOffset        idle float offset, px
//   riseOffset     hero entry lift, px
//   shakeRotation  inactivity wiggle, degrees
//   scaleMult      departure pulse multiplier
//   hoverScale     hover scale multiplier (1 = normal; HERO/NON_HERO_HOVER_SCALE when active)
//   cardIdx        immutable index used to anchor hero z-index immediately
const proxies = cards.map((_, i) => ({
  pos: i - activeIndex, yOffset: 0, riseOffset: 0,
  shakeRotation: 0, scaleMult: 1, hoverScale: 1, cardIdx: i,
}));

let idleTween      = null;
let idleTimeout    = null;
let idleCardIdx    = -1;
let shakeTl        = null;
let inactivityTimer = null;
let shakeDeadline   = 0;
let currentDurations = { d1: 0.175, d2: 0.200, d3: 0.250, mult: 1 };
let hoverTl = null;
const heroHoverProxy = { scale: 1, glow: 1 };
let heroEffectsEnabled    = true;
let nonHeroEffectsEnabled = true;


// ─── Geometry ─────────────────────────────────────────────────────────────────

// cx tracks viewport centre when ELLIPSE_CX is null.
// cy is derived so the hero (cy − ry) sits at HERO_Y_VH × viewport height.
function getEllipse() {
  return {
    cx: ELLIPSE_CX ?? window.innerWidth / 2,
    cy: window.innerHeight * HERO_Y_VH + ELLIPSE_RY,
    rx: ELLIPSE_RX,
    ry: ELLIPSE_RY,
  };
}

// Scales #carousel-stage from the hero's screen position so the hero stays
// anchored. Width-based scale from SCALE_BREAKPOINTS is capped by height when
// viewport is shorter than MIN_VIEWPORT_HEIGHT.
function applyCarouselScale() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const bp = SCALE_BREAKPOINTS.find(b => w >= b.minWidth) ?? SCALE_BREAKPOINTS.at(-1);
  const scale = (bp.scale / 100) * (h < MIN_VIEWPORT_HEIGHT ? h / MIN_VIEWPORT_HEIGHT : 1);
  const stage = document.getElementById('carousel-stage');
  stage.style.transformOrigin = `${ELLIPSE_CX ?? w / 2}px ${h * HERO_Y_VH}px`;
  stage.style.transform = `scale(${scale})`;
}


// ─── applyState ───────────────────────────────────────────────────────────────
// Converts a proxy's state into CSS transforms. Always call this — never set
// card transforms directly. Rotation follows the ellipse tangent so cards
// appear to lie on the arc. Hero z-index is pinned at 1000 the instant
// activeIndex changes, not when the card physically arrives.

function applyState(card, proxy) {
  const { cx, cy, rx, ry } = getEllipse();
  const abs   = Math.abs(proxy.pos);
  const angle = TOP_ANGLE + proxy.pos * SPREAD;

  const x = cx + rx * Math.cos(angle);
  const y = cy + ry * Math.sin(angle) + proxy.yOffset + proxy.riseOffset;
  const rotation = Math.atan2(ry * Math.cos(angle), -rx * Math.sin(angle)) * 180 / Math.PI
                 + proxy.shakeRotation;

  const posScale = abs < SCALE_ZONE
    ? BASE_SCALE + (HERO_SCALE - BASE_SCALE) * (1 - abs / SCALE_ZONE)
    : BASE_SCALE;

  gsap.set(card, {
    x, y, rotation,
    scale:   posScale * proxy.scaleMult * proxy.hoverScale,
    opacity: 1,
    zIndex:  proxy.cardIdx === activeIndex ? 1000 : Math.round(900 - abs * 150),
  });
}


// ─── Idle float ───────────────────────────────────────────────────────────────
// Two-stage tween: ease in to first peak (avoids a jolt), then infinite yoyo.
// stopIdle() snaps yOffset back to 0 before any shuffle begins.

function stopIdle() {
  clearTimeout(idleTimeout); idleTimeout = null;
  idleTween?.kill(); idleTween = null;
  if (idleCardIdx >= 0) {
    proxies[idleCardIdx].yOffset = 0;
    applyState(cards[idleCardIdx], proxies[idleCardIdx]);
    idleCardIdx = -1;
  }
}

function startIdle(idx) {
  idleCardIdx = idx;
  const proxy = proxies[idx];
  const upd   = () => applyState(cards[idx], proxy);
  idleTween = gsap.to(proxy, {
    yOffset: 8, duration: 0.5, ease: 'KIDLE', onUpdate: upd,
    onComplete: () => {
      idleTween = gsap.to(proxy, { yOffset: 0, duration: 0.5, ease: 'KIDLE', yoyo: true, repeat: -1, onUpdate: upd });
    },
  });
}


// ─── Inactivity shake ─────────────────────────────────────────────────────────
// After 6s idle, plays one wiggle then resets via onComplete → resetInactivity.

function stopShake() {
  shakeTl?.kill(); shakeTl = null;
  proxies[activeIndex].shakeRotation = 0;
  applyState(cards[activeIndex], proxies[activeIndex]);
}

function startShake(idx) {
  const proxy = proxies[idx];
  const upd   = () => applyState(cards[idx], proxy);
  shakeTl = gsap.timeline({ onComplete: resetInactivity });
  shakeTl.to(proxy, { shakeRotation:  2, duration: 0.083, ease: 'KSHAKE_IN',  onUpdate: upd });
  for (let i = 0; i < 4; i++) {
    shakeTl.to(proxy, { shakeRotation: -2, duration: 0.083, ease: 'none', onUpdate: upd });
    shakeTl.to(proxy, { shakeRotation:  2, duration: 0.083, ease: 'none', onUpdate: upd });
  }
  shakeTl.to(proxy, { shakeRotation: 0, duration: 0.083, ease: 'KSHAKE_OUT', onUpdate: upd });
}

function resetInactivity() {
  clearTimeout(inactivityTimer);
  stopShake();
  shakeDeadline = Date.now() + 6000;
  inactivityTimer = setTimeout(() => startShake(activeIndex), 6000);
}


// ─── Hero hover ───────────────────────────────────────────────────────────────

function applyHeroHover() {
  const idx   = activeIndex;
  const proxy = proxies[idx];
  const img   = cards[idx]?.querySelector('img');
  if (!proxy || !img) return;
  proxy.hoverScale = heroHoverProxy.scale;
  applyState(cards[idx], proxy);
  const alpha = GLOW_ALPHA * heroHoverProxy.glow;
  const size  = GLOW_SIZE  * heroHoverProxy.glow;
  img.style.filter = `blur(0px) brightness(1) drop-shadow(0 0 ${size}px rgba(${GLOW_RGB}, ${alpha}))`;
}

function startHeroHover() {
  const img = cards[activeIndex]?.querySelector('img');
  if (!img) return;
  img.style.transition = 'none';
  hoverTl?.kill();
  hoverTl = gsap.to(heroHoverProxy, {
    scale: HERO_HOVER_SCALE, glow: HOVER_GLOW_MULT,
    duration: 0.20, ease: 'power2.out',
    onUpdate: applyHeroHover,
  });
}

function endHeroHover() {
  hoverTl?.kill();
  hoverTl = gsap.to(heroHoverProxy, {
    scale: 1, glow: 1,
    duration: 0.2, ease: 'power2.out',
    onUpdate: applyHeroHover,
    onComplete: () => {
      const img = cards[activeIndex]?.querySelector('img');
      if (img) { img.style.filter = ''; img.style.transition = ''; }
      proxies[activeIndex].hoverScale = 1;
      applyState(cards[activeIndex], proxies[activeIndex]);
    },
  });
}

function resetHeroHover() {
  hoverTl?.kill();
  hoverTl = null;
  heroHoverProxy.scale = 1;
  heroHoverProxy.glow  = 1;
  const img = cards[activeIndex]?.querySelector('img');
  if (img) { img.style.filter = ''; img.style.transition = ''; }
  proxies.forEach(p => { p.hoverScale = 1; });
}


// ─── Click effect ─────────────────────────────────────────────────────────────

function triggerClickEffect(i) {
  const proxy = proxies[i];
  const upd   = () => applyState(cards[i], proxy);
  gsap.killTweensOf(proxy, 'scaleMult');
  gsap.timeline()
    .to(proxy, { scaleMult: CLICK_SCALE_DOWN, duration: CLICK_DOWN_DURATION, ease: CLICK_DOWN_EASE, onUpdate: upd })
    .to(proxy, { scaleMult: 1.00,             duration: 0.45, ease: 'back.out(2.5)', onUpdate: upd });
}


// ─── selectCard ───────────────────────────────────────────────────────────────
// Promotes a card to hero. In order:
//   1. Departing hero: scale pulse (0.93× → 1×) and riseOffset drops to 0.
//   2. .hero class transfers immediately so CSS blur/glow transitions start now.
//   3. New hero rises -12px on a spring after 250ms (arrives as card settles).
//   4. All cards do the 3-phase AE shuffle. Stagger ripples from the clicked card
//      and shrinks proportionally for larger jumps to keep the timing tight.

function selectCard(clickedI) {
  if (clickedI === activeIndex) return;
  resetHeroHover();
  stopShake();
  stopIdle();
  proxies.forEach(p => { gsap.killTweensOf(p); p.scaleMult = 1; p.hoverScale = 1; });

  const prevIdx   = activeIndex;
  const prevProxy = proxies[prevIdx];
  const updPrev   = () => applyState(cards[prevIdx], prevProxy);

  gsap.timeline()
    .to(prevProxy, { scaleMult: 0.93, duration: 0.283, ease: 'KSCALE', onUpdate: updPrev })
    .to(prevProxy, { scaleMult: 1.0,  duration: 0.283, ease: 'KSCALE', onUpdate: updPrev });
  prevProxy.yOffset = 0;
  gsap.to(prevProxy, { riseOffset: 0, duration: 0.300, ease: 'power2.in', onUpdate: updPrev });

  cards[activeIndex].classList.remove('hero');
  activeIndex = clickedI;
  cards[clickedI].classList.add('hero');

  const hp = proxies[clickedI];
  gsap.to(hp, { riseOffset: -12, duration: 0.350, ease: 'back.out(2)', delay: 0.250,
                onUpdate: () => applyState(cards[clickedI], hp) });

  // Slow down all phase durations for large jumps.
  const jump         = Math.abs(clickedI - prevIdx);
  const durationMult = jump > LONG_JUMP_THRESHOLD ? LONG_JUMP_SLOW : 1;
  const d1 = 0.175 * durationMult;
  const d2 = 0.200 * durationMult;
  const d3 = 0.250 * durationMult;
  const heroArrivalTime = d1 + d2;  // end of K01+K02 — when selected card reaches hero position
  currentDurations = { d1, d2, d3, mult: durationMult };

  // Two-phase wave: same-side cards ripple outward from the selected pack immediately;
  // opposite-side cards start just before the hero lands.
  cards.forEach((card, i) => {
    const proxy     = proxies[i];
    const targetPos = i - activeIndex;
    const fromPos   = proxy.pos;
    const p1 = fromPos + (targetPos - fromPos) * P1_BLEND;
    const p2 = fromPos + (targetPos - fromPos) * P2_BLEND;
    const upd = () => applyState(card, proxy);

    let delay;
    if (i === clickedI) {
      delay = 0;
    } else if (Math.sign(i - prevIdx) === Math.sign(clickedI - prevIdx)) {
      // Same side as the selected pack — ripple outward from selected pack
      delay = Math.abs(i - clickedI) * SAME_SIDE_STAGGER;
    } else {
      // Old hero or opposite side — start just before hero lands, ripple from old hero outward
      delay = heroArrivalTime - OPP_SIDE_LEAD_IN + Math.abs(i - prevIdx) * OPP_SIDE_STAGGER;
    }

    gsap.timeline({ delay })
      .to(proxy, { pos: p1, duration: d1, ease: 'K01', onUpdate: upd })
      .to(proxy, { pos: p2, duration: d2, ease: 'K02', onUpdate: upd })
      .to(proxy, { pos: targetPos, duration: d3, ease: 'K03', onUpdate: upd,
          onComplete: i === clickedI ? () => { idleTimeout = setTimeout(() => startIdle(clickedI), 300); } : undefined });
  });
}


// ─── Event listeners ──────────────────────────────────────────────────────────

cards.forEach((card, i) => {
  card.addEventListener('click', () => {
    const name = card.querySelector('img')?.alt ?? `Card ${i}`;
    if (i === activeIndex) {
      console.log(`[Carousel] Hero clicked: ${name}`);
      if (heroEffectsEnabled) triggerClickEffect(i);
    } else {
      console.log(`[Carousel] Card clicked: ${name}`);
      resetInactivity();
      selectCard(i);
    }
  });
  card.addEventListener('mouseenter', () => {
    if (i === activeIndex) {
      if (heroEffectsEnabled) startHeroHover();
    } else if (nonHeroEffectsEnabled) {
      const proxy = proxies[i];
      gsap.killTweensOf(proxy, 'hoverScale');
      gsap.to(proxy, { hoverScale: NON_HERO_HOVER_SCALE, duration: 0.20, ease: 'power2.out',
        onUpdate: () => applyState(card, proxy) });
    }
  });
  card.addEventListener('mouseleave', () => {
    if (i === activeIndex) { if (heroEffectsEnabled) endHeroHover(); return; }
    if (!nonHeroEffectsEnabled) return;
    const proxy = proxies[i];
    gsap.killTweensOf(proxy, 'hoverScale');
    gsap.to(proxy, { hoverScale: 1, duration: 0.20, ease: 'power2.out',
      onUpdate: () => applyState(card, proxy) });
  });
});

document.getElementById('hero-effects-toggle').addEventListener('change', e => {
  heroEffectsEnabled = e.target.checked;
  if (!heroEffectsEnabled) resetHeroHover();
});

document.getElementById('non-hero-effects-toggle').addEventListener('change', e => {
  nonHeroEffectsEnabled = e.target.checked;
  if (!nonHeroEffectsEnabled) {
    cards.forEach((card, i) => {
      if (i === activeIndex) return;
      const proxy = proxies[i];
      gsap.killTweensOf(proxy, 'hoverScale');
      gsap.to(proxy, { hoverScale: 1, duration: 0.20, ease: 'power2.out',
        onUpdate: () => applyState(card, proxy) });
    });
  }
});

window.addEventListener('resize', () => {
  applyCarouselScale();
  cards.forEach((card, i) => applyState(card, proxies[i]));
});

let keyUnlockAt = 0;
window.addEventListener('keydown', e => {
  resetInactivity();
  if (Date.now() < keyUnlockAt) return;
  if (e.key === 'ArrowLeft'  && activeIndex > 0)     { keyUnlockAt = Date.now() + 450; selectCard(activeIndex - 1); }
  if (e.key === 'ArrowRight' && activeIndex < N - 1) { keyUnlockAt = Date.now() + 450; selectCard(activeIndex + 1); }
});

let swipeStartX = 0;
let swipeStartY = 0;
window.addEventListener('touchstart', e => {
  swipeStartX = e.changedTouches[0].clientX;
  swipeStartY = e.changedTouches[0].clientY;
}, { passive: true });
window.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - swipeStartX;
  const dy = e.changedTouches[0].clientY - swipeStartY;
  if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dy) > Math.abs(dx)) return;
  resetInactivity();
  if (Date.now() < keyUnlockAt) return;
  if (dx < 0 && activeIndex < N - 1) { keyUnlockAt = Date.now() + 450; selectCard(activeIndex + 1); }
  if (dx > 0 && activeIndex > 0)     { keyUnlockAt = Date.now() + 450; selectCard(activeIndex - 1); }
}, { passive: true });


// ─── Startup ──────────────────────────────────────────────────────────────────

// xPercent/yPercent -50 centres each card on its GSAP x/y position (the arc point).
gsap.set(cards, { xPercent: -50, yPercent: -50 });
cards.forEach((card, i) => applyState(card, proxies[i]));
cards[activeIndex].classList.add('hero');

const initProxy = proxies[activeIndex];
gsap.to(initProxy, {
  riseOffset: -12, duration: 0.250, ease: 'back.out(2)', delay: 0.3,
  onUpdate: () => applyState(cards[activeIndex], initProxy),
});

applyCarouselScale();
idleTimeout = setTimeout(() => startIdle(activeIndex), 100);
resetInactivity();
