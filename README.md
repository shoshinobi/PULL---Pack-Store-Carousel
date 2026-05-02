# Pack Store Carousel

An interactive card carousel built with vanilla JavaScript and GSAP. Cards are arranged on an elliptical arc with one card elevated as the "hero" at the apex. Clicking any card promotes it to hero with a directional, physics-inspired shuffle animation.

---

## Features

### Elliptical Arc Layout
Cards sit on an invisible ellipse. The hero occupies the apex (top centre), and all other cards fan out to either side, following the curve of the arc. Each card rotates to follow the ellipse tangent, so they appear to physically lie on the path. The arc is computed from live viewport dimensions, so it reflows correctly on resize.

### Hero Card
The active card is larger, sharp, fully bright, and has an edge glow that traces the shape of the pack image (using CSS `drop-shadow` on the PNG alpha). A soft radial gradient blooms behind it. All of these effects transition in with a slight delay so the card has time to physically settle before the visuals fire.

When a card first becomes hero it rises upward with a spring ease, giving it a sense of weight landing into place.

### Directional Shuffle
When a new card is selected, the animation plays in two waves based on which side the selected card is on:

1. **Same-side wave** — the selected card moves to the hero position immediately. Cards on the same side of the old hero ripple outward from the selected card with a stagger delay, continuing their offset even after the selected card has landed.
2. **Opposite-side wave** — cards on the other side of the old hero hold still until just before the selected card arrives, then begin their own ripple outward from the old hero position.

Each card's shuffle plays through three phases derived from an After Effects motion spec: an anticipation dip (K01), an accelerating drive through the target (K02), and a damped settle (K03).

### Long-Jump Slowdown
Jumping more than a set number of cards slows the shuffle phases by a configurable multiplier, giving bigger moves a more deliberate, weighty feel.

### Idle Float
After the carousel settles, the hero card gently bobs up and down on a looping ease. The first cycle eases in gradually to avoid a jolt on entry.

### Inactivity Shake
After 6 seconds without interaction, the hero card wiggles left and right to prompt the user. It plays once and then resets the inactivity timer.

### Keyboard Navigation
Left and right arrow keys step through cards one at a time. A 450ms debounce prevents accidental rapid-fire navigation.

### Responsive Scaling
The entire carousel stage is scaled as a single unit from the hero's screen position using a breakpoint table. This means every card, glow, and blur scales together without any layout reflow. A minimum viewport height cap prevents the hero card from clipping the top of the screen on short displays.

---

## Key Variables

All tuning values live at the top of `carousel.js`. Nothing else needs to be touched for visual changes.

### Layout

| Variable | Default | What it does |
|---|---|---|
| `INITIAL_INDEX` | `2` | Which card starts as hero. `0` = first card. Automatically clamped if the index doesn't exist. |
| `SPREAD` | `0.21` | Radians between adjacent arc positions. Increase to spread cards further apart. Keep above ~0.20 to avoid overlap. |
| `ELLIPSE_RX` | `980` | Horizontal radius of the arc in px — controls how wide the fan is. |
| `ELLIPSE_RY` | `1080` | Vertical radius of the arc in px — controls front-to-back perspective depth. |
| `ELLIPSE_CX` | `null` | Centre X of the ellipse. `null` = always tracks viewport centre. Set to a fixed px value to pin it. |
| `HERO_Y_VH` | `0.40` | Hero card vertical position as a fraction of viewport height. `0.40` = 40% from the top. |

### Scale & Glow

| Variable | Default | What it does |
|---|---|---|
| `HERO_SCALE` | `1.25` | Scale multiplier of the hero card relative to satellite cards. |
| `BASE_SCALE` | `1.00` | Scale of cards far from the centre. |
| `SCALE_ZONE` | `1.5` | Arc distance from the hero at which the scale ramp begins. |
| `SCALE_BREAKPOINTS` | — | Table of `{ minWidth, scale }` entries. The first row whose `minWidth` the viewport meets sets the zoom percentage. `150` = 1.5× the base design size. |
| `MIN_VIEWPORT_HEIGHT` | `600` | Below this height in px, the carousel shrinks proportionally so the hero doesn't clip the top. |

CSS tokens in `style.css` control the visual appearance of the glow:

| Token | Default | What it does |
|---|---|---|
| `--glow-rgb` | `200, 200, 255` | Colour of the edge glow on the hero card (R, G, B). |
| `--glow-alpha` | `0.20` | Opacity of the edge glow. `0` = off, `1` = full. |
| `--glow-size` | `8px` | Spread radius of the edge glow. |
| `--card-blur` | `1.0px` | Blur applied to non-hero cards. |
| `--card-dim` | `0.7` | Brightness of non-hero cards. `1` = full brightness. |

### Shuffle Timing

| Variable | Default | What it does |
|---|---|---|
| `SAME_SIDE_STAGGER` | `0.080` | Seconds of delay added per card in the same-side ripple, measured outward from the selected card. |
| `OPP_SIDE_LEAD_IN` | `0.300` | How many seconds *before* the hero arrives that the opposite-side wave starts. Increase to fire it earlier. |
| `OPP_SIDE_STAGGER` | `0.080` | Seconds of delay added per card in the opposite-side ripple, measured outward from the old hero. |
| `LONG_JUMP_THRESHOLD` | `2` | Jump distance in cards above which the slowdown multiplier applies. |
| `LONG_JUMP_SLOW` | `1.25` | Duration multiplier for long jumps. `1.5` = 50% slower phases. `1` = no change. |

---

## How GSAP Is Used

GSAP is used here purely as an animation engine — it has no knowledge of the DOM layout. Every card's visual state lives in a plain JavaScript object called a **proxy**:

```js
{ pos, yOffset, riseOffset, shakeRotation, scaleMult, cardIdx }
```

GSAP tweens the numbers inside these proxy objects. On every frame, an `onUpdate` callback passes the proxy into `applyState()`, which recomputes the card's position on the ellipse and calls `gsap.set()` to apply the result as CSS transforms. This separation means the geometry only lives in one place — no animation code ever writes a pixel value directly.

The key GSAP features in use are:

- **`gsap.to()`** — tweens an object's properties from their current value to a target over time.
- **`gsap.set()`** — applies values instantly with no duration, used inside `applyState()` every frame.
- **`gsap.timeline()`** — chains multiple tweens in sequence. Used for the three-phase shuffle (K01 → K02 → K03) and the departing hero's scale pulse.
- **`delay`** on timelines — staggers when each card's shuffle begins, creating the ripple wave.
- **`CustomEase`** — lets you define a bezier easing curve by its SVG path string, the same format After Effects exports. This is how the motion spec eases are preserved exactly.
- **`gsap.killTweensOf()`** — cancels any in-progress tween on a proxy so that a rapid second click doesn't stack animations.

### Translating to Other Frameworks or No Framework

The proxy pattern is what makes this portable. GSAP is responsible for two things: interpolating numbers over time, and scheduling when to do so. Both can be replaced.

**Using a different animation library (Anime.js, Motion One, Framer Motion, etc.)**

The proxy objects and `applyState()` stay exactly the same. The only thing that changes is the syntax for running a tween. For example, the three-phase shuffle:

```js
// GSAP
gsap.timeline({ delay })
  .to(proxy, { pos: p1, duration: d1, ease: 'K01', onUpdate: upd })
  .to(proxy, { pos: p2, duration: d2, ease: 'K02', onUpdate: upd })
  .to(proxy, { pos: targetPos, duration: d3, ease: 'K03', onUpdate: upd });

// Anime.js equivalent (simplified)
anime({ targets: proxy, pos: p1, duration: d1 * 1000, easing: 'cubicBezier(...)', update: upd,
  complete: () => anime({ targets: proxy, pos: p2, ... }) });
```

The easing curves (K01, K02, K03) are defined as SVG cubic bezier strings. Any library that accepts cubic bezier parameters can use the same control points.

**Without any animation library**

The core of the system is just changing numbers over time. You can replicate this with `requestAnimationFrame` and a simple lerp or a manually stepped bezier:

```js
function animateValue(obj, key, target, duration, easeFn, onUpdate) {
  const start = obj[key];
  const startTime = performance.now();
  function tick(now) {
    const t = Math.min((now - startTime) / (duration * 1000), 1);
    obj[key] = start + (target - start) * easeFn(t);
    onUpdate();
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
```

You would then define `easeFn` as a function that evaluates a cubic bezier at a given `t` (several small open-source implementations exist for this). Chaining phases becomes a matter of calling the next `animateValue` inside the `onComplete` — exactly what GSAP's timeline does internally.

The stagger delays become `setTimeout(() => animateValue(...), delay * 1000)`.

The `gsap.killTweensOf()` call — which cancels in-progress animations on rapid interaction — would need a cancellation flag or an `AbortController`-style token passed to each `requestAnimationFrame` loop.

In short: GSAP is a well-optimised convenience layer. The underlying model — proxy state, per-frame geometry computation, cubic bezier easing — is entirely framework-agnostic and can be carried into any environment, including React (storing proxies in refs), Canvas, WebGL, or native mobile via equivalent tween libraries.
