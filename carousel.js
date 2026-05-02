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
  { minWidth: 1440, scale: 150 },
  { minWidth: 1024, scale: 120 },
  { minWidth:  768, scale: 150 },
  { minWidth:    0, scale: 150 },
];

const MIN_VIEWPORT_HEIGHT = 600;  // px


// ─── Animation constants ──────────────────────────────────────────────────────

const TOP_ANGLE  = -Math.PI / 2;  // hero at ellipse apex
const HERO_SCALE = 1.25;  // card scale at pos = 0
const BASE_SCALE = 1.00;  // card scale far from centre
const SCALE_ZONE = 1.5;   // arc distance from centre where scale ramp begins


// ─── State ────────────────────────────────────────────────────────────────────

const cards = gsap.utils.toArray('.card');
const N     = cards.length;

let activeIndex = Math.floor(N / 2);  // start with the middle card as hero

// Each proxy is the single source of truth for one card's animation state.
// GSAP tweens these objects; applyState() maps them to CSS transforms each frame.
//   pos            arc position (0 = hero, ±1 = adjacent…)
//   yOffset        idle float offset, px
//   riseOffset     hero entry lift, px
//   shakeRotation  inactivity wiggle, degrees
//   scaleMult      departure pulse multiplier
//   cardIdx        immutable index used to anchor hero z-index immediately
const proxies = cards.map((_, i) => ({
  pos: i - activeIndex, yOffset: 0, riseOffset: 0,
  shakeRotation: 0, scaleMult: 1, cardIdx: i,
}));

let idleTween      = null;
let idleTimeout    = null;
let idleCardIdx    = -1;
let shakeTl        = null;
let inactivityTimer = null;


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
    scale:   posScale * proxy.scaleMult,
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
  inactivityTimer = setTimeout(() => startShake(activeIndex), 6000);
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
  stopShake();
  stopIdle();
  proxies.forEach(p => { gsap.killTweensOf(p); p.scaleMult = 1; });

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

  const staggerStep = 0.090 / Math.max(1, Math.abs(clickedI - prevIdx));

  cards.forEach((card, i) => {
    const proxy     = proxies[i];
    const targetPos = i - activeIndex;
    const fromPos   = proxy.pos;
    const p1 = fromPos + (targetPos - fromPos) * P1_BLEND;
    const p2 = fromPos + (targetPos - fromPos) * P2_BLEND;
    const upd = () => applyState(card, proxy);

    gsap.timeline({ delay: Math.abs(i - clickedI) * staggerStep })
      .to(proxy, { pos: p1, duration: 0.175, ease: 'K01', onUpdate: upd })
      .to(proxy, { pos: p2, duration: 0.200, ease: 'K02', onUpdate: upd })
      .to(proxy, { pos: targetPos, duration: 0.250, ease: 'K03', onUpdate: upd,
          onComplete: i === clickedI ? () => { idleTimeout = setTimeout(() => startIdle(clickedI), 300); } : undefined });
  });
}


// ─── Event listeners ──────────────────────────────────────────────────────────

cards.forEach((card, i) => card.addEventListener('click', () => { resetInactivity(); selectCard(i); }));

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
